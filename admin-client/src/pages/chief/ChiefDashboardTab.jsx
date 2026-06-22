import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiCheck, FiX, FiAward, FiAlertTriangle, FiFileText, FiMessageSquare, FiShield, FiRefreshCw } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import {
  canApproveJoinRequests,
  canArchiveClan,
  canIssueWarning,
  canManageOwnClan,
  isClanArchived,
} from '../../lib/permissions';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <BaseCard className="p-5 flex items-center gap-4 group hover:border-white/20 transition-all">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">{title}</h3>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-black text-primary">{value}</span>
        {subtitle && <span className="text-[10px] text-tertiary mb-1.5 font-bold uppercase">{subtitle}</span>}
      </div>
    </div>
  </BaseCard>
);

const ChiefDashboardTab = ({ clan }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [warningModal, setWarningModal] = useState({ open: false, user: null, message: '' });
  const isArchived = isClanArchived(clan);
  const canManageClan = canManageOwnClan(user, clan);
  const canArchive = canArchiveClan(user, clan);
  const canModerateRequests = canApproveJoinRequests(user, clan);

  const approveMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.post(`/api/clans/${clan._id}/approve/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Join request approved');
      queryClient.invalidateQueries({ queryKey: ['chief-clan-info'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.post(`/api/clans/${clan._id}/reject/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Join request rejected');
      queryClient.invalidateQueries({ queryKey: ['chief-clan-info'] });
    }
  });

  const warnMutation = useMutation({
    mutationFn: async ({ userId, message }) => {
      const res = await api.post(`/api/users/${userId}/warn`, { message });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Warning sent and user flagged.');
      setWarningModal({ open: false, user: null, message: '' });
      queryClient.invalidateQueries({ queryKey: ['chief-clan-info'] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/api/clans/${clan._id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clan archived');
      queryClient.invalidateQueries({ queryKey: ['chief-clan-info'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to archive clan');
    }
  });

  if (!clan) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );

  const members = clan.members || [];
  const activeCount = members.filter(m => m.status !== 'Warned' && m.status !== 'Inactive').length;
  const warnedCount = members.filter(m => m.status === 'Warned').length;
  const pendingReviews = clan.pendingSubmissionsCount ?? 0;

  // Compute real completion rate: avg of (solvedProblems / target) across members
  const TARGET_PROBLEMS = 5;
  const totalSolved = members.reduce((sum, m) => sum + (m.solvedProblems || 0), 0);
  const totalPossible = members.length * TARGET_PROBLEMS;
  const completionRate = totalPossible > 0 ? Math.round((totalSolved / totalPossible) * 100) : 0;

  const circleRadius = 40;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (completionRate / 100) * circleCircumference;

  return (
    <div className="space-y-6">
      {isArchived && (
        <BaseCard className="p-4 border-amber-500/20 bg-amber-500/10 text-amber-200 text-sm font-bold flex items-center gap-2">
          <FiAlertTriangle /> This clan is archived. Chief actions are paused until an admin restores it.
        </BaseCard>
      )}
      {!canManageClan && !isArchived && (
        <BaseCard className="p-4 border-red-500/20 bg-red-500/10 text-red-200 text-sm font-bold flex items-center gap-2">
          <FiShield /> Your chief role is not mapped to this clan, so clan actions are unavailable.
        </BaseCard>
      )}
      
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Members" value={members.length} subtitle="Active Roster" icon={FiUsers} colorClass="bg-blue-500/20 text-blue-400" />
        <StatCard title="Active This Week" value={activeCount} subtitle="Logged in" icon={FiActivity} colorClass="bg-green-500/20 text-green-400" />
        <StatCard title="At Risk / Warned" value={warnedCount} subtitle="Needs attention" icon={FiAlertTriangle} colorClass="bg-red-500/20 text-red-400" />
        <StatCard title="Pending Reviews" value={pendingReviews} subtitle="Code submissions" icon={FiFileText} colorClass="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Col: Ring & Quick Actions */}
        <div className="space-y-6">
          <BaseCard className="p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors" />
            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest self-start mb-6 w-full">Clan Weekly Completion</h2>
            
            <div className="relative flex items-center justify-center w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96" cy="96" r={circleRadius}
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  cx="96" cy="96" r={circleRadius}
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={circleCircumference}
                  initial={{ strokeDashoffset: circleCircumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-accent shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-cyan-400">
                  {completionRate}%
                </span>
                <span className="text-[10px] text-tertiary uppercase font-bold tracking-widest mt-1">Average</span>
              </div>
            </div>
            
            <div className="w-full flex justify-between mt-6 text-sm border-t border-white/5 pt-4">
              <div className="text-center">
                <p className="text-green-400 font-bold">{activeCount}</p>
                <p className="text-tertiary text-[10px] uppercase font-bold">Active</p>
              </div>
              <div className="text-center border-l border-r border-white/5 px-4">
                <p className="text-secondary font-bold">{members.length - activeCount - warnedCount}</p>
                <p className="text-tertiary text-[10px] uppercase font-bold">Inactive</p>
              </div>
              <div className="text-center">
                <p className="text-red-400 font-bold">{warnedCount}</p>
                <p className="text-tertiary text-[10px] uppercase font-bold">Warned</p>
              </div>
            </div>
          </BaseCard>

          {/* Quick Actions */}
          <BaseCard className="p-5">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all text-xs font-bold text-primary">
                <FiFileText size={18} className="text-purple-400" /> Review Code
              </button>
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all text-xs font-bold text-primary">
                <FiMessageSquare size={18} className="text-blue-400" /> Clan Chat
              </button>
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-yellow-500/30 transition-all text-xs font-bold text-primary">
                <FiAward size={18} className="text-yellow-400" /> Leaderboard
              </button>
              <button
                onClick={() => {
                  if (!canArchive) return;
                  if (window.confirm(`Archive ${clan.name}? This will make the clan read-only until an admin restores it.`)) {
                    archiveMutation.mutate();
                  }
                }}
                disabled={!canArchive || archiveMutation.isPending}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-red-500/30 transition-all text-xs font-bold text-primary disabled:opacity-60"
              >
                {isArchived ? <FiRefreshCw size={18} className="text-amber-400" /> : <FiAlertTriangle size={18} className="text-red-400" />}
                {isArchived ? 'Archived' : archiveMutation.isPending ? 'Archiving...' : 'Archive Clan'}
              </button>
            </div>
          </BaseCard>
        </div>

        {/* Right Col: Member Progress List */}
        <BaseCard className="p-6 xl:col-span-2 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
              <FiActivity className="text-accent" /> Member Progress Overview
            </h2>
            <button className="text-xs text-accent hover:text-accent-light transition-colors font-bold uppercase tracking-widest">View All</button>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {members.slice(0, 6).map((member) => {
              const isActive = member.status !== 'Warned' && member.status !== 'Inactive';
              const isWarned = member.status === 'Warned';
              const solved = member.solvedProblems || 0;
              const total = TARGET_PROBLEMS;
              const progressPct = total > 0 ? Math.min(100, (solved / total) * 100) : 0;
              const canWarnMember = canIssueWarning(user, member, clan);
              
              return (
                <div key={member._id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isWarned ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center gap-3 w-1/3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-glass-surface flex items-center justify-center font-black text-xs text-primary">
                        {(member.username?.[0] || member.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f1115] ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary truncate max-w-[120px]">{member.username || member.email || 'Onboarding Pending'}</p>
                      <p className="text-[10px] uppercase font-bold text-tertiary">Active {isActive ? 'Now' : '2d ago'}</p>
                    </div>
                  </div>

                  <div className="flex-1 px-4 hidden md:block">
                    <div className="flex justify-between text-[10px] font-bold text-secondary mb-1">
                      <span>Set Progress</span>
                      <span>{solved}/{total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                        className={`h-full ${progressPct === 100 ? 'bg-green-400' : 'bg-accent'}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-1/4 justify-end">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-primary">{member.codingLevel || 'Beginner'}</p>
                      <p className="text-[10px] text-yellow-400 flex items-center justify-end gap-1"><FiAward/> {(member.points || 0)} XP</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (!canWarnMember) return;
                        setWarningModal({ open: true, user: member, message: '' });
                      }}
                      disabled={!canWarnMember}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      title="Issue Warning"
                    >
                      <FiAlertTriangle size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </BaseCard>
      </div>

      {/* Join Requests */}
      <BaseCard className="p-6 space-y-4">
        <h2 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
          <FiShield className="text-blue-400" /> Pending Join Requests ({clan.requests?.length || 0})
        </h2>
        {clan.requests?.length === 0 ? (
          <p className="text-tertiary text-sm py-4">No pending requests.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clan.requests?.map((reqUser) => (
              <div key={reqUser._id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                    {(reqUser.username?.[0] || reqUser.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{reqUser.username || reqUser.email || 'Onboarding Pending'}</p>
                    <p className="text-xs text-secondary">{reqUser.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate(reqUser._id)} disabled={!canModerateRequests} className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors disabled:opacity-50">
                    <FiCheck />
                  </button>
                  <button onClick={() => rejectMutation.mutate(reqUser._id)} disabled={!canModerateRequests} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors disabled:opacity-50">
                    <FiX />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseCard>

      {/* Warning Modal */}
      <AnimatePresence>
        {warningModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 border-red-500/30 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-red-400 flex items-center gap-2"><FiAlertTriangle /> Issue Warning</h3>
                    <p className="text-xs text-secondary mt-1">Send an official warning to {warningModal.user?.username}.</p>
                  </div>
                  <button onClick={() => setWarningModal({ open: false, user: null, message: '' })} className="text-tertiary hover:text-white"><FiX size={20}/></button>
                </div>
                <textarea
                  className="field-textarea"
                  rows="4"
                  placeholder="Reason for warning (sent via email)..."
                  value={warningModal.message}
                  onChange={e => setWarningModal({ ...warningModal, message: e.target.value })}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setWarningModal({ open: false, user: null, message: '' })} className="px-4 py-2 text-sm font-bold text-secondary hover:text-primary">Cancel</button>
                  <button 
                    onClick={() => warnMutation.mutate({ userId: warningModal.user._id, message: warningModal.message })}
                    disabled={warnMutation.isLoading}
                    className="btn-primary bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-0"
                  >
                    {warnMutation.isLoading ? 'Sending...' : 'Issue Warning'}
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ChiefDashboardTab;
