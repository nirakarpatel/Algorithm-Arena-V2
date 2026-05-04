import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiSearch, FiClock, FiCheckCircle, FiXCircle, FiBookOpen } from 'react-icons/fi';
import Card from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK, filterSubmissions, mockChallenges } from '../lib/mockData';

const ClanChiefPanel = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('review');
  const [reviewFilters, setReviewFilters] = useState({
    page: 1,
    limit: 10,
    status: 'Pending',
    userId: '',
    challengeId: '',
    from: '',
    to: '',
  });

  const submissionsQuery = useQuery({
    queryKey: ['chief-submissions', reviewFilters],
    queryFn: async () => {
      if (USE_MOCK) return filterSubmissions(reviewFilters);
      
      const params = new URLSearchParams();
      params.set('page', String(reviewFilters.page));
      params.set('limit', String(reviewFilters.limit));
      if (reviewFilters.status) params.set('status', reviewFilters.status);
      if (reviewFilters.challengeId) params.set('challengeId', reviewFilters.challengeId);
      if (reviewFilters.userId.length === 24) params.set('userId', reviewFilters.userId);
      if (reviewFilters.from) params.set('from', reviewFilters.from);
      if (reviewFilters.to) params.set('to', reviewFilters.to);

      const res = await api.get(`/api/submissions?${params.toString()}`);
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const challengesQuery = useQuery({
    queryKey: ['chief-challenges'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/challenges?page=1&limit=100');
        return res.data.data || mockChallenges;
      } catch {
        return mockChallenges;
      }
    },
  });

  const onGrade = async (id, status) => {
    try {
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 500));
      } else {
        await api.put(`/api/submissions/${id}`, { status });
      }
      toast.success(`Submission marked ${status}`);
      queryClient.invalidateQueries({ queryKey: ['chief-submissions'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grade submission');
    }
  };

  const submissions = submissionsQuery.data?.data || [];
  const reviewMeta = submissionsQuery.data?.meta || {};

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Chief Command" 
        subtitle="Review your clan members' missions and maintain the highest standards of code."
      />

      <div className="macos-glass p-2 inline-flex gap-2">
        <button 
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'review' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`} 
          onClick={() => setActiveTab('review')}
        >
          Review Work
        </button>
      </div>

      {activeTab === 'review' && (
        <Card className="p-6">
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FiClock className="text-yellow-500" />
              Pending Reviews
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <select
                className="field-select"
                value={reviewFilters.status}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, status: e.target.value }))}
              >
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
              
              <select
                className="field-select"
                value={reviewFilters.challengeId}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, challengeId: e.target.value }))}
              >
                <option value="">All Challenges</option>
                {(challengesQuery.data || []).map((ch) => (
                  <option key={ch._id} value={ch._id}>{ch.title}</option>
                ))}
              </select>

              <input
                className="field-input"
                placeholder="User ID (24 chars)"
                value={reviewFilters.userId}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, userId: e.target.value.trim() }))}
              />

              <input
                className="field-input"
                type="date"
                value={reviewFilters.from}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, from: e.target.value }))}
                aria-label="From date"
              />

              <input
                className="field-input"
                type="date"
                value={reviewFilters.to}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, to: e.target.value }))}
                aria-label="To date"
              />

              <select
                className="field-select"
                value={reviewFilters.limit}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
              >
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
              </select>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState 
                title="No submissions" 
                description="No submissions match your filters." 
                icon={FiCheckCircle}
              />
            ) : (
              <>
                <div className="hidden md:block overflow-auto">
                  <table className="responsive-table w-full">
                    <thead>
                      <tr className="text-left border-b border-glass-border text-secondary text-sm">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Challenge</th>
                        <th className="py-3 px-4">Language</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub._id} className="border-b border-glass-border/60 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                {sub.userId?.username?.[0] || 'U'}
                              </div>
                              <span className="font-medium text-primary">{sub.userId?.username || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-secondary">{sub.challengeId?.title || 'Unknown'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded bg-glass-surface text-[10px] font-bold text-tertiary uppercase">
                              {sub.language}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">{sub.status}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => onGrade(sub._id, 'Accepted')}
                                className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => onGrade(sub._id, 'Rejected')}
                                className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {submissions.map((sub) => (
                    <div key={sub._id} className="macos-glass p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-primary">{sub.userId?.username || 'Unknown'}</p>
                          <p className="text-xs text-secondary">{sub.challengeId?.title || 'Unknown'}</p>
                        </div>
                        <span className="px-2 py-1 rounded bg-glass-surface text-[10px] font-bold text-tertiary">
                          {sub.language}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onGrade(sub._id, 'Accepted')}
                          className="flex-1 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/20"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => onGrade(sub._id, 'Rejected')}
                          className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-glass-border">
                  <span className="text-xs text-secondary">
                    Page {reviewMeta.page || 1} of {reviewMeta.totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary py-1.5 text-xs px-4"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={(reviewMeta.page || 1) <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-secondary py-1.5 text-xs px-4"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={(reviewMeta.page || 1) >= (reviewMeta.totalPages || 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClanChiefPanel;
