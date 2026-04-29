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
} from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';

/* ─── Mock clans for fallback ─────────────────────────────── */
const mockClans = [
  {
    _id: 'clan_01',
    name: 'Alpha Coders',
    tag: 'AC',
    description: 'The elite squad of algorithm masters. We push boundaries and solve the unsolvable.',
    chief: { _id: 'u_001', username: 'Nirakar' },
    members: [
      { _id: 'u_001', username: 'Nirakar' },
      { _id: 'u_002', username: 'Ashutosh' },
      { _id: 'u_004', username: 'Priyanka' },
      { _id: 'u_006', username: 'recursionKing' },
    ],
    status: 'active',
    notices: [
      'Weekly contest every Saturday at 8PM IST',
      'New challenge set: Dynamic Programming Sprint',
    ],
    totalPoints: 11200,
  },
  {
    _id: 'clan_02',
    name: 'Byte Knights',
    tag: 'BK',
    description: 'Honour. Code. Conquer. A clan for those who code with discipline.',
    chief: { _id: 'u_003', username: 'binaryBoss' },
    members: [
      { _id: 'u_003', username: 'binaryBoss' },
      { _id: 'u_005', username: 'stackOverflow_fan' },
      { _id: 'u_007', username: 'dpWizard' },
    ],
    status: 'active',
    notices: ['Pair programming sessions every Wednesday'],
    totalPoints: 8400,
  },
  {
    _id: 'clan_03',
    name: 'Stack Overlords',
    tag: 'SO',
    description: 'We overflow — with solutions. Competitive programming at its finest.',
    chief: { _id: 'u_008', username: 'Soumya' },
    members: [
      { _id: 'u_008', username: 'Soumya' },
      { _id: 'u_009', username: 'bitManipulator' },
      { _id: 'u_010', username: 'heapHero' },
    ],
    status: 'active',
    notices: ['Recruiting! Apply now to join the overlords.'],
    totalPoints: 6800,
  },
];

