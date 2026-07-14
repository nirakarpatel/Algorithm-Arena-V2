import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiCheck, FiX, FiAward, FiAlertTriangle, FiFileText, FiShield, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
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

const getRelativeTime = (dateString) => {
  if (!dateString) return { text: 'a while ago', isOnline: false };
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 5) return { text: 'Now', isOnline: true };
  if (minutes < 60) return { text: `${minutes}m ago`, isOnline: false };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, isOnline: false };
  const days = Math.floor(hours / 24);
  return { text: `${days}d ago`, isOnline: false };
};

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

const ChiefDashboardTab = ({ clan, onTabChange }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [warningModal, setWarningModal] = useState({ open: false, user: null, message: '' });
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [hoveredMember, setHoveredMember] = useState(null); // { memberId, name, x, y }
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
      toast.success('Yes, this member is warned now');
      setWarningModal({ open: false, user: null, message: '' });
      queryClient.invalidateQueries({ queryKey: ['chief-clan-info'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to issue warning');
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

  const pendingSubmissionsQuery = useQuery({
    queryKey: ['chief-submissions', clan?._id, 'Pending'],
    queryFn: async () => {
      const res = await api.get('/api/submissions?page=1&limit=50&status=Pending');
      const allSubs = res.data.data || [];
      // Filter to only submissions from clan members
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

  const setAnalyticsQuery = useQuery({
    queryKey: ['chief-set-analytics', clan?._id],
    queryFn: async () => {
      const res = await api.get('/api/clans/mine/set-analytics');
      return res.data.data;
    },
    enabled: !!clan
  });

  if (!clan) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );

  const chiefId = clan.chief?._id?.toString() ?? clan.chief?.toString();
  const members = (clan.members || []).filter(m => m._id?.toString() !== chiefId);
  const activeCount = members.filter(m => m.status !== 'Warned' && m.status !== 'Inactive').length;
  const warnedCount = members.filter(m => m.status === 'Warned').length;
  const pendingReviews = pendingSubmissionsQuery.data?.length ?? 0;

  // --- Per-question-set analytics ---
  const analytics = setAnalyticsQuery.data;
  const sets = analytics?.sets ?? [];
  const perSet = analytics?.perSet ?? {};
  const closestActiveSetId = analytics?.closestActiveSetId ?? null;

  // Selected set for the member list / deltas (falls back to closest active, else newest).
  const effectiveSetId =
    (selectedSetId && sets.some(s => s._id === selectedSetId) && selectedSetId) ||
    closestActiveSetId ||
    sets[0]?._id ||
    null;
  const selectedIdx = sets.findIndex(s => s._id === effectiveSetId);
  const selectedSet = selectedIdx >= 0 ? sets[selectedIdx] : null;
  // sets are newest-first, so the previous set is the next index.
  const previousSet = selectedIdx >= 0 && selectedIdx < sets.length - 1 ? sets[selectedIdx + 1] : null;
  const selectedMembers = effectiveSetId ? perSet[effectiveSetId]?.members ?? {} : {};
  const previousMembers = previousSet ? perSet[previousSet._id]?.members ?? {} : {};
  const selectedChallenges = effectiveSetId ? perSet[effectiveSetId]?.challenges ?? [] : [];

  // Ring shows the closest active set's clan completion.
  const closestSet = closestActiveSetId ? sets.find(s => s._id === closestActiveSetId) : null;
  const completionRate = closestActiveSetId ? (perSet[closestActiveSetId]?.clanCompletionPct ?? 0) : 0;

  // Clan solve-rate trend across the sets, chronological (oldest → newest).
  const clanTrend = [...sets].reverse().map(s => ({
    _id: s._id,
    label: `W${s.weekNumber ?? '?'}`,
    pct: perSet[s._id]?.clanCompletionPct ?? 0,
  }));

  const circleRadius = 76;
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
            <h2 className="text-xs font-black text-secondary uppercase tracking-[0.2em] self-start mb-1 w-full">Closest Set Completion</h2>
            <p className="text-[10px] text-tertiary self-start mb-5 w-full truncate" title={closestSet?.title || ''}>
              {closestSet ? closestSet.title : 'No active set'}
            </p>

            <div className="relative flex items-center justify-center w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <defs>
                  <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                  <filter id="completionGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <circle
                  cx="96" cy="96" r={circleRadius}
                  stroke="currentColor" strokeWidth="10" fill="transparent"
                  className="text-black/10 dark:text-white/[0.04]"
                />
                <motion.circle
                  cx="96" cy="96" r={circleRadius}
                  stroke="url(#completionGradient)" strokeWidth="10" fill="transparent"
                  strokeDasharray={circleCircumference}
                  initial={{ strokeDashoffset: circleCircumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  filter="url(#completionGlow)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-cyan-400 font-h1">
                  {closestActiveSetId ? `${completionRate}%` : '—'}
                </span>
                <span className="text-[9px] text-tertiary uppercase font-black tracking-widest mt-1">Clan Avg</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-3 gap-2 mt-8 border-t border-black/[0.08] dark:border-white/5 pt-5">
              <div className="flex flex-col items-center p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.03]">
                <span className="text-base font-extrabold text-green-400">{activeCount}</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-tertiary mt-1">Active</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.03]">
                <span className="text-base font-extrabold text-secondary">{members.length - activeCount - warnedCount}</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-tertiary mt-1">Idle</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.03]">
                <span className="text-base font-extrabold text-rose-400">{warnedCount}</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-tertiary mt-1">Warned</span>
              </div>
            </div>
          </BaseCard>

          <BaseCard className="p-5">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onTabChange?.('review')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all text-xs font-bold text-primary"
              >
                <FiFileText size={18} className="text-purple-400" /> Review Code
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-yellow-500/30 transition-all text-xs font-bold text-primary"
              >
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
                className="col-span-2 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-red-500/30 transition-all text-xs font-bold text-primary disabled:opacity-60"
              >
                {isArchived ? <FiRefreshCw size={18} className="text-amber-400" /> : <FiAlertTriangle size={18} className="text-red-400" />}
                {isArchived ? 'Archived' : archiveMutation.isPending ? 'Archiving...' : 'Archive Clan'}
              </button>
            </div>
          </BaseCard>
        </div>

        {/* Right Col: Member Progress List */}
        <BaseCard className="p-6 xl:col-span-2 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
              <FiActivity className="text-accent" /> Member Progress Overview
            </h2>
          </div>

          {/* Set selector */}
          {sets.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {sets.map((s) => {
                const isSelected = s._id === effectiveSetId;
                return (
                  <button
                    key={s._id}
                    onClick={() => setSelectedSetId(s._id)}
                    title={s.title}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                      isSelected
                        ? 'bg-green-500/20 text-green-400 border-green-500/40'
                        : 'bg-white/[0.02] text-secondary border-white/5 hover:text-primary hover:bg-white/[0.05]'
                    }`}
                  >
                    W{s.weekNumber ?? '?'}{s.isActive ? '' : ' ·'}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {setAnalyticsQuery.isLoading && (
              <p className="text-tertiary text-sm py-4">Loading set analytics…</p>
            )}
            {!setAnalyticsQuery.isLoading && sets.length === 0 && (
              <p className="text-tertiary text-sm py-4">No question sets published yet.</p>
            )}
            {sets.length > 0 && members.map((member) => {
              const { text: timeText, isOnline } = getRelativeTime(member.lastLoginDate || member.createdAt);
              const isWarned = member.status === 'Warned';
              const setData = selectedMembers[member._id];
              const solved = setData?.solved ?? 0;
              const total = setData?.total ?? (selectedSet?.challengeCount ?? 0);
              const progressPct = total > 0 ? Math.min(100, (solved / total) * 100) : 0;
              const prevData = previousMembers[member._id];
              const delta = previousSet && prevData ? solved - prevData.solved : null;
              const canWarnMember = canIssueWarning(user, member, clan);

              const displayName = member.name
                ? `${member.name} (${member.username || 'No Username'})`
                : (member.username || member.email || 'Onboarding Pending');

              return (
                <div key={member._id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isWarned ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center gap-3 w-1/3">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-glass-surface flex items-center justify-center font-black text-xs text-primary overflow-hidden">
                        {member.profilePicture ? (
                          <img
                            src={member.profilePicture}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover select-none"
                          />
                        ) : (
                          (member.username?.[0] || member.email?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f1115] ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-bold text-primary truncate max-w-[180px] select-none cursor-help hover:text-accent transition-colors"
                        onMouseEnter={(e) => setHoveredMember({ memberId: member._id, name: displayName, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setHoveredMember((h) => (h && h.memberId === member._id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                        onMouseLeave={() => setHoveredMember((h) => (h && h.memberId === member._id ? null : h))}
                      >
                        {displayName}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-tertiary footer-page">Active {timeText}</p>
                    </div>
                  </div>

                  <div className="flex-1 px-4 hidden md:block">
                    <div className="flex justify-between items-center text-[10px] font-bold text-secondary mb-1 select-none">
                      <span>Set Progress</span>
                      <span className="flex items-center gap-1.5">
                        {delta != null && delta !== 0 && (
                          <span className={delta > 0 ? 'text-green-400' : 'text-rose-400'}>
                            {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                          </span>
                        )}
                        {delta === 0 && <span className="text-tertiary">—</span>}
                        <span>{solved}/{total}</span>
                      </span>
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
                    {solved === 0 && canWarnMember && (
                      <button
                        onClick={() => setWarningModal({ open: true, user: member, message: '' })}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors text-xs font-bold flex items-center gap-1"
                        title="Warn — no submissions this set"
                      >
                        <FiAlertTriangle size={12} /> Warn
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </BaseCard>
      </div>

      {/* Clan Solve-Rate Trend */}
      <BaseCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
            <FiTrendingUp className="text-accent" /> Clan Solve Rate by Set
          </h2>
          <span className="text-[10px] text-tertiary uppercase font-bold tracking-widest">Chief excluded</span>
        </div>
        {clanTrend.length === 0 ? (
          <p className="text-tertiary text-sm py-4">No question sets to chart yet.</p>
        ) : (
          <div className="h-52 flex items-end justify-around gap-4">
            {clanTrend.map((t) => (
              <div key={t._id} className="flex-1 flex flex-col items-center h-full">
                <span className="text-xs font-black text-primary mb-1">{t.pct}%</span>
                <div className="flex-1 w-full flex items-end justify-center min-h-0">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${t.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="w-full max-w-[56px] bg-gradient-to-t from-accent to-cyan-400 rounded-t-lg min-h-[2px]"
                  />
                </div>
                <span className="text-[10px] text-tertiary font-bold mt-2">{t.label}</span>
              </div>
            ))}
          </div>
        )}
      </BaseCard>

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
                    disabled={warnMutation.isPending}
                    className="btn-primary bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-0"
                  >
                    {warnMutation.isPending ? 'Sending...' : 'Issue Warning'}
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Per-question status tooltip (hover a member name) */}
      {hoveredMember && selectedChallenges.length > 0 && (() => {
        const statuses = selectedMembers[hoveredMember.memberId]?.statuses ?? {};
        const dotFor = (st) =>
          st === 'accepted' ? 'bg-green-500'
          : st === 'pending' ? 'bg-yellow-400'
          : st === 'rejected' ? 'bg-red-500'
          : 'bg-gray-500/40';
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const left = Math.min(hoveredMember.x + 16, vw - 300);
        const top = Math.min(hoveredMember.y + 16, Math.max(16, vh - 120 - selectedChallenges.length * 22));
        return (
          <div
            style={{ position: 'fixed', left, top, zIndex: 60 }}
            className="pointer-events-none w-72 p-3 rounded-xl bg-[#0f1115] border border-white/10 shadow-2xl"
          >
            <p className="text-[11px] font-black text-primary mb-2 truncate">
              {hoveredMember.name}
              <span className="text-tertiary font-bold"> · {selectedSet?.title}</span>
            </p>
            <ul className="space-y-1.5">
              {selectedChallenges.map((ch) => (
                <li key={ch._id} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotFor(statuses[ch._id])}`} />
                  <span className="text-secondary truncate">{ch.title}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-white/5 text-[9px] text-tertiary font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Solved</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Pending</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Rejected</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500/40" />Unsolved</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default ChiefDashboardTab;
