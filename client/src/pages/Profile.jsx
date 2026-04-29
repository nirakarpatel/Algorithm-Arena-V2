import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK, mockProfileStats } from '../lib/mockData';
import { useAuth } from '../context/useAuth';

const activityFilters = ['All', 'Accepted', 'Rejected', 'Pending'];

const Profile = () => {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState('All');
  const [activityQuery, setActivityQuery] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      if (USE_MOCK) return mockProfileStats;
      const res = await api.get('/api/profile/stats');
      return res.data.data;
    },
  });

  const stats = profileQuery.data || {};
  const submissions = useMemo(() => stats.recentSubmissions || [], [stats.recentSubmissions]);
  const total = stats.totalSubmissions || 0;
  const acceptedPct = total ? Math.round(((stats.acceptedCount || 0) / total) * 100) : 0;

  const acceptedInLastWeek = useMemo(() => {
    const NOW_MS = Date.now();
    const sevenDaysAgo = NOW_MS - 7 * 24 * 60 * 60 * 1000;
    return submissions.filter((sub) => sub.status === 'Accepted' && new Date(sub.submittedAt).getTime() >= sevenDaysAgo).length;
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesStatus = activityFilter === 'All' || sub.status === activityFilter;
      const query = activityQuery.trim().toLowerCase();
      const title = (sub.challengeId?.title || '').toLowerCase();
      return matchesStatus && (!query || title.includes(query));
    });
  }, [submissions, activityFilter, activityQuery]);

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (profileQuery.isError) {
    return <Card className="text-red-400">{profileQuery.error?.userMessage || 'Failed to load profile.'}</Card>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={user?.username || 'Profile'}
        subtitle={`Role: ${user?.role || 'user'}   |   Accepted this week: ${acceptedInLastWeek}`}
        actions={
          <div className="chip-group">
            {activityFilters.map((filter) => (
              <button key={filter} className={`chip-btn ${activityFilter === filter ? 'active' : ''}`} onClick={() => setActivityFilter(filter)}>
                {filter}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-blue-400 flex items-center justify-center text-2xl text-white font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-section-title font-bold">{user?.username || 'User'}</h2>
              <p className="text-secondary text-sm">Keep shipping accepted solutions.</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-caption text-secondary">Total</p>
              <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
            </div>
            <div>
              <p className="text-caption text-secondary">Accepted</p>
              <p className="text-2xl font-bold text-green-400">{stats.acceptedCount}</p>
            </div>
            <div>
              <p className="text-caption text-secondary">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{stats.rejectedCount}</p>
            </div>
            <div>
              <p className="text-caption text-secondary">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingCount}</p>
            </div>
            <div>
              <p className="text-caption text-secondary">Points</p>
              <p className="text-2xl font-bold text-accent">{stats.totalPoints}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-secondary">Acceptance Rate</span>
              <span className="font-semibold">{acceptedPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-accent" style={{ width: `${acceptedPct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <h2 className="text-section-title font-bold">Recent Activity</h2>
          <input
            className="field-input md:max-w-sm"
            placeholder="Search by challenge title"
            value={activityQuery}
            onChange={(e) => setActivityQuery(e.target.value)}
          />
        </div>

        {filteredSubmissions.length ? (
          <div className="space-y-3">
            {filteredSubmissions.map((sub) => (
              <div key={sub._id} className="border border-glass-border rounded-xl p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{sub.challengeId?.title || 'Unknown Challenge'}</h3>
                  <p className="text-secondary text-sm">{new Date(sub.submittedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      sub.status === 'Accepted'
                        ? 'bg-green-500/20 text-green-400'
                        : sub.status === 'Rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {sub.status}
                  </span>
                  {sub.repositoryUrl && (
                    <a href={sub.repositoryUrl} target="_blank" rel="noreferrer" className="block mt-2 text-sm text-accent underline">
                      Open Repository
                    </a>
                  )}
                  <Link to={`/submission/${sub._id}`} className="block mt-2 text-sm text-accent underline">
                    View Submission
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No matching activity" description="Try a different filter or solve more challenges." />
        )}
      </Card>
    </div>
  );
};

export default Profile;
