import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiActivity, FiAward, FiCalendar, FiLink, FiMapPin, FiSearch, FiUsers, FiZap } from 'react-icons/fi';
import { useSocket } from '../hooks/useSocket';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK, mockProfileStats } from '../lib/mockData';
import { useAuth } from '../context/useAuth';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MotionDiv = motion.div;

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop',
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [activityFilter, setActivityFilter] = useState('All');
  const [activityQuery, setActivityQuery] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useSocket('leaderboard_update', () => {
    queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
  });

  const profileQuery = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockProfileStats;
      }
      const res = await api.get('/api/profile/stats');
      return res.data.data;
    },
  });

  const stats = profileQuery.data || {};
  const submissions = useMemo(() => stats.recentSubmissions || [], [stats.recentSubmissions]);
  const total = stats.totalSubmissions || 0;
  const acceptedPct = total ? Math.round(((stats.acceptedCount || 0) / total) * 100) : 0;
  const profileSnapshotMs = profileQuery.dataUpdatedAt || 0;

  const acceptedInLastWeek = useMemo(() => {
    const sevenDaysAgo = profileSnapshotMs - WEEK_MS;
    return submissions.filter((sub) => sub.status === 'Accepted' && new Date(sub.submittedAt).getTime() >= sevenDaysAgo).length;
  }, [profileSnapshotMs, submissions]);

  const filteredSubmissions = useMemo(() => {
    const query = activityQuery.trim().toLowerCase();
    return submissions.filter((sub) => {
      const matchesStatus = activityFilter === 'All' || sub.status === activityFilter;
      const title = (sub.challengeId?.title || '').toLowerCase();
      return matchesStatus && (!query || title.includes(query));
    });
  }, [activityFilter, activityQuery, submissions]);

  const handleAvatarSelect = (url) => {
    updateUser({ profilePicture: url });
    setShowAvatarPicker(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateUser({ profilePicture: reader.result });
      setShowAvatarPicker(false);
    };
    reader.readAsDataURL(file);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return <Card className="text-red-400">{profileQuery.error?.userMessage || 'Failed to load profile.'}</Card>;
  }

  const statCards = [
    { label: 'Solved', value: stats.acceptedCount || 0, color: 'text-green-400', sub: 'Total missions', icon: FiZap },
    { label: 'Points', value: stats.totalPoints || 0, color: 'text-accent', sub: 'XP gained', icon: FiAward },
    { label: 'Accepted This Week', value: acceptedInLastWeek, color: 'text-yellow-400', sub: 'Recent momentum', icon: FiActivity },
    { label: 'Pending', value: stats.pendingCount || 0, color: 'text-purple-400', sub: 'Awaiting review', icon: FiSearch },
  ];

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={user?.username || 'Profile'}
        subtitle={`Role: ${user?.role || 'user'} | Acceptance Rate: ${acceptedPct}%`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowAvatarPicker(true)}>
              Change Avatar
            </button>
          </div>
        }
      />

      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <MotionDiv
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="macos-glass w-full max-w-md p-8"
          >
            <h3 className="mb-6 text-xl font-bold text-primary">Choose an Avatar</h3>

            <div
              className="group relative mb-8 cursor-pointer rounded-2xl border-2 border-dashed border-glass-border p-6 transition-colors hover:border-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <FiZap />
                </div>
                <p className="text-sm font-bold text-primary">Upload from device</p>
                <p className="text-[10px] text-tertiary">PNG or JPG up to 2MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="profileAvatarUpload"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>

            <div className="mb-8 grid grid-cols-3 gap-4">
              {PRESET_AVATARS.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  className="aspect-square overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-accent"
                  onClick={() => handleAvatarSelect(url)}
                >
                  <img src={url} alt={`Avatar ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowAvatarPicker(false)}>
                Cancel
              </button>
              <button className="btn-secondary flex-1 text-red-400" onClick={() => handleAvatarSelect(null)}>
                Clear
              </button>
            </div>
          </MotionDiv>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="flex flex-col gap-6 xl:col-span-1">
          <Card className="pt-8 text-center">
            <div className="group relative mb-4 inline-block cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-accent to-purple-500 p-1 transition-transform group-hover:scale-105">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-bg-app text-4xl font-black uppercase text-accent">
                    {user?.username?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-4 border-bg-app bg-green-500 shadow-lg" />
            </div>

            <h2 className="text-2xl font-black text-primary">{user?.username || 'User'}</h2>
            <p className="mb-6 mt-1 text-sm text-secondary">Expert Algorithmist</p>

            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiMapPin className="text-accent" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiCalendar className="text-accent" />
                <span>Joined April 2026</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiLink className="text-accent" />
                <span className="truncate text-accent">arena.dev/{user?.username}</span>
              </div>
            </div>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-transparent">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Current Rank</span>
              <FiAward className="text-accent" />
            </div>
            <p className="text-4xl font-black text-primary">{stats.rank ? `#${stats.rank}` : 'Unranked'}</p>
            <p className="mt-2 text-xs text-secondary">Top 5% of all developers</p>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Clan</span>
              <FiUsers className="text-purple-400" />
            </div>
            <p className="text-xl font-black text-primary">{user?.clanName || 'No Clan'}</p>
            <p className="mt-2 text-xs text-secondary">
              {user?.clanTag ? `[${user.clanTag}]` : 'Join a clan from the clans page'}
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const diffColor =
                card.color === 'text-green-400'
                  ? '34, 197, 94'
                  : card.color === 'text-accent'
                    ? undefined
                    : card.color === 'text-yellow-400'
                      ? '234, 179, 8'
                      : '168, 85, 247';
              return (
                <Card
                  key={card.label}
                  className="group relative overflow-hidden"
                  difficultyColor={diffColor}
                >
                  <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                    <Icon size={48} />
                  </div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-tighter text-secondary">{card.label}</p>
                  <p className={`text-2xl font-black md:text-3xl ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-[10px] text-tertiary">{card.sub}</p>
                </Card>
              );
            })}
          </div>

          <div
            className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white/60 dark:bg-white/[0.02] px-6 py-4"
          >
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-secondary">Acceptance Rate</span>
              <span className="font-semibold">{acceptedPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-green-400 to-accent" style={{ width: `${acceptedPct}%` }} />
            </div>
          </div>

          <Card className="flex-grow">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <FiZap className="text-yellow-400" />
                  Recent Submissions
                </h2>
                <p className="mt-1 text-xs text-secondary">Showing {filteredSubmissions.length} activities</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented">
                  {['All', 'Accepted', 'Rejected', 'Pending'].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`segmented-btn !text-[10px] ${activityFilter === filter ? 'active' : ''}`}
                      onClick={() => setActivityFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    name="profileActivitySearch"
                    className="field-input !py-1.5 pl-9 !text-xs"
                    placeholder="Filter by challenge..."
                    value={activityQuery}
                    onChange={(e) => setActivityQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredSubmissions.length ? (
              <div className="space-y-2">
                {filteredSubmissions.map((sub) => (
                  <MotionDiv
                    key={sub._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 transition-all hover:border-accent/30 hover:bg-white/70 dark:hover:bg-accent/5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${
                          sub.status === 'Accepted'
                            ? 'bg-green-500/10 text-green-400'
                            : sub.status === 'Rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {sub.challengeId?.title?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="font-bold text-primary transition-colors group-hover:text-accent">
                          {sub.challengeId?.title || 'Unknown Challenge'}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-tertiary">
                          <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span
                            className={
                              sub.status === 'Accepted'
                                ? 'text-green-500'
                                : sub.status === 'Rejected'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                            }
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/submission/${sub._id}`}
                      className="rounded-lg bg-glass-surface p-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <FiLink className="text-secondary" />
                    </Link>
                  </MotionDiv>
                ))}
              </div>
            ) : (
              <EmptyState title="No activities" description="Time to solve some missions!" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
