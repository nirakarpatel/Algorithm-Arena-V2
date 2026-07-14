import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiLogOut,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiAward,
  FiTarget,
  FiX,
  FiTrash2,
  FiAlertTriangle,
  FiGrid,
  FiList,
} from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import BaseCard from '../components/BaseCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import MemberHoverCard from '../components/MemberHoverCard';
import ClanHoverCard from '../components/ClanHoverCard';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../hooks/useSocket';



/* ─── Stat Card for the Clan Dashboard ────────────────────── */
const StatCard = ({ icon, label, value, color }) => {
  const IconComponent = icon;
  return (
    <div className="relative overflow-hidden macos-glass p-5 flex items-center gap-4 group hover:border-accent/30 hover:shadow-lg transition-all duration-300 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
      {/* Background soft blob */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-[20px] opacity-10 pointer-events-none transition-all group-hover:scale-125"
        style={{ backgroundColor: "rgba(var(--accent-rgb), 0.3)" }} />

      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${color}`}>
        <IconComponent size={22} />
      </div>
      <div>
        <p className="text-[10px] text-secondary uppercase tracking-[0.15em] font-black">{label}</p>
        <p className="text-2xl font-black text-primary tracking-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
};

/* ─── Clan Dashboard ─────────────── */

const ClanDashboard = ({ clan, userId, onLeave, readOnly, onBack }) => {
  const members = clan.members || [];
  // eslint-disable-next-line no-unused-vars
  const requests = clan.requests || [];
  const isArchived = clan.status === 'archived';
  const [viewMode, setViewMode] = useState('grid');

  // Fetch member badges to determine Star Performer
  const { data: memberBadgeMap = {} } = useQuery({
    queryKey: ['member-badges', clan?._id],
    queryFn: async () => {
      if (!members.length) return {};
      try {
        const userIds = members.map(m => m._id);
        const res = await api.post('/api/badges/batch', { userIds });
        const badgeMap = res.data?.data || {};

        const results = Object.entries(badgeMap).map(([userId, badges]) => {
          const chiefAwarded = (badges || []).filter(b => b.isChiefBadge && b.isUnlocked);
          return [userId, chiefAwarded];
        });
        return Object.fromEntries(results);
      } catch (err) {
        console.error('Failed to batch fetch badges', err);
        return {};
      }
    },
    enabled: !!members.length,
    staleTime: 60000,
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-black/[0.08] dark:border-white/[0.08] bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--glass-surface)] shadow-lg"
      >
        {/* Dynamic backdrop blurred blob */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ backgroundColor: "rgba(var(--accent-rgb), 0.3)" }}
        />
        <div
          className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ backgroundColor: "rgba(236, 72, 153, 0.2)" }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              {onBack && (
                 <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-secondary hover:text-primary transition-all text-xs font-bold w-max shadow-sm animate-pulse-subtle">
                    <FiLogOut className="rotate-180" size={12} /> Back
                 </button>
              )}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent/80 block mb-1">
                  {readOnly ? 'Clan Preview' : 'Your Clan'}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tight leading-none">
                    {clan.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black font-mono text-accent bg-accent/15 px-2.5 py-1 ">
                      [{clan.tag}]
                    </span>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${isArchived ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}`}>
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-secondary max-w-xl text-sm md:text-base leading-relaxed">{clan.description}</p>
              {isArchived && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 shadow-sm">
                  <FiAlertTriangle size={14} className="text-amber-400" /> This clan is archived and read-only.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  onClick={onLeave}
                  disabled={isArchived}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <FiLogOut size={14} /> {isArchived ? 'Archived' : 'Leave Clan'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Members" value={members.length} color="bg-accent/15 text-accent" />
        <StatCard icon={FiTrendingUp} label="Total XP" value={(clan.totalPoints || 0).toLocaleString()} color="bg-green-500/15 text-green-400" />
        <StatCard icon={FiTarget} label="Avg XP" value={members.length ? Math.round((clan.totalPoints || 0) / members.length).toLocaleString() : '0'} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={FiAward} label="Chief" value={clan.chief?.username || 'None'} color="bg-yellow-500/15 text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="h-full">
          <BaseCard variant='solid' className="h-full relative overflow-hidden" hover={false}>
            {/* Soft background blob */}
            <div className="absolute -left-10 -bottom-10 w-60 h-60 rounded-full blur-[40px] opacity-15 pointer-events-none z-0"
              style={{ backgroundColor: "rgba(var(--accent-rgb), 0.15)" }} />

            <div className="relative z-10">
              <h3 className="text-section-title font-bold flex items-center gap-2 mb-6">
                <FiUsers className="text-accent" />
                Roster
                <span className="text-xs bg-accent/10 px-2 py-0.5 rounded-full text-accent font-black">{members.length}</span>
                <div className="ml-auto flex bg-black/[0.04] dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-1">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'}`}><FiGrid size={14}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'}`}><FiList size={14}/></button>
                </div>
              </h3>
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                {[...members]
                  .sort((a, b) => (b.points || 0) - (a.points || 0))
                  .map((member, i) => {
                  const isMemberChief = clan.chief?._id === member._id;
                  return (
                    <motion.div
                      key={member._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-accent/30 dark:hover:border-accent/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-glass-surface flex items-center justify-center font-bold text-accent overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-inner">
                          {member.profilePicture ? (
                            <img src={member.profilePicture} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                          ) : (
                            (member.username?.[0] || member.email?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-primary truncate">
                              <MemberHoverCard userId={member._id} username={member.username}>
                                <span>{member.username || member.email || 'Onboarding Pending'}</span>
                              </MemberHoverCard>
                            </p>
                            {member._id === userId && (
                              <span className="text-[9px] bg-accent px-1.5 py-0.5 rounded text-white italic font-black shrink-0">YOU</span>
                            )}
                            {isMemberChief ? (
                              <span className="text-[9px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded font-bold shrink-0">CHIEF</span>
                            ) : (
                              <span className="text-[9px] bg-black/[0.03] dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] text-secondary px-1.5 py-0.5 rounded font-medium shrink-0">MEMBER</span>
                            )}
                          </div>
                          {isMemberChief && (
                            <p className="text-[10px] text-yellow-400/80 font-semibold flex items-center gap-1 mt-0.5">
                              <FiShield size={10} /> Clan Chief
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto sm:max-w-[60%] shrink-0">
                        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full">
                          <span className="text-[10px] text-accent/90 font-bold flex items-center gap-1 bg-accent/10 border dark:border-white/20 px-2 py-1 rounded-lg">
                            <FiStar size={10} /> {(member.points || 0).toLocaleString()} XP
                          </span>
                          <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg" title={`${member.streak || 0} Day Streak`}>
                            🔥 {member.streak || 0}
                          </span>
                          {(memberBadgeMap[member._id] && memberBadgeMap[member._id].length > 0) && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg" title="Total Clan Badges">
                              <FiAward size={10} /> {memberBadgeMap[member._id].length}
                            </span>
                          )}
                        </div>

                        {(memberBadgeMap[member._id] && memberBadgeMap[member._id].length > 0) && (
                          <div className="flex flex-wrap justify-start sm:justify-end gap-1.5 w-full">
                            {memberBadgeMap[member._id].map(badge => (
                              <span key={badge._id} className="text-[10px] bg-gradient-to-r from-amber-500/20 to-yellow-400/20 border border-yellow-500/30 text-amber-500 dark:text-yellow-400 px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm" title={badge.description || badge.name}>
                                {badge.icon || <FiAward size={10} />} {badge.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  );
};

/* ─── Clan Browser ───────────── */
const ClanBrowser = ({ clans, loading, userId, onApply, onViewClan, userHasClan, onBack }) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const filtered = clans.filter((c) => {
    if (userHasClan && (c.members || []).some(m => m._id === userId)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 border border-black/[0.08] dark:border-white/[0.08] bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--glass-surface)] shadow-lg"
      >
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ backgroundColor: "rgba(var(--accent-rgb), 0.3)" }}
        />
        {onBack && (
          <button onClick={onBack} className="absolute top-6 right-6 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-secondary hover:text-primary transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <FiLogOut className="rotate-180" size={12} /> Back to My Clan
          </button>
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent/80 mb-1 block">
          {userHasClan ? "Explore" : "Find Your Tribe"}
        </span>
        <h2 className="text-2xl md:text-4xl font-black text-primary mb-2 tracking-tight">
          {userHasClan ? "Other Clans" : "Join a Clan"}
        </h2>
        <p className="text-secondary text-sm max-w-lg leading-relaxed">
          {userHasClan
            ? "Browse other clans in the arena to see their rosters and stats."
            : "Clans let you team up, compete together, and climb the leaderboards as a unit. Apply to join — once the chief approves, you're in!"}
        </p>
      </motion.div>

      <div className="relative overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] p-4 flex gap-3 shadow-sm">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            className="field-input pl-10 h-10 rounded-xl"
            placeholder="Search clans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-black/[0.04] dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-xl p-1 shrink-0">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'}`}><FiGrid size={16}/></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'}`}><FiList size={16}/></button>
        </div>
      </div>

      {loading ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No clans found" description="Try a different search or ask admin to create one." />
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-3"}>
          {filtered.map((clan, index) => {
            const isMember = (clan.members || []).some((m) => m._id === userId);
            return (
              <motion.div
                key={clan._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={`relative overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] hover:border-accent/30 dark:hover:border-accent/30 hover:shadow-lg transition-all duration-300 p-5 ${viewMode === 'list' ? 'flex flex-row items-center gap-4 py-4' : 'flex flex-col h-full'}`}>
                  {/* Soft background glow */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[30px] opacity-[0.04] dark:opacity-[0.08] pointer-events-none group-hover:scale-125 transition-transform"
                    style={{ backgroundColor: "rgba(var(--accent-rgb), 0.5)" }} />

                  <div className={`flex items-start justify-between ${viewMode === 'list' ? 'shrink-0 mb-0 pr-4 min-w-[200px]' : 'mb-3'}`}>
                    <div className="flex items-baseline gap-2">
                      <ClanHoverCard clanId={clan._id}>
                        <h3 className={`font-black text-lg text-primary hover:text-accent transition-colors cursor-pointer ${viewMode === 'list' ? 'whitespace-nowrap' : 'truncate'}`}>
                          {clan.name}
                        </h3>
                      </ClanHoverCard>
                      <span className="text-xs text-accent font-mono font-bold whitespace-nowrap bg-accent/10 px-1.5 py-0.5 rounded">[{clan.tag}]</span>
                    </div>
                    {viewMode === 'grid' && (
                      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/15">
                        <FiUsers className="text-accent" size={16} />
                      </div>
                    )}
                  </div>

                  <p className={`text-secondary text-sm leading-relaxed ${viewMode === 'list' ? 'flex-1 mb-0 line-clamp-2' : 'flex-1 mb-5 line-clamp-3'}`}>
                    {clan.description || 'No description provided.'}
                  </p>

                  <div className={viewMode === 'list' ? 'flex items-center gap-6 ml-auto shrink-0' : 'flex flex-col mt-auto pt-3 border-t border-black/[0.06] dark:border-white/[0.06]'}>
                    <div className={`flex items-center gap-4 text-xs text-secondary ${viewMode === 'list' ? 'pt-0 border-0 mb-0 shrink-0' : 'mb-4'}`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <FiUsers size={13} className="text-accent" /> {(clan.members || []).length} members
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-secondary/95">
                        <FiShield size={13} className="text-amber-500" /> {clan.chief?.username || 'None'}
                      </span>
                    </div>

                    <div className={`${viewMode === 'list' ? 'mt-0 shrink-0' : 'w-full'}`}>
                      {userHasClan ? (
                         <button
                           onClick={() => onViewClan(clan)}
                           className={`btn-secondary text-xs font-bold flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl ${viewMode === 'list' ? '' : 'w-full'}`}
                         >
                           <FiSearch size={13} /> View
                         </button>
                      ) : isMember ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                          <FiCheckCircle size={14} /> Joined
                        </div>
                      ) : (
                        <div className={`flex gap-2 ${viewMode === 'list' ? '' : 'w-full'}`}>
                          <button
                            onClick={() => onViewClan(clan)}
                            className="btn-secondary text-xs font-bold flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl"
                          >
                            <FiSearch size={13} /> Preview
                          </button>
                          <button
                            onClick={() => onApply(clan._id)}
                            className="btn-primary text-xs font-bold flex-1 px-3 py-2 rounded-xl"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN CLANS PAGE
   ═══════════════════════════════════════════════════════════════ */
const Clans = () => {
  const MotionDiv = motion.div;
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const previewClanId = searchParams.get('preview');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [viewingOtherClan, setViewingOtherClan] = useState(null);
  const [isBrowsingOthers, setIsBrowsingOthers] = useState(false);

  useSocket("leaderboard_update", () => {
    queryClient.invalidateQueries({ queryKey: ['my-clan'] });
    queryClient.invalidateQueries({ queryKey: ['clans-list'] });
  });

  const myClanQuery = useQuery({
    queryKey: ['my-clan'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/clans/mine');
        return res.data.data || null;
      } catch (err) {
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!user?.id,
  });

  // Fetch all clans
  const clansQuery = useQuery({
    queryKey: ['clans-list'],
    queryFn: async () => {
      const res = await api.get('/api/clans');
      return res.data.data || [];
    },
  });

  useEffect(() => {
    if (previewClanId && clansQuery.data) {
      const clanToPreview = clansQuery.data.find(c => c._id === previewClanId);
      if (clanToPreview && viewingOtherClan?._id !== previewClanId) {
        setViewingOtherClan(clanToPreview);
      }
    } else if (!previewClanId && viewingOtherClan) {
      setViewingOtherClan(null);
    }
  }, [previewClanId, clansQuery.data, viewingOtherClan]);

  const handleBackFromPreview = () => {
    if (previewClanId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('preview');
      setSearchParams(newParams, { replace: true });
    } else {
      setViewingOtherClan(null);
    }
  };

  const myClan = myClanQuery.data;

  // Notices removed upstream

  const handleApply = async (clanId) => {
    try {
      await api.post(`/api/clans/${clanId}/join`);
      toast.success('Applied to join! Awaiting approval.');
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply. Try again.');
    }
  };

  const handleLeave = async () => {
    if (!myClan) return;
    if (myClan.status === 'archived') {
      toast.error('Archived clans cannot be left until they are restored.');
      return;
    }
    setLeaving(true);
    try {
      await api.post(`/api/clans/${myClan._id}/leave`);
      toast.success('You have left the clan.');
      setShowLeaveConfirm(false);
      updateUser({ clan: null });
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-clan'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave. Try again.');
    } finally {
      setLeaving(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleApprove = async (userId) => {
    if (!myClan) return;
    try {
      await api.post(`/api/clans/${myClan._id}/approve/${userId}`);
      toast.success('Member approved!');
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleReject = async (userId) => {
    if (!myClan) return;
    try {
      await api.post(`/api/clans/${myClan._id}/reject/${userId}`);
      toast.success('Request rejected.');
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject.');
    }
  };

  const handleRemoveMember = async () => {
    if (!myClan || !removeTarget) return;
    try {
      await api.delete(`/api/clans/${myClan._id}/members/${removeTarget._id}`);
      toast.success('Member removed from clan.');
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleAddNotice = async (notice) => {
    if (!myClan) return;
    try {
      await api.post(`/api/clans/${myClan._id}/notices`, { notice });
      toast.success('Notice posted!');
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch {
      toast.error('Failed to post notice.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRemoveNotice = async (index) => {
    if (!myClan) return;
    try {
      await api.delete(`/api/clans/${myClan._id}/notices/${index}`);
      toast.success('Notice removed!');
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch {
      toast.error('Failed to remove notice.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Clans"
        subtitle={myClan ? (myClan.status === 'archived' ? `Your clan ${myClan.name} is archived and read only.` : `You are a member of ${myClan.name}`) : 'Find your tribe and compete together.'}
        showBack={true}
        backUrl="/dashboard"
        actions={
          myClan && !isBrowsingOthers && !viewingOtherClan && (
            <button
              onClick={() => setIsBrowsingOthers(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 text-accent hover:bg-accent/10 transition-all text-sm font-semibold"
            >
              <FiSearch size={14} /> Browse Other Clans
            </button>
          )
        }
      />

      <AnimatePresence mode="wait">
        {viewingOtherClan ? (
          <MotionDiv
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClanDashboard
              clan={viewingOtherClan}
              userId={user?.id}
              readOnly={true}
              onBack={handleBackFromPreview}
            />
          </MotionDiv>
        ) : isBrowsingOthers ? (
          <MotionDiv
            key="browser-others"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClanBrowser
              clans={clansQuery.data || []}
              loading={clansQuery.isLoading}
              userId={user?.id}
              userHasClan={true}
              onViewClan={(clan) => setSearchParams({ preview: clan._id })}
              onBack={() => setIsBrowsingOthers(false)}
            />
          </MotionDiv>
        ) : myClan ? (
          <MotionDiv
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClanDashboard
              clan={myClan}
              userId={user?.id}
              onLeave={() => setShowLeaveConfirm(true)}
              onBrowseOthers={() => setIsBrowsingOthers(true)}
            />
          </MotionDiv>
        ) : (
          <MotionDiv
            key="browser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClanBrowser
              clans={clansQuery.data || []}
              loading={clansQuery.isLoading}
              userId={user?.id}
              onApply={handleApply}
              onViewClan={(clan) => setSearchParams({ preview: clan._id })}
            />
          </MotionDiv>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave Clan"
        description={`Are you sure you want to leave "${myClan?.name || ''}"? You will lose access to the clan dashboard and may need to reapply to rejoin.`}
        confirmLabel={leaving ? 'Leaving...' : 'Yes, Leave'}
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove Member"
        description={`Are you sure you want to remove ${removeTarget?.username} from the clan?`}
        confirmLabel="Remove"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
};

export default Clans;
