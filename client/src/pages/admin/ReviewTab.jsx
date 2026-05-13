import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiCheck, FiCode, FiEye, FiFilter, FiClock, FiMessageSquare } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import SkeletonCard from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';

const ReviewTab = () => {

  const [statusFilter, setStatusFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const limit = 15;

  const submissionsQuery = useQuery({
    queryKey: ['admin-submissions', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'All') {
        const apiStatus = statusFilter === 'Approved' ? 'Accepted' : statusFilter;
        params.set('status', apiStatus);
      }
      params.set('sortBy', 'submittedAt');
      params.set('sortDir', 'desc');
      const res = await api.get(`/api/submissions?${params.toString()}`);
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const submissions = submissionsQuery.data?.data || [];
  const meta = submissionsQuery.data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2">
          <FiCode className="text-accent" /> Review Submissions
        </h2>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <FiFilter className="text-tertiary ml-2" />
          {['Pending', 'Approved', 'Rejected', 'All'].map(filter => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === filter ? 'bg-accent/20 text-accent shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {submissionsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No submissions"
          description={`No ${statusFilter.toLowerCase()} submissions found.`}
          icon={FiCheck}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {submissions.map((sub, i) => (
              <motion.div key={sub._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <BaseCard className="p-5 flex flex-col gap-3 group hover:border-accent/30 transition-colors h-full">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                        className="font-bold text-primary truncate block hover:text-accent transition-colors"
                      >
                        {sub.challengeId?.title || 'Unknown Challenge'}
                      </Link>
                      <p className="text-xs text-secondary mt-1">
                        By: <span className="font-semibold text-primary">{sub.userId?.username || 'Unknown'}</span>
                      </p>
                    </div>
                    {sub.status === 'Pending' && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Pending</span>}
                    {sub.status === 'Accepted' && <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Approved</span>}
                    {sub.status === 'Rejected' && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Rejected</span>}
                  </div>

                  {/* Language pill */}
                  <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase font-bold tracking-widest">
                    <span className="px-2 py-0.5 rounded bg-white/5">{sub.language || 'javascript'}</span>
                    {sub.code && <span className="text-secondary">{sub.code.split('\n').length} lines</span>}
                  </div>

                  <div className="flex justify-between items-center mt-auto pt-2">
                    <span className="text-xs font-mono text-tertiary flex items-center gap-1">
                      <FiClock size={10} />
                      {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <Link
                      to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                      className="px-4 py-2 rounded-lg bg-white/5 text-primary text-xs font-bold hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-2"
                    >
                      <FiEye /> Review
                    </Link>
                  </div>

                  {/* Feedback indicator for already reviewed */}
                  {sub.feedback && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs text-secondary">
                      <FiMessageSquare size={12} className="shrink-0 mt-0.5 text-red-400" />
                      <span className="italic line-clamp-2">"{sub.feedback}"</span>
                    </div>
                  )}
                </BaseCard>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-tertiary">
                Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} total)
              </span>
              <div className="flex gap-2">
                <button
                  className="px-4 py-1.5 rounded-lg bg-white/5 text-secondary text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-30"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <button
                  className="px-4 py-1.5 rounded-lg bg-white/5 text-secondary text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-30"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= (meta.totalPages || 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewTab;
