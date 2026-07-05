import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FiEdit2, FiAward, FiShield, FiUsers, FiZap,
  FiStar, FiTarget, FiTrendingUp, FiClock, FiExternalLink,
  FiArrowRight, FiGithub, FiTwitter, FiLinkedin, FiGlobe,
  FiCode, FiCpu, FiChevronLeft, FiChevronRight, FiX, FiShare2
} from "react-icons/fi";
import toast from "react-hot-toast";
import Logo from "./Logo";
import { useAuth } from "../context/useAuth";
import ClanHoverCard from "./ClanHoverCard";

/* ── Rarity configs ─────────────────────────────────────── */
const RARITY = {
  COMMON: { glow: "0,0,0,0", border: "#334155", lightBorder: "#475569", bg: "#1e293b", label: "#94a3b8" },
  RARE: { glow: "59,130,246,0.5", border: "#3b82f6", lightBorder: "#2563eb", bg: "#1e3a5f", label: "#60a5fa" },
  EPIC: { glow: "168,85,247,0.55", border: "#a855f7", lightBorder: "#7e22ce", bg: "#3b1f6e", label: "#c084fc" },
  LEGENDARY: { glow: "250,204,21,0.65", border: "#facc15", lightBorder: "#a16207", bg: "#422006", label: "#fde047" },
};

const PRESTIGE_ORDER = { LEGENDARY: 3, EPIC: 2, RARE: 1, COMMON: 0 };

const FALLBACK_BADGES = [
  { _id: "b1", name: "First Blood", icon: "🩸", rarity: "COMMON", description: "First successful submission" },
  { _id: "b2", name: "Night Owl", icon: "🦉", rarity: "RARE", description: "Solved between 12am–4am" },
  { _id: "b3", name: "Flawless", icon: "✨", rarity: "EPIC", description: "First-attempt perfect solve" },
  { _id: "b4", name: "Algorithm Master", icon: "👑", rarity: "LEGENDARY", description: "100 problems solved" },
];

/* ── XP Level helper ─────────────────────────────────────── */
const XP_PER_LEVEL = 500;
const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

/* ── Animated XP bar ─────────────────────────────────────── */
const XPBar = ({ xp, loginXp = 0, challengeXp = 0, loginCount = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const currentLevelXp = xp % XP_PER_LEVEL;
  const pct = (currentLevelXp / XP_PER_LEVEL) * 100;
  const lvl = getLevel(xp);

  const loginRatio = xp > 0 ? loginXp / xp : 0;

  return (
    <div ref={ref} className="space-y-1.5 relative group">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-tertiary">Level {lvl}</span>
        <span style={{ color: "rgb(var(--accent-rgb))" }}>{currentLevelXp} / {XP_PER_LEVEL} XP</span>
      </div>

      {/* XP Breakdown Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-black/90 dark:bg-white/90 text-white dark:text-black text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl shadow-black/20 text-center flex flex-col gap-1 pointer-events-none">
        <div className="flex justify-between gap-4">
          <span className="text-[#3b82f6]">Daily Login XP:</span>
          <span>{loginXp} XP ({loginCount} days)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#ec4899]">Challenges XP:</span>
          <span>{challengeXp} XP</span>
        </div>
        <div className="mt-1 pt-1 border-t border-white/20 dark:border-black/20 flex justify-between gap-4">
          <span className="text-white/60 dark:text-black/60">Total XP:</span>
          <span>{xp} XP</span>
        </div>
        {/* Little triangle pointing down */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90 dark:border-t-white/90" />
      </div>

      <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden flex">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, #3b82f6 0%, #a855f7 ${loginRatio * 100}%, #ec4899 100%)`,
            boxShadow: `0 0 10px rgba(168,85,247,0.5)`
          }}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${pct}%` : 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-tertiary">
        <span>{XP_PER_LEVEL - currentLevelXp} XP to Level {lvl + 1}</span>
      </div>
    </div>
  );
};

/* ── Animated counter stat ───────────────────────────────── */
const StatPill = ({ icon: Icon, value, label, color, sublabel }) => (
  <div className="group relative rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-3 flex flex-col items-center justify-center gap-1 hover:border-black/[0.12] dark:hover:border-white/[0.12] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-300 cursor-default">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style={{ background: `radial-gradient(circle at center, rgba(var(--accent-rgb),0.06) 0%, transparent 70%)` }} />
    <Icon size={13} className={`${color} relative z-10`} />
    <span className={`text-sm font-black ${color} relative z-10`}>{value}</span>
    <span className="text-[9px] uppercase tracking-widest text-tertiary font-bold text-center leading-tight relative z-10">{label}</span>
    {sublabel && <span className="text-[8px] text-tertiary/60 relative z-10">{sublabel}</span>}
  </div>
);

/* ── Diff Bar ────────────────────────────────────────────── */
const DiffBar = ({ label, solved, total, color, delay }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div ref={ref} className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono text-tertiary">{solved}<span className="text-tertiary/50">/{total}</span></span>
      </div>
      <div className="h-[4px] rounded-full bg-black/[0.05] dark:bg-white/[0.05] overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${pct}%` : 0 }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }} />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   PROFILE SIDEBAR
   ══════════════════════════════════════════════════════════ */
