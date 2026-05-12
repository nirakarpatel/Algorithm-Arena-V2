import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  FiEdit2, FiAward, FiShield, FiUsers, FiZap,
  FiStar, FiTarget, FiTrendingUp, FiClock, FiExternalLink,
  FiArrowRight, FiGithub, FiTwitter, FiLinkedin, FiGlobe,
  FiCode, FiCpu,
} from "react-icons/fi";

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
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
  <div className="group relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.03] p-3 flex flex-col items-center justify-center gap-1 hover:border-white/[0.12] hover:bg-white/[0.06] transition-all duration-300 cursor-default">
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
      <div className="h-[4px] rounded-full bg-white/[0.05] overflow-hidden">
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

  const displayBadges = badges?.length ? badges : FALLBACK_BADGES;
  const solvedPct = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <aside className="w-full xl:w-72 flex-shrink-0 space-y-4">

      {/* ── IDENTITY CARD ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg, rgba(18,18,28,0.95) 0%, rgba(12,12,22,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
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
                  ? <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(34,197,94,0.7)] z-20" />
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
                  <img src="/gdg-logo.png" className="w-2.5 h-2.5 object-contain" alt="GDG" />
                  GDG
                </span>
              </div>
            </div>
          </div>

          {/* XP Level bar */}
          <XPBar xp={xp} />

          {/* Divider */}
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

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
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

          {/* Clan */}
          {user?.clan && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FiUsers size={12} className="text-blue-400" />
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-secondary hover:text-primary hover:border-white/15 transition-all">
                  <FiGithub size={10} /> {user.github}
                </a>
              )}
              {user.twitter && (
                <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 text-[10px] text-blue-400 hover:text-blue-300 transition-all">
                  <FiTwitter size={10} /> @{user.twitter}
                </a>
              )}
              {user.linkedin && (
                <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700/[0.08] border border-blue-700/20 text-[10px] text-blue-500 hover:text-blue-400 transition-all">
                  <FiLinkedin size={10} /> LinkedIn
                </a>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/[0.06] border border-green-500/20 text-[10px] text-green-400 hover:text-green-300 transition-all">
                  <FiGlobe size={10} /> Site
                </a>
              )}
            </div>
          )}

          {/* Edit profile CTA */}
          <Link
            to="/settings"
            className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] hover:border-accent/30 transition-all text-xs font-bold text-secondary hover:text-primary"
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
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg, rgba(18,18,28,0.95) 0%, rgba(12,12,22,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
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
            <span className="text-[9px] font-black text-tertiary bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">
              {displayBadges.length}
            </span>
          </div>

          {/* Badge grid */}
          <div className="grid grid-cols-4 gap-2">
            {displayBadges.slice(0, 8).map((badge, i) => {
              const r = RARITY[badge.rarity] || RARITY.COMMON;
              return (
                <motion.div
                  key={badge._id}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 300, damping: 22 }}
                  whileHover={{ scale: 1.18, y: -2 }}
                  title={`${badge.name} — ${badge.description || badge.rarity}`}
                  className="relative aspect-square rounded-xl flex items-center justify-center text-xl cursor-help"
                  style={{
                    background: r.bg,
                    border: `1px solid ${r.border}`,
                    boxShadow: `0 0 12px rgba(${r.glow})`,
                  }}
                >
                  {badge.icon}
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black/30"
                    style={{ background: r.label }} />
                </motion.div>
              );
            })}
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

          {displayBadges.length > 8 && (
            <Link to="/badges" className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent hover:text-accent/80 transition-colors">
              View all {displayBadges.length} badges <FiArrowRight size={11} />
            </Link>
          )}
          {displayBadges.length === 0 && (
            <p className="text-[11px] text-tertiary text-center py-2">Complete challenges to unlock achievements.</p>
          )}
        </div>
      </motion.div>

      {/* ── GDG IDENTITY STRIP ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.05]"
        style={{ background: "linear-gradient(145deg, rgba(15,15,24,0.9) 0%, rgba(10,10,18,0.95) 100%)" }}
      >
        <div className="flex items-center gap-4 p-4">
          <img src="/gdg-logo.png" alt="GDG" className="w-10 h-10 object-contain flex-shrink-0" />
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
