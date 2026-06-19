import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FiEdit2, FiAward, FiShield, FiUsers, FiZap,
  FiStar, FiTarget, FiTrendingUp, FiClock, FiExternalLink,
  FiArrowRight, FiGithub, FiTwitter, FiLinkedin, FiGlobe,
  FiCode, FiCpu, FiChevronLeft, FiChevronRight, FiX,
} from "react-icons/fi";
import Logo from "./Logo";

/* ── Rarity configs ─────────────────────────────────────── */
const RARITY = {
  COMMON:    { glow: "0,0,0,0",         border: "#334155", bg: "#1e293b", label: "#94a3b8" },
  RARE:      { glow: "59,130,246,0.5",  border: "#3b82f6", bg: "#1e3a5f", label: "#60a5fa" },
  EPIC:      { glow: "168,85,247,0.55", border: "#a855f7", bg: "#3b1f6e", label: "#c084fc" },
  LEGENDARY: { glow: "250,204,21,0.65", border: "#facc15", bg: "#422006", label: "#fde047" },
};

const FALLBACK_BADGES = [
  { _id: "b1", name: "First Blood",      icon: "🩸", rarity: "COMMON",    description: "First successful submission" },
  { _id: "b2", name: "Night Owl",        icon: "🦉", rarity: "RARE",      description: "Solved between 12am–4am" },
  { _id: "b3", name: "Flawless",         icon: "✨", rarity: "EPIC",      description: "First-attempt perfect solve" },
  { _id: "b4", name: "Algorithm Master", icon: "👑", rarity: "LEGENDARY", description: "100 problems solved" },
];

/* ── XP Level helper ─────────────────────────────────────── */
const XP_PER_LEVEL = 500;
const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;
const getLevelPct = (xp) => ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