/* ─── Stat Card for the Clan Dashboard ────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="macos-glass p-5 flex items-center gap-4 group hover:border-accent/40 transition-all">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-xs text-secondary uppercase tracking-widest font-bold">{label}</p>
      <p className="text-2xl font-black text-primary">{value}</p>
    </div>
  </div>
);

/* ─── Clan Dashboard (when user IS in a clan) ─────────────── */
const ClanDashboard = ({ clan, userId, onLeave }) => {
  const isChief = clan.chief?._id === userId;
  const members = clan.members || [];
  const notices = clan.notices || ['No announcements yet. Stay tuned!'];

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
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2 block">
                Your Clan
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-primary leading-tight">
                {clan.name}
                <span className="ml-3 text-lg font-mono text-accent/70">[{clan.tag}]</span>
              </h2>
              <p className="text-secondary mt-2 max-w-lg text-sm md:text-base">{clan.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {isChief && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 text-xs font-bold">
                  <FiShield size={12} /> Chief
                </span>
              )}
              <button
                onClick={onLeave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-semibold"
              >
                <FiLogOut size={14} /> Leave Clan
              </button>
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

      {/* Two columns: Notice Board + Members */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Notice Board */}
        <div className="xl:col-span-1 h-full">
          <Card className="h-full flex flex-col">
            <h3 className="text-section-title font-bold flex items-center gap-2 mb-4 shrink-0">
              <FiMessageSquare className="text-accent" />
              Notice Board
            </h3>
            <div className="space-y-3">
              {notices.map((notice, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-glass-border/40"
                >
                  <FiStar className="text-yellow-400 mt-0.5 shrink-0" size={14} />
                  <p className="text-sm text-primary/90 leading-relaxed">{notice}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Members List */}
        <div className="xl:col-span-2">
          <Card>
            <h3 className="text-section-title font-bold flex items-center gap-2 mb-4">
              <FiUsers className="text-accent" />
              Roster
              <span className="text-xs bg-accent/10 px-2 py-0.5 rounded-full text-accent font-black">{members.length}</span>
            </h3>
            <div className="space-y-2">
              {members.map((member, i) => {
                const isMemberChief = clan.chief?._id === member._id;
                return (
                  <motion.div
                    key={member._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between p-4 rounded-xl border border-glass-border/40 hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-glass-surface flex items-center justify-center font-bold text-accent">
                        {member.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-primary flex items-center gap-2">
                          {member.username}
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
                    <div className="flex items-center gap-2">
                      {isMemberChief ? (
                        <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded-lg font-bold">
                          CHIEF
                        </span>
                      ) : (
                        <span className="text-[10px] bg-glass-surface text-secondary px-2 py-1 rounded-lg font-medium">
                          Member
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ─── Clan Browser (when user is NOT in a clan) ───────────── */
const ClanBrowser = ({ clans, loading, userId, onApply }) => {
  const [search, setSearch] = useState('');

  const filtered = clans.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="macos-glass p-8 md:p-10 border-accent/20 bg-gradient-to-br from-purple-500/10 via-transparent to-accent/10"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2 block">
          Find Your Tribe
        </span>
        <h2 className="text-2xl md:text-4xl font-black text-primary mb-2">
          Join a Clan
        </h2>
        <p className="text-secondary text-sm max-w-lg">
          Clans let you team up, compete together, and climb the leaderboards as a unit. Apply to join — once the chief approves, you're in!
        </p>
      </motion.div>

      <div className="macos-glass p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            className="field-input pl-9"
            placeholder="Search clans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No clans found" description="Try a different search or ask admin to create one." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((clan, index) => {
            const isMember = (clan.members || []).some((m) => m._id === userId);
            return (
              <motion.div
                key={clan._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full flex flex-col group hover:border-accent/40 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-primary group-hover:text-accent transition-colors">
                        {clan.name}
                      </h3>
                      <span className="text-xs text-accent font-mono">[{clan.tag}]</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FiUsers className="text-accent" size={18} />
                    </div>
                  </div>

                  <p className="text-secondary text-sm leading-relaxed flex-1 mb-4">
                    {clan.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-secondary mb-4 pt-3 border-t border-glass-border/40">
                    <span className="flex items-center gap-1">
                      <FiUsers size={12} /> {(clan.members || []).length} members
                    </span>
                    <span className="flex items-center gap-1">
                      <FiShield size={12} /> {clan.chief?.username || 'No chief'}
                    </span>
                  </div>

                  {isMember ? (
                    <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-2 rounded-lg">
                      <FiCheckCircle size={14} /> Already a member
                    </div>
                  ) : (
                    <button
                      onClick={() => onApply(clan._id)}
                      className="btn-primary w-full text-sm"
                    >
                      Apply to Join
                    </button>
                  )}
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
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Fetch all clans
  const clansQuery = useQuery({
    queryKey: ['clans-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/clans');
        const data = res.data.data || [];
        return data.length > 0 ? data : mockClans;
      } catch {
        return mockClans;
      }
    },
  });

  // Find user's clan
  const myClan = (clansQuery.data || []).find((c) =>
    (c.members || []).some((m) => m._id === user?.id),
  );

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
    setLeaving(true);
    try {
      await api.post(`/api/clans/${myClan._id}/leave`);
      toast.success('You have left the clan.');
      setShowLeaveConfirm(false);
      updateUser({ clan: null });
      queryClient.invalidateQueries({ queryKey: ['clans-list'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave. Try again.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Clans"
        subtitle={myClan ? `You are a member of ${myClan.name}` : 'Find your tribe and compete together.'}
      />

      <AnimatePresence mode="wait">
        {myClan ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClanDashboard
              clan={myClan}
              userId={user?.id}
              onLeave={() => setShowLeaveConfirm(true)}
            />
          </motion.div>
        ) : (
          <motion.div
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
            />
          </motion.div>
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
    </div>
  );
};

export default Clans;
