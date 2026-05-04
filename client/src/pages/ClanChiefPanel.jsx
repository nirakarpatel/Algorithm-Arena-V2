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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FiClock className="text-yellow-500" />
                Pending Reviews
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                <select
                  className="field-select py-2 text-xs"
                  value={reviewFilters.status}
                  onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, status: e.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
                
                <select
                  className="field-select py-2 text-xs"
                  value={reviewFilters.challengeId}
                  onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, challengeId: e.target.value }))}
                >
                  <option value="">All Missions</option>
                  {(challengesQuery.data || []).map((ch) => (
                    <option key={ch._id} value={ch._id}>{ch.title}</option>
                  ))}
                </select>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                  <input
                    className="field-input pl-9 py-2 text-xs"
                    placeholder="Search User ID..."
                    value={reviewFilters.userId}
                    onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, userId: e.target.value.trim() }))}
                  />
                </div>
              </div>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState 
                title="All clear, Chief!" 
                description="No pending submissions to review right now." 
                icon={FiCheckCircle}
              />
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub._id} className="macos-glass p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-white/5 hover:border-accent/30 transition-all">
                    <div className="flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black">
                        {sub.userId?.username?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{sub.userId?.username || 'Unknown'}</h4>
                        <p className="text-xs text-secondary flex items-center gap-1">
                          <FiBookOpen size={12} /> {sub.challengeId?.title || 'Unknown Mission'}
                        </p>
                        <p className="text-[10px] text-tertiary mt-1 uppercase font-black tracking-widest">{sub.language}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => onGrade(sub._id, 'Accepted')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all border border-green-500/20"
                      >
                        <FiCheckCircle /> Accept
                      </button>
                      <button 
                        onClick={() => onGrade(sub._id, 'Rejected')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
                      >
                        <FiXCircle /> Reject
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-4 border-t border-glass-border">
                  <span className="text-xs text-secondary">
                    Page {reviewMeta.page || 1} of {reviewMeta.totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary py-1.5 text-xs"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={(reviewMeta.page || 1) <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-secondary py-1.5 text-xs"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={(reviewMeta.page || 1) >= (reviewMeta.totalPages || 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClanChiefPanel;
