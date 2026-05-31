import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiCode, FiEye, FiCpu, FiFilter, FiExternalLink } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { useAuth } from '../../context/useAuth';
import { api } from '../../lib/api';
import { canManageOwnClan, isClanArchived } from '../../lib/permissions';

const ChiefReviewTab = ({ clan }) => {
  const { user: currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState('Pending');

  const submissionsQuery = useQuery({
    queryKey: ['chief-submissions', clan?._id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (statusFilter !== 'All') {
        const apiStatus = statusFilter === 'Approved' ? 'Accepted' : statusFilter;
        params.set('status', apiStatus);
      }
      const res = await api.get(`/api/submissions?${params.toString()}`);
      const allSubs = res.data.data || [];
      // Filter to only show submissions from clan members
      return allSubs.filter(sub =>
        clan.members.some(m => {
          const memberId = typeof m === 'object' ? m._id : m;
          const subUserId = typeof sub.userId === 'object' ? sub.userId._id : sub.userId;
          return memberId?.toString() === subUserId?.toString();
        })
      );
    },
    enabled: !!clan
  });



  if (!clan) return null;

  if (isClanArchived(clan)) {
    return (
      <BaseCard className="p-6 border-amber-500/20 bg-amber-500/10 text-amber-200 text-sm font-bold flex items-center gap-2">
        <FiCode className="text-amber-300" /> This clan is archived. Submission review is disabled until an admin restores it.
      </BaseCard>
    );
  }

  if (!canManageOwnClan(currentUser, clan)) {
    return (
      <BaseCard className="p-6 border-red-500/20 bg-red-500/10 text-red-200 text-sm font-bold flex items-center gap-2">
        <FiCode className="text-red-300" /> Your chief role is not mapped to this clan, so submission review is unavailable.
      </BaseCard>
    );
  }

  const filteredSubs = submissionsQuery.data || [];
  const pendingCount = filteredSubs.filter(s => s.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2">
          <FiCode className="text-purple-400" /> Code Reviews
        </h2>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <FiFilter className="text-tertiary ml-2" />
          {['Pending', 'Approved', 'Rejected', 'All'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === filter ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
            >
              {filter} {filter === 'Pending' && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSubs.map((sub, i) => (
          <motion.div key={sub._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <BaseCard className="p-5 flex flex-col gap-4 group hover:border-purple-500/30 transition-colors h-full">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <Link 
                    to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                    className="font-bold text-primary truncate block hover:text-accent transition-colors"
                  >
                    {sub.challengeId?.title || 'Unknown Challenge'}
                  </Link>
                  <p className="text-xs text-secondary mt-1">By: {sub.userId?.username}</p>
                </div>
                {sub.status === 'Pending' && <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Needs Review</span>}
                {sub.status === 'Accepted' && <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Approved</span>}
                {sub.status === 'Rejected' && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Rejected</span>}
              </div>

              {/* Language & Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-tertiary mb-1 uppercase tracking-widest">
                    <span>{sub.language || 'javascript'}</span>
                    <span className="text-secondary">{sub.code ? `${sub.code.split('\n').length} lines` : 'Repo only'}</span>
                  </div>
                </div>
                <FiCode className="text-tertiary" />
              </div>

              <div className="flex justify-between items-center mt-auto pt-2">
                <span className="text-xs font-mono text-tertiary">{new Date(sub.submittedAt).toLocaleString()}</span>
                <Link 
                  to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                  className="px-4 py-2 rounded-lg bg-white/5 text-primary text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FiEye /> Review Code
                </Link>
              </div>

              {/* Feedback display for already reviewed */}
              {sub.feedback && (
                <div className="mt-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs text-secondary italic">
                  "{sub.feedback}"
                </div>
              )}
            </BaseCard>
          </motion.div>
        ))}
        {filteredSubs.length === 0 && (
          <div className="xl:col-span-3 p-10 text-center border-2 border-dashed border-white/10 rounded-2xl text-tertiary">
            <FiCheck size={48} className="mx-auto mb-4 text-green-400/50" />
            <p>No {statusFilter.toLowerCase()} submissions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChiefReviewTab;