const ProfileSidebar = ({ user, summary, profile, badges }) => {
  const initials = (user?.username || "?")[0].toUpperCase();
  const solved = summary?.solved ?? profile?.stats?.acceptedCount ?? profile?.acceptedCount ?? 0;
  const total = summary?.totalChallenges ??
    (profile?.difficultyBreakdown ?
      (profile.difficultyBreakdown.easy.total +
        profile.difficultyBreakdown.medium.total +
        profile.difficultyBreakdown.hard.total)
      : 0);
  const pending = summary?.pending ?? profile?.stats?.pendingCount ?? profile?.pendingCount ?? 0;
  const streak = profile?.streak ?? 0;
  const maxStreak = profile?.maxStreak ?? 0;
  const xp = profile?.stats?.totalPoints ?? profile?.totalPoints ?? 0;
  const loginXp = profile?.stats?.loginXp ?? profile?.loginXp ?? 0;
  const challengeXp = profile?.stats?.challengeXp ?? profile?.challengeXp ?? 0;
  const loginCount = profile?.stats?.loginCount ?? profile?.loginCount ?? 0;
  const rank = profile?.rank ?? "—";
  const roleName = user?.customTitle || (user?.role === "admin" ? "Admin"
    : user?.role === "clan-chief" ? "Clan Chief"
      : "Member");

  const { user: authUser } = useAuth();
  const isOwnProfile = authUser?.username === user?.username;

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${user?.username}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!", {
      style: {
        background: '#1e293b',
        color: '#fff',
        border: '1px solid rgba(168,85,247,0.3)',
      },
      iconTheme: {
        primary: '#a855f7',
        secondary: '#fff',
      },
    });
  };

  const clanBadgeCount = React.useMemo(() => {
    return (badges || []).filter(b => b.isChiefBadge && b.isUnlocked).length;
  }, [badges]);

  const sortedBadges = React.useMemo(() => {
    const baseBadges = badges?.length
      ? badges
      : FALLBACK_BADGES.map(b => ({ ...b, isUnlocked: true }));

    return [...baseBadges].sort((a, b) => {
      // Unlocked first
      const statusA = a.isUnlocked ? 1 : 0;
      const statusB = b.isUnlocked ? 1 : 0;
      if (statusA !== statusB) {
        return statusB - statusA;
      }
      // Prestige order (Legendary > Epic > Rare > Common)
      const prestigeA = PRESTIGE_ORDER[a.rarity] || 0;
      const prestigeB = PRESTIGE_ORDER[b.rarity] || 0;
      if (prestigeA !== prestigeB) {
        return prestigeB - prestigeA;
      }
      // Name fallback
      return a.name.localeCompare(b.name);
    });
  }, [badges]);



  const solvedPct = total > 0 ? Math.round((solved / total) * 100) : 0;

  const [scrollIndex, setScrollIndex] = React.useState(0);
  const visibleBadges = React.useMemo(() => {
    return sortedBadges.slice(scrollIndex, scrollIndex + 4);
  }, [sortedBadges, scrollIndex]);

  const handlePrev = () => {
    setScrollIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setScrollIndex(prev => Math.min(sortedBadges.length - 4, prev + 1));
  };

  return (
    <aside className="w-full xl:w-72 flex-shrink-0 space-y-4">

      {/* ── IDENTITY CARD ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-[var(--glass-surface)] shadow-lg"
      >
        {/* Animated top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.8), rgba(168,85,247,0.6), transparent)" }} />

        {/* Corner glow orbs */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.15) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)" }} />

        <div className="relative z-10 p-5 space-y-4">
          {/* Avatar + name row */}
          <div className="flex items-start gap-4">
            {/* Animated spinning ring avatar */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-[2.5px] rounded-full pointer-events-none"
                style={{
                  background: "conic-gradient(from 0deg, rgba(var(--accent-rgb),0.9), rgba(168,85,247,0.7), transparent, rgba(var(--accent-rgb),0.9))",
                  borderRadius: "50%",
                }}
              />
              <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white overflow-hidden z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.7), rgba(168,85,247,0.7))",
                  boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.35)",
                }}
              >
                {user?.profilePicture
                  ? <img src={user.profilePicture} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[var(--bg-app)] shadow-[0_0_8px_rgba(34,197,94,0.7)] z-20" />
            </div>

            {/* Name + role badges */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-base font-black text-primary leading-tight truncate">{user?.username || "Operative"}</h2>
              <p className="text-[10px] text-secondary mt-0.5 truncate">{user?.email || ""}</p>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${user?.customTitle
                      ? "border-cyan-600/30 bg-cyan-600/10 text-cyan-700 dark:border-cyan-400/50 dark:bg-cyan-400/15 dark:text-cyan-400 dark:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      : ""
                    }`}
                  style={!user?.customTitle ? {
                    borderColor: "rgba(var(--accent-rgb),0.4)",
                    background: "rgba(var(--accent-rgb),0.1)",
                    color: "rgb(var(--accent-rgb))",
                  } : undefined}
                >
                  <FiShield size={7} /> {roleName}
                </span>
                {solvedPct >= 50 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                    <FiStar size={7} /> Elite
                  </span>
                )}
                {/* GDG badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/[0.04] text-tertiary">
                  <Logo variant="gdg" size="w-2.5 h-2.5" />
                  GDG
                </span>
              </div>
            </div>
          </div>

          {/* Social links — all clickable */}
          {(user?.github || user?.twitter || user?.linkedin || user?.website) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {user.github && (
                <a href={`https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] text-[10px] text-secondary hover:text-primary hover:border-black/15 dark:hover:border-white/15 transition-all">
                  <FiGithub size={10} /> {user.github}
                </a>
              )}
              {user.twitter && (
                <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-all">
                  <FiTwitter size={10} /> @{user.twitter}
                </a>
              )}
              {user.linkedin && (
                <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700/[0.08] border border-blue-700/20 text-[10px] text-blue-700 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all">
                  <FiLinkedin size={10} />
                </a>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/[0.06] border border-green-500/20 text-[10px] text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-all">
                  <FiGlobe size={10} /> Site
                </a>
              )}
            </div>
          )}

          {/* XP Level bar */}
          <XPBar xp={xp} loginXp={loginXp} challengeXp={challengeXp} loginCount={loginCount} />

          {/* Divider */}
          <div className="h-px bg-black/[0.08] dark:bg-white/[0.08]" />

          {/* Stats section */}
          <div className="flex flex-col gap-2">
            {/* Global Rank Landscape Bar */}
            <div className="group relative rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent p-4 flex items-center justify-between hover:border-yellow-400/30 hover:bg-yellow-500/10 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                  <FiStar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-tertiary leading-tight">Global Rank</p>
                  <p className="text-[10px] text-secondary font-medium mt-0.5">Arena Standing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">{rank !== "—" ? `#${rank}` : "—"}</p>
              </div>
            </div>

            {/* Remaining 4 stats in a 2x2 grid */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <StatPill icon={FiTarget} value={`${solved}/${total}`} label="Solved" color="text-green-400" />
              <StatPill icon={FiZap} value={`${streak}d`} label="Streak" color="text-accent" sublabel={maxStreak > 0 ? `best ${maxStreak}d` : undefined} />
              <StatPill icon={FiClock} value={pending} label="Pending" color="text-orange-400" />
              <StatPill icon={FiAward} value={clanBadgeCount} label="Clan Badges" color="text-amber-500" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-black/[0.08] dark:bg-white/[0.08]" />

          {/* Clan */}
          {user?.clan && (() => {
            const clanId = user.clan?._id || user.clan;
            const clanName = user.clan?.name || user.clan;
            return (
              <ClanHoverCard clanId={clanId} className="w-full">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:border-accent/40 transition-all w-full text-left">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FiUsers size={12} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-tertiary uppercase tracking-widest font-black">Clan</p>
                    <p className="text-sm font-bold text-primary truncate hover:text-accent transition-colors">{clanName}</p>
                  </div>
                </div>
              </ClanHoverCard>
            );
          })()}
          {/* Actions CTA */}
          <div className="flex gap-2 w-full">
            {isOwnProfile && (
              <Link
                to="/settings"
                className="group flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-accent/30 transition-all text-xs font-bold text-secondary hover:text-primary"
              >
                <FiEdit2 size={11} className="group-hover:text-accent transition-colors" />
                Edit
              </Link>
            )}
            <button
              onClick={handleShare}
              className={`group flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-accent/30 transition-all text-xs font-bold text-secondary hover:text-primary ${isOwnProfile ? 'flex-1' : 'w-full'}`}
            >
              <FiShare2 size={11} className="group-hover:text-accent transition-colors" />
              Share
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── ACHIEVEMENTS CARD ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-[var(--glass-surface)] shadow-lg"
      >
        {/* Gold glow at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.6), rgba(168,85,247,0.4), transparent)" }} />
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(250,204,21,0.06) 0%, transparent 70%)" }} />

        <div className="relative z-10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
              <FiAward size={12} className="text-yellow-400" /> Achievements
            </h3>
            <Link
              to="/badges"
              className="text-[9px] font-black text-tertiary bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-full px-2 py-0.5 hover:text-accent hover:border-accent/30 transition-colors"
            >
              {sortedBadges.filter(b => b.isUnlocked).length} / {sortedBadges.length}
            </Link>
          </div>

          {/* Badge grid with Slider */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              disabled={scrollIndex === 0}
              className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center text-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            >
              <FiChevronLeft size={14} />
            </button>

            <div className="flex-1 grid grid-cols-4 gap-2">
              {visibleBadges.map((badge, i) => {
                const r = RARITY[badge.rarity] || RARITY.COMMON;
                const isUnlocked = badge.isUnlocked;
                return (
                  <motion.div
                    key={badge._id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={isUnlocked ? {
                      scale: 1,
                      opacity: 1,
                      boxShadow: [
                        `0 0 10px rgba(${r.glow})`,
                        `0 0 25px rgba(${r.glow})`,
                        `0 0 10px rgba(${r.glow})`
                      ]
                    } : {
                      scale: 1,
                      opacity: 1
                    }}
                    transition={isUnlocked ? {
                      boxShadow: {
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut"
                      },
                      scale: { type: "spring", stiffness: 300, damping: 22 }
                    } : {}}
                    whileHover={{ scale: 1.18, y: -2 }}
                    title={`${badge.name} — ${badge.description || badge.rarity} ${isUnlocked ? '(Achieved)' : '(Locked)'}`}
                    className="group relative aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-300 overflow-hidden cursor-help"
                    style={{
                      background: r.bg,
                      border: isUnlocked
                        ? `2px solid ${r.border}`
                        : `1px solid ${r.border}44`,
                    }}
                  >
                    {badge.icon}
                    {isUnlocked && (
                      <>
                        {/* Aura Ring Light */}
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: `inset 0 0 12px ${r.border}` }} />

                        {/* Shining sweeping line */}
                        <motion.div
                          className="absolute top-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none -skew-x-12"
                          initial={{ x: "-150%" }}
                          animate={{ x: "150%" }}
                          transition={{
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 2,
                            ease: "linear",
                            delay: i * 0.2
                          }}
                        />
                        {/* Status dot in corner */}
                        <div 
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white/30 pointer-events-none" 
                          style={{
                            backgroundColor: r.border,
                            boxShadow: `0 0 8px ${r.border}`
                          }}
                        />
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              disabled={scrollIndex >= sortedBadges.length - 4}
              className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center text-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            >
              <FiChevronRight size={14} />
            </button>
          </div>

          {/* Rarity legend */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(RARITY).map(([key, val]) => {
              const colors = {
                COMMON: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50",
                RARE: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
                EPIC: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30",
                LEGENDARY: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30",
              }[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: val.border }} />
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-black ${colors}`}>
                    {key}
                  </span>
                </div>
              );
            })}
          </div>

          <Link
            to="/badges"
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent hover:text-accent/80 transition-colors w-full mt-2"
          >
            View all achievements <FiArrowRight size={11} />
          </Link>
          {sortedBadges.length === 0 && (
            <p className="text-[11px] text-tertiary text-center py-2">Complete challenges to unlock achievements.</p>
          )}
        </div>
      </motion.div>

      {/* ── GDG IDENTITY STRIP ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-[var(--glass-surface)] shadow-md"
      >
        <div className="flex items-center gap-4 p-4">
          <Logo variant="hybrid" size="w-10 h-10" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">Powered by</p>
            <p className="text-sm font-black text-primary leading-tight">Google Developer Group</p>
            <p className="text-[10px] text-tertiary">@SOA, ITER Chapter</p>
          </div>
        </div>
      </motion.div>

    </aside>
  );
};

export default ProfileSidebar;