/* ── Animated XP bar ─────────────────────────────────────── */
const XPBar = ({ xp }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pct = getLevelPct(xp);
  const lvl = getLevel(xp);
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-tertiary">Level {lvl}</span>
        <span style={{ color: "rgb(var(--accent-rgb))" }}>{xp} XP</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(var(--accent-rgb),0.9), rgba(168,85,247,0.9))",
            boxShadow: "0 0 10px rgba(var(--accent-rgb),0.5)",
          }}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${pct}%` : 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-tertiary">
        {XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to Level {lvl + 1}
      </p>
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
  const solved   = summary?.solved ?? profile?.acceptedCount ?? 0;
  const total    = summary?.totalChallenges ?? 0;
  const pending  = summary?.pending ?? profile?.pendingCount ?? 0;
  const streak   = profile?.streak ?? 0;
  const maxStreak = profile?.maxStreak ?? 0;
  const xp       = profile?.totalPoints ?? 0;
  const rank     = profile?.rank ?? "—";
  const roleName = user?.role === "admin" ? "Admin"
    : user?.role === "clan-chief" ? "Clan Chief"
    : "Member";

  const easy   = profile?.difficultyBreakdown?.easy   ?? { solved: 0, total: 0 };
  const medium = profile?.difficultyBreakdown?.medium ?? { solved: 0, total: 0 };
  const hard   = profile?.difficultyBreakdown?.hard   ?? { solved: 0, total: 0 };

  const PRESTIGE_ORDER = { LEGENDARY: 3, EPIC: 2, RARE: 1, COMMON: 0 };
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
  }, [badges, PRESTIGE_ORDER]);

  const [showModal, setShowModal] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("rarity-desc");

  const modalBadges = React.useMemo(() => {
    let filtered = [...sortedBadges];
    if (statusFilter === "achieved") {
      filtered = filtered.filter(b => b.isUnlocked);
    } else if (statusFilter === "locked") {
      filtered = filtered.filter(b => !b.isUnlocked);
    }

    return [...filtered].sort((a, b) => {
      // If filtering "all", achieved badges always go first
      if (statusFilter === "all") {
        const statusA = a.isUnlocked ? 1 : 0;
        const statusB = b.isUnlocked ? 1 : 0;
        if (statusA !== statusB) {
          return statusB - statusA;
        }
      }

      // Rarity comparison
      const prestigeA = PRESTIGE_ORDER[a.rarity] || 0;
      const prestigeB = PRESTIGE_ORDER[b.rarity] || 0;
      if (prestigeA !== prestigeB) {
        return sortBy === "rarity-desc" ? prestigeB - prestigeA : prestigeA - prestigeB;
      }

      return a.name.localeCompare(b.name);
    });
  }, [sortedBadges, statusFilter, sortBy, PRESTIGE_ORDER]);

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
              <p className="text-[10px] text-tertiary mt-0.5 font-mono truncate">{user?.email || ""}</p>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                  style={{
                    borderColor: "rgba(var(--accent-rgb),0.4)",
                    background: "rgba(var(--accent-rgb),0.1)",
                    color: "rgb(var(--accent-rgb))",
                  }}
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

          {/* XP Level bar */}
          <XPBar xp={xp} />

          {/* Divider */}
          <div className="h-px bg-black/[0.08] dark:bg-white/[0.08]" />

          {/* Stats 2×2 grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatPill icon={FiTarget}     value={`${solved}/${total}`} label="Solved"       color="text-green-400" />
            <StatPill icon={FiStar}       value={rank !== "—" ? `#${rank}` : "—"}  label="Global Rank"  color="text-yellow-400" />
            <StatPill icon={FiZap}        value={`${streak}d`}          label="Streak"       color="text-accent" sublabel={maxStreak > 0 ? `best ${maxStreak}d` : undefined} />
            <StatPill icon={FiClock}      value={pending}               label="Pending"      color="text-orange-400" />
          </div>

          {/* Diff bars */}
          <div className="space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tertiary">Difficulty Breakdown</p>
            <DiffBar label="Easy"   solved={easy.solved}   total={easy.total}   color="#22c55e" delay={0.1} />
            <DiffBar label="Medium" solved={medium.solved} total={medium.total} color="#eab308" delay={0.2} />
            <DiffBar label="Hard"   solved={hard.solved}   total={hard.total}   color="#ef4444" delay={0.3} />
          </div>

          {/* Divider */}
          <div className="h-px bg-black/[0.08] dark:bg-white/[0.08]" />

          {/* Clan */}
          {user?.clan && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FiUsers size={12} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-tertiary uppercase tracking-widest font-black">Clan</p>
                <p className="text-sm font-bold text-primary truncate">{user.clan?.name || user.clan}</p>
              </div>
            </div>
          )}

          {/* Social links — all clickable */}
          {(user?.github || user?.twitter || user?.linkedin || user?.website) && (
            <div className="flex flex-wrap gap-1.5">
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
                  <FiLinkedin size={10} /> LinkedIn
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

          {/* Edit profile CTA */}
          <Link
            to="/settings"
            className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-accent/30 transition-all text-xs font-bold text-secondary hover:text-primary"
          >
            <FiEdit2 size={11} className="group-hover:text-accent transition-colors" />
            Edit Profile
            <FiExternalLink size={10} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
          </Link>
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
            <button
              onClick={() => setShowModal(true)}
              className="text-[9px] font-black text-tertiary bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-full px-2 py-0.5 hover:text-accent hover:border-accent/30 transition-colors"
            >
              {sortedBadges.filter(b => b.isUnlocked).length} / {sortedBadges.length}
            </button>
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
                        "0 0 8px rgba(250, 204, 21, 0.3)",
                        "0 0 18px rgba(250, 204, 21, 0.7)",
                        "0 0 8px rgba(250, 204, 21, 0.3)"
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
                        ? "2px solid #facc15" 
                        : `1px solid ${r.border}`,
                    }}
                  >
                    {badge.icon}
                    {isUnlocked && (
                      <>
                        {/* Shining sweeping line */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none -skew-x-12"
                          initial={{ x: "-150%" }}
                          animate={{ x: "150%" }}
                          transition={{
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 2.2,
                            ease: "linear",
                            delay: i * 0.2
                          }}
                        />
                        {/* Status dot in corner */}
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black/30 bg-[#facc15] shadow-[0_0_6px_#facc15]" />
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
            {Object.entries(RARITY).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: val.label }} />
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: val.label }}>{key}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent hover:text-accent/80 transition-colors w-full mt-2"
          >
            View all achievements <FiArrowRight size={11} />
          </button>
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

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-white/10 bg-white dark:bg-[#0f172a] text-black dark:text-white shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/85">
                <div className="flex items-center gap-2.5">
                  <FiAward className="text-yellow-400 text-xl" />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-white">All Achievements</h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {sortedBadges.filter(b => b.isUnlocked).length} achieved of {sortedBadges.length} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Filters & Sorting */}
              <div className="px-5 py-3.5 bg-slate-900/50 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                {/* Status Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  {[
                    { id: "all", label: "All" },
                    { id: "achieved", label: "Achieved" },
                    { id: "locked", label: "Locked" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        statusFilter === tab.id
                          ? "bg-accent text-white shadow-md shadow-accent/20"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sort By</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer focus:border-accent/50 transition-colors"
                  >
                    <option value="rarity-desc">Rarity: High to Low</option>
                    <option value="rarity-asc">Rarity: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Content Grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-slate-950/20">
                {modalBadges.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <span className="text-3xl">🔒</span>
                    <p className="text-sm font-bold">No badges matching this filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modalBadges.map((badge, i) => {
                      const r = RARITY[badge.rarity] || RARITY.COMMON;
                      const isUnlocked = badge.isUnlocked;
                      return (
                        <div
                          key={badge._id}
                          className="relative rounded-xl p-3.5 flex gap-3.5 border transition-all duration-300 overflow-hidden min-h-[80px] items-center pr-12"
                          style={{
                            background: isUnlocked ? `${r.bg}55` : "rgba(255,255,255,0.01)",
                            borderColor: isUnlocked ? "#facc15" : `${r.border}44`,
                            boxShadow: isUnlocked ? `0 0 15px rgba(${r.glow})` : "none",
                          }}
                        >
                          {/* Left Icon box */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 relative overflow-hidden"
                            style={{
                              background: r.bg,
                              border: isUnlocked ? "2px solid #facc15" : `1px solid ${r.border}`,
                            }}
                          >
                            {badge.icon}
                            {isUnlocked && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none -skew-x-12"
                                initial={{ x: "-150%" }}
                                animate={{ x: "150%" }}
                                transition={{
                                  repeat: Infinity,
                                  repeatType: "loop",
                                  duration: 2.2,
                                  ease: "linear",
                                  delay: i * 0.15
                                }}
                              />
                            )}
                          </div>

                          {/* Right Info Box */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-black tracking-tight text-black dark:text-white leading-none">
                                {badge.name}
                              </h4>
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none shrink-0"
                                style={{ background: `${r.border}33`, color: r.label }}
                              >
                                {badge.rarity}
                              </span>
                            </div>
                            <p className="text-xs text-black dark:text-slate-400 line-clamp-2 leading-tight">
                              {badge.description || "No description provided."}
                            </p>
                          </div>

                          {/* Unlocked marker or status tag */}
                          <div className="absolute top-2 right-2 shrink-0">
                            {isUnlocked ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#facc15] bg-[#facc15]/10 border border-[#facc15]/20 px-1.5 py-0.5 rounded-full leading-none">
                                Achieved
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full leading-none">
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Footer Action */}
              <div className="p-4 border-t border-white/10 bg-slate-900/85 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </aside>
  );
};

export default ProfileSidebar;
