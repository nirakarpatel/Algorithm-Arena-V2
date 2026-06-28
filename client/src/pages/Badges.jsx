import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SkeletonCard from '../components/SkeletonCard';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiCheck, FiAward, FiFilter, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import BadgeMedal from '../components/BadgeMedal';

// ── Rarity config ────────────────────────────────────────────────────────────
const RARITY = {
  COMMON: { glow: "0,0,0,0", border: "#334155", lightBorder: "#475569", bg: "#1e293b", label: "#94a3b8" },
  RARE: { glow: "59,130,246,0.5", border: "#3b82f6", lightBorder: "#2563eb", bg: "#1e3a5f", label: "#60a5fa" },
  EPIC: { glow: "168,85,247,0.55", border: "#a855f7", lightBorder: "#7e22ce", bg: "#3b1f6e", label: "#c084fc" },
  LEGENDARY: { glow: "250,204,21,0.65", border: "#facc15", lightBorder: "#a16207", bg: "#422006", label: "#fde047" },
};

// ── Earn-difficulty config ───────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  Easy:   { label: 'Easy',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  Medium: { label: 'Medium', cls: 'bg-amber-500/15   text-amber-400   border-amber-500/25'   },
  Hard:   { label: 'Hard',   cls: 'bg-rose-500/15    text-rose-400    border-rose-500/25'     },
  Elite:  { label: 'Elite',  cls: 'bg-violet-500/15  text-violet-400  border-violet-500/25'   },
};

// ── Category order ───────────────────────────────────────────────────────────
const CATEGORY_ORDER = ['Milestones', 'Streaks', 'Difficulty', 'Precision', 'Languages', 'Special', "Chief's Choice"];

// ── Helper: hex progress bar ─────────────────────────────────────────────────
const ProgressBar = ({ progress, threshold }) => {
  const pct = threshold > 0 ? Math.min(100, Math.round((progress / threshold) * 100)) : 0;
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
        <span>{progress} / {threshold}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
        />
      </div>
    </div>
  );
};

