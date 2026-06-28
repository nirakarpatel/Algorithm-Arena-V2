import React, { useState } from 'react';
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
    <div className="macos-glass p-5 flex items-center gap-4 group hover:border-accent/40 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <IconComponent size={22} />
      </div>
      <div>
        <p className="text-xs text-secondary uppercase tracking-widest font-bold">{label}</p>
        <p className="text-2xl font-black text-primary">{value}</p>
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
      const results = await Promise.all(
        members.map(async m => {
          try {
            const res = await api.get(`/api/badges/user/${m._id}`);
            const chiefAwarded = (res.data.data || []).filter(b => b.isChiefBadge && b.isUnlocked);
            return [m._id, chiefAwarded.length];
          } catch { return [m._id, 0]; }
        })
      );
      return Object.fromEntries(results);
    },
    enabled: !!members.length,
    staleTime: 60000,
  });

  const starPerformerId = React.useMemo(() => {
    let maxBadges = 0;
    let starId = null;
    for (const [memId, count] of Object.entries(memberBadgeMap)) {
      if (count > maxBadges) {
        maxBadges = count;
        starId = memId;
      }
    }
    return maxBadges > 0 ? starId : null;
  }, [memberBadgeMap]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden macos-glass p-8 md:p-12 border-accent/20 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10"
      >
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {onBack && (
                 <button onClick={onBack} className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-secondary hover:text-primary transition-all text-xs font-semibold w-max">
                    <FiLogOut className="rotate-180" size={12} /> Back
                 </button>
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2 block">
                {readOnly ? 'Clan Preview' : 'Your Clan'}
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-primary leading-tight">
                {clan.name}
                <span className="ml-3 text-lg font-mono text-amber-400">[{clan.tag}]</span>
                <h2 className={`ml-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${isArchived ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                  {isArchived ? 'Archived' : 'Active'}
                </h2>
              </h1>
              <p className="text-secondary mt-2 max-w-lg text-sm md:text-base">{clan.description}</p>
              {isArchived && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                  <FiAlertTriangle size={14} /> This clan is archived and read only until an admin restores it.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  onClick={onLeave}
                  disabled={isArchived}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-semibold disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <FiLogOut size={14} /> {isArchived ? 'Archived' : 'Leave Clan'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.06] pointer-events-none transform translate-x-1/4">
          <FiUsers size={400} />
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Members" value={members.length} color="bg-accent/15 text-accent" />
        <StatCard icon={FiTrendingUp} label="Total XP" value={(clan.totalPoints || 0).toLocaleString()} color="bg-green-500/15 text-green-400" />
        <StatCard icon={FiTarget} label="Avg XP" value={members.length ? Math.round((clan.totalPoints || 0) / members.length).toLocaleString() : '0'} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={FiAward} label="Chief" value={clan.chief?.username || 'None'} color="bg-yellow-500/15 text-yellow-400" />
      </div>

      {/* Notice Board tab button removed in alignment with upstream deletion */}

      <div className="grid grid-cols-1 gap-6">
        <div className="h-full">
          <BaseCard variant='solid' className="h-full" hover={false}>
            <h3 className="text-section-title font-bold flex items-center gap-2 mb-4">
              <FiUsers className="text-accent" />
              Roster
              <span className="text-xs bg-accent/10 px-2 py-0.5 rounded-full text-accent font-black">{members.length}</span>
              <div className="ml-auto flex bg-white/5 border border-white/10 dark:border-white/20 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}><FiGrid size={14}/></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}><FiList size={14}/></button>
              </div>
            </h3>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "flex flex-col gap-2"}>
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 sm:gap-0 rounded-xl border border-black/20 dark:border-white/20 hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-glass-surface flex items-center justify-center font-bold text-accent overflow-hidden">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                        ) : (
                          (member.username?.[0] || member.email?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-primary flex items-center gap-2 truncate">
                          <MemberHoverCard userId={member._id} username={member.username}>
                            <span className="truncate">{member.username || member.email || 'Onboarding Pending'}</span>
                          </MemberHoverCard>
                          {member._id === userId && (
                            <span className="text-[9px] bg-accent px-1.5 py-0.5 rounded text-white italic font-black">YOU</span>
                          )}
                        </p>
                        {isMemberChief && (
                          <p className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                            <FiShield size={10} /> Clan Chief
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                      <span className="text-[10px] text-accent/80 font-bold flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-lg">
                        <FiStar size={10} /> {(member.points || 0).toLocaleString()} XP
                      </span>
                      <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-lg" title={`${member.streak || 0} Day Streak`}>
                        🔥 {member.streak || 0}
                      </span>
                      {memberBadgeMap[member._id] > 0 && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg" title="Clan Badges Earned">
                          <FiAward size={10} /> {memberBadgeMap[member._id]}
                        </span>
                      )}
                      {starPerformerId === member._id && (
                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-1 rounded-lg font-black flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                          ✨ Star Performer
                        </span>
                      )}
                      {isMemberChief ? (
                        <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded-lg font-bold">
                          CHIEF
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] bg-glass-surface text-secondary px-2 py-1 rounded-lg font-medium">
                            Member
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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
        className="macos-glass p-8 md:p-10 border-accent/20 bg-gradient-to-br from-purple-500/10 via-transparent to-accent/10 relative"
      >
        {onBack && (
          <button onClick={onBack} className="absolute top-6 right-6 btn-secondary text-xs flex items-center gap-2">
            <FiLogOut className="rotate-180" size={12} /> Back to My Clan
          </button>
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2 block">
          {userHasClan ? "Explore" : "Find Your Tribe"}
        </span>
        <h2 className="text-2xl md:text-4xl font-black text-primary mb-2">
          {userHasClan ? "Other Clans" : "Join a Clan"}
        </h2>
        <p className="text-secondary text-sm max-w-lg">
          {userHasClan
            ? "Browse other clans in the arena to see their rosters and stats."
            : "Clans let you team up, compete together, and climb the leaderboards as a unit. Apply to join — once the chief approves, you're in!"}
        </p>
      </motion.div>

      <div className="macos-glass p-4 flex gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            className="field-input pl-9"
            placeholder="Search clans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 shrink-0">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}><FiGrid size={18}/></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}><FiList size={18}/></button>
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
                <Card className={`h-full group hover:border-accent/40 transition-all ${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-center gap-4 py-3 px-5' : 'flex flex-col'}`}>
                  <div className={`flex items-start justify-between ${viewMode === 'list' ? 'shrink-0 mb-0 pr-4 min-w-[200px]' : 'mb-3'}`}>
                    <div>
                      <ClanHoverCard clanId={clan._id}>
                        <h3 className={`font-bold text-lg text-primary group-hover:text-accent transition-colors cursor-pointer ${viewMode === 'list' ? 'whitespace-nowrap' : 'truncate'}`}>
                          {clan.name}
                        </h3>
                      </ClanHoverCard>
                      <span className="text-xs text-accent font-mono whitespace-nowrap">[{clan.tag}]</span>
                    </div>
                    {viewMode === 'grid' && (
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <FiUsers className="text-accent" size={18} />
                      </div>
                    )}
                  </div>

                  <p className={`text-secondary text-sm leading-relaxed ${viewMode === 'list' ? 'sm:flex-1 mb-0 line-clamp-2' : 'flex-1 mb-4 line-clamp-3'}`}>
                    {clan.description || 'No description provided.'}
                  </p>

                  <div className={`flex items-center gap-4 text-xs text-secondary ${viewMode === 'list' ? 'sm:w-1/4 sm:justify-end pt-0 border-0 mb-0 shrink-0' : 'mb-4 pt-3 border-t border-glass-border/40'}`}>
                    <span className="flex items-center gap-1">
                      <FiUsers size={12} /> {(clan.members || []).length} {viewMode === 'grid' ? 'members' : ''}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <FiShield size={12} /> {clan.chief?.username || 'None'}
                    </span>
                  </div>

                  <div className={`${viewMode === 'list' ? 'mt-0 sm:ml-4 shrink-0' : 'mt-auto'}`}>
                    {userHasClan ? (
                       <button
                         onClick={() => onViewClan(clan)}
                         className={`btn-secondary text-sm flex items-center justify-center gap-2 ${viewMode === 'list' ? 'px-4 py-2' : 'w-full'}`}
                       >
                         <FiSearch size={14} /> View{viewMode === 'grid' ? ' Clan' : ''}
                       </button>
                    ) : isMember ? (
                      <div className="flex items-center justify-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-2 rounded-lg">
                        <FiCheckCircle size={14} /> Joined
                      </div>
                    ) : (
                      <div className={`flex gap-2 ${viewMode === 'list' ? '' : 'w-full'}`}>
                        <button
                          onClick={() => onViewClan(clan)}
                          className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2"
                        >
                          <FiSearch size={14} /> Preview
                        </button>
                        <button
                          onClick={() => onApply(clan._id)}
                          className="btn-primary flex-1 text-sm px-3 py-2"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
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
              onBack={() => setViewingOtherClan(null)}
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
              onViewClan={(clan) => setViewingOtherClan(clan)}
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
              onViewClan={(clan) => setViewingOtherClan(clan)}
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