// ── Individual Badge Card ─────────────────────────────────────────────────────
const BadgeCard = ({ badge, index, onSetFeatured, isFeatured }) => {
  const isUnlocked = badge.isUnlocked;
  const isChief = badge.isChiefBadge;
  const r = RARITY[badge.rarity] || RARITY.COMMON;
  const diff = DIFFICULTY_CONFIG[badge.earnDifficulty] || DIFFICULTY_CONFIG.Medium;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.4, type: "spring", stiffness: 100 }}
      className={`relative flex flex-col items-center rounded-3xl border backdrop-blur-md transition-all duration-500 p-5 overflow-hidden group
        ${isUnlocked
          ? 'bg-gradient-to-b from-white/[0.08] to-transparent border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl'
          : 'bg-black/40 border-white/5 opacity-70'
        }`}
    >
      {/* Dynamic background rarity glow */}
      {isUnlocked && (
        <div className="absolute top-0 inset-x-0 h-40 opacity-30 pointer-events-none transition-opacity group-hover:opacity-60"
             style={{ background: `radial-gradient(circle at 50% 0%, ${r.border}, transparent 70%)` }} />
      )}

      {/* Glossy top edge highlight */}
      {isUnlocked && (
        <div className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
      )}
      {/* Chief crown badge */}
      {isChief && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ★ Chief
          </span>
        </div>
      )}

      {/* 3D Medal Component with a pedestal effect */}
      <div className="relative mt-2 mb-4">
        {/* Subtle ground shadow for the medal */}
        {isUnlocked && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/60 blur-md rounded-full pointer-events-none" />}
        <BadgeMedal rarity={badge.rarity} icon={badge.icon} isUnlocked={isUnlocked} />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center w-full flex-1 z-10">
        <h3 className={`text-[14px] font-black text-center leading-tight mb-2 tracking-wide ${
          isUnlocked ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70' : 'text-white/30'
        }`}>
          {badge.name}
        </h3>
        
        <p className="text-[10px] text-white/40 text-center leading-relaxed line-clamp-2 min-h-[2.6em] mb-3">
          {badge.description}
        </p>

        {/* Progress bar (locked only) */}
        {!isUnlocked && !isChief && badge.threshold > 1 && (
          <div className="w-full mb-3">
            <ProgressBar progress={badge.progress} threshold={badge.threshold} />
          </div>
        )}

        {/* Chief locked */}
        {!isUnlocked && isChief && (
          <p className="text-[9px] text-amber-400/60 text-center font-medium mb-3">Awarded by Clan Chief</p>
        )}

        {/* Footer tags */}
        <div className="mt-auto w-full flex items-center justify-between pt-3 border-t border-white/10">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${r.bg} ${r.text}`} style={{ color: r.label, boxShadow: isUnlocked ? `0 0 10px ${r.border}40` : 'none' }}>
            {badge.rarity}
          </span>
          {!isChief && (
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${diff.cls}`}>
              {diff.label}
            </span>
          )}
        </div>
      </div>
      
      {/* Unlocked checkmark overlay styled like a gem */}
      {isUnlocked && (
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500 border border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600">
            <FiCheck size={12} className="text-white drop-shadow-md" />
          </div>
          
          <button
            onClick={() => onSetFeatured(badge._id)}
            title={isFeatured ? "Featured Badge" : "Set as Featured Badge"}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isFeatured 
                ? 'bg-amber-500 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] bg-gradient-to-br from-amber-400 to-amber-600'
                : 'bg-black/40 border border-white/20 hover:bg-amber-500/30 hover:border-amber-500/50 text-white/50 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
          >
            <FiStar size={12} className={isFeatured ? 'text-white drop-shadow-md fill-white' : 'fill-current'} />
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ── Category Section ──────────────────────────────────────────────────────────
const CategorySection = ({ category, badges, index, onSetFeatured, featuredBadgeId }) => {

  const unlocked = badges.filter(b => b.isUnlocked).length;
  const isComplete = unlocked === badges.length;

  const CATEGORY_ICONS = {
    'Milestones':    '🎯',
    'Streaks':       '🔥',
    'Difficulty':    '⚡',
    'Precision':     '🎯',
    'Languages':     '🌐',
    'Special':       '✨',
    "Chief's Choice":'👑',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{CATEGORY_ICONS[category] || '🏅'}</span>
        <h2 className="text-base font-bold text-white">{category}</h2>
        <div className="flex items-center gap-1.5 ml-1">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
            isComplete
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
              : 'bg-white/5 text-white/40 border-white/10'
          }`}>
            {unlocked} / {badges.length}
          </span>
          {isComplete && <FiCheck size={12} className="text-emerald-400" />}
        </div>
        <div className="flex-1 h-px bg-white/5 ml-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {badges.map((badge, i) => (
          <BadgeCard 
            key={badge._id} 
            badge={badge} 
            index={i} 
            onSetFeatured={onSetFeatured}
            isFeatured={featuredBadgeId === badge._id?.toString()}
          />
        ))}
      </div>
    </motion.section>
  );
};

// ── Main Badges Page ──────────────────────────────────────────────────────────
const Badges = () => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showUnlocked, setShowUnlocked] = useState(null); // null=all, true=unlocked, false=locked

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await api.get('/api/badges');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // We actually need the user's featuredBadge ID.
  // We can fetch it via /api/profile/stats which returns user info or /api/auth/me
  // Wait, the currently logged in user is in auth context. But we can just use the auth/me endpoint or profile
  const { data: authUser } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // featuredBadge may be a populated object or a raw ID string
  const featuredBadgeId = authUser?.featuredBadge?._id
    ? authUser.featuredBadge._id.toString()
    : authUser?.featuredBadge?.toString() || null;

  const setFeaturedMutation = useMutation({
    mutationFn: async (badgeId) => {
      await api.put('/api/profile/featured-badge', { badgeId });
    },
    onSuccess: () => {
      toast.success('Featured badge updated!');
      queryClient.invalidateQueries(['authUser']);
      queryClient.invalidateQueries(['profile-stats']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update featured badge'),
  });

  // Group badges by category
  const groupedBadges = useMemo(() => {
    const groups = {};
    badges.forEach(b => {
      const cat = b.isChiefBadge ? "Chief's Choice" : (b.category || 'Special');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return groups;
  }, [badges]);

  // Categories for filter tabs
  const categories = useMemo(() => {
    return ['All', ...CATEGORY_ORDER.filter(c => groupedBadges[c])];
  }, [groupedBadges]);

  // Stats
  const totalUnlocked = badges.filter(b => b.isUnlocked).length;
  const totalBadges = badges.length;
  const pct = totalBadges > 0 ? Math.round((totalUnlocked / totalBadges) * 100) : 0;

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const result = {};
    Object.entries(groupedBadges).forEach(([cat, catBadges]) => {
      if (activeCategory !== 'All' && cat !== activeCategory) return;
      const filtered = showUnlocked === null ? catBadges : catBadges.filter(b => b.isUnlocked === showUnlocked);
      if (filtered.length > 0) result[cat] = filtered;
    });
    return result;
  }, [groupedBadges, activeCategory, showUnlocked]);

  return (
    <div className="min-h-screen pb-24 space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Achievement Vault"
        subtitle="Your collection of earned honors and milestones."
        showBack={true}
      />

      {/* Progress Overview Card */}
      {!isLoading && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <FiAward size={22} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{totalUnlocked} <span className="text-white/30 text-base font-normal">/ {totalBadges}</span></p>
                <p className="text-sm text-white/50">Badges unlocked</p>
              </div>
            </div>
            <div className="flex-1 max-w-xs space-y-1.5">
              <div className="flex justify-between text-xs text-white/50">
                <span>Overall Progress</span>
                <span className="font-mono font-bold text-white/70">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-accent text-white border-accent shadow-sm shadow-accent/30'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 sm:ml-auto">
            {[
              { label: 'All', val: null },
              { label: '✓ Earned', val: true },
              { label: '🔒 Locked', val: false },
            ].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setShowUnlocked(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                  showUnlocked === val
                    ? 'bg-white/15 text-white border-white/25'
                    : 'bg-white/5 text-white/40 border-white/8 hover:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Badge Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div className="space-y-10">
            {CATEGORY_ORDER.filter(cat => filteredGroups[cat]).map((cat, idx) => (
              <CategorySection
                key={cat}
                category={cat}
                badges={filteredGroups[cat]}
                index={idx}
                onSetFeatured={setFeaturedMutation.mutate}
                featuredBadgeId={featuredBadgeId}
              />
            ))}
            {Object.keys(filteredGroups).length === 0 && (
              <div className="text-center py-20 text-white/30">
                <FiAward size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No badges match this filter.</p>
              </div>
            )}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Badges;
