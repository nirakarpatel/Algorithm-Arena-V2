import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiActivity, FiCpu, FiArrowRight, FiZap, FiAward, FiFilter } from "react-icons/fi";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";
import SkeletonCard from "../components/SkeletonCard";
import ProfileSidebar from "../components/ProfileSidebar";
import ActivityHeatmap from "../components/ActivityHeatmap";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  if (h >= 17 && h < 21) return "Good Evening";
  return "Good Night";
};

const fd = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" },
});

const DiffBar = ({ label, solved, total, color }) => {
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono text-tertiary">{solved}<span className="text-tertiary/50">/{total}</span> <span className="text-black/20 dark:text-white/20 ml-1">{Math.round(pct)}%</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.05] overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }} />
      </div>
    </div>
  );
};

const RARITY = {
  COMMON:    { glow: "0,0,0,0",         border: "#334155", bg: "#1e293b", label: "#94a3b8" },
  RARE:      { glow: "59,130,246,0.5",  border: "#3b82f6", bg: "#1e3a5f", label: "#60a5fa" },
  EPIC:      { glow: "168,85,247,0.55", border: "#a855f7", bg: "#3b1f6e", label: "#c084fc" },
  LEGENDARY: { glow: "250,204,21,0.65", border: "#facc15", bg: "#422006", label: "#fde047" },
};

const PRESTIGE_ORDER = { LEGENDARY: 3, EPIC: 2, RARE: 1, COMMON: 0 };

const FALLBACK_BADGES = [
  { _id: "b1", name: "First Blood",      icon: "🩸", rarity: "COMMON",    description: "First successful submission" },
  { _id: "b2", name: "Night Owl",        icon: "🦉", rarity: "RARE",      description: "Solved between 12am–4am" },
  { _id: "b3", name: "Flawless",         icon: "✨", rarity: "EPIC",      description: "First-attempt perfect solve" },
  { _id: "b4", name: "Algorithm Master", icon: "👑", rarity: "LEGENDARY", description: "100 problems solved" },
];

const Profile = () => {
  const { user } = useAuth();
  const { username } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rarity-desc");

  const profileQ = useQuery({
    queryKey: ["full-profile-stats", username || "me"],
    queryFn: async () => {
      const endpoint = username 
        ? `/api/profile/username/${username}` 
        : `/api/profile/stats`;
      const res = await api.get(endpoint);
      return res.data.data;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const subsQ = useQuery({
    queryKey: ["full-profile-submissions", username || "me"],
    queryFn: async () => {
      const endpoint = username 
        ? `/api/submissions/user/${username}?limit=100` 
        : `/api/submissions/my-submissions?limit=100`;
      const res = await api.get(endpoint);
      return res.data.data || [];
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const submissions = useMemo(() => subsQ.data || [], [subsQ.data]);

  const recentSubs = useMemo(() => {
    return [...submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 8);
  }, [submissions]);

  const profile = profileQ.data || {};
  const displayUser = username ? profile : user;

  const sortedBadges = useMemo(() => {
    const baseBadges = profile.badges?.length 
      ? profile.badges 
      : FALLBACK_BADGES.map(b => ({ ...b, isUnlocked: true }));

    let filtered = [...baseBadges];
    if (statusFilter === "achieved") {
      filtered = filtered.filter(b => b.isUnlocked);
    } else if (statusFilter === "locked") {
      filtered = filtered.filter(b => !b.isUnlocked);
    }

    return filtered.sort((a, b) => {
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
  }, [profile.badges, statusFilter, sortBy]);

  if (profileQ.isLoading || subsQ.isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8">
        <SkeletonCard className="w-full lg:w-72 h-[600px] !rounded-2xl shrink-0" />
        <div className="flex-1 space-y-6">
          <SkeletonCard className="w-full h-32 !rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard className="w-full h-48 !rounded-2xl" />
            <SkeletonCard className="w-full h-48 !rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const easy = profile?.difficultyBreakdown?.easy ?? { solved: 0, total: 0 };
  const medium = profile?.difficultyBreakdown?.medium ?? { solved: 0, total: 0 };
  const hard = profile?.difficultyBreakdown?.hard ?? { solved: 0, total: 0 };

  const solved = profile?.acceptedCount ?? 0;
  const total = (easy.total + medium.total + hard.total) || 1;
  const solvedPct = Math.round((solved / total) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      
      <ProfileSidebar user={displayUser} profile={profile} badges={profile?.badges} />

      <div className="flex-1 min-w-0 space-y-6">
        <motion.div {...fd(0.1)} className="relative overflow-hidden rounded-2xl p-6 border border-black/[0.08] dark:border-white/[0.08] bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--glass-surface)] shadow-md">
          <div className="absolute top-0 right-0 p-4 text-right z-10">
            <div className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 flex items-center gap-2">
              <FiZap className="text-accent text-sm" />
              <span className="text-xs font-black text-primary">{profile.totalPoints || 0} XP</span>
            </div>
          </div>
          <div className="relative z-10">
            {!username && (
              <span className="inline-block px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-[9px] font-black uppercase tracking-widest text-accent mb-3">
                {getGreeting()}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-black text-primary mb-2">{displayUser?.username}</h1>
            <p className="text-sm text-secondary max-w-md">
                {username ? `Viewing ${displayUser?.username}'s public profile.` : "Track your journey, analyze your performance, and dominate the algorithm arena."}
            </p>
          </div>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex border-b border-black/[0.08] dark:border-white/[0.08] gap-6 pb-px">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === "overview" ? "text-accent" : "text-tertiary hover:text-secondary"}`}
          >
            Overview
            {activeTab === "overview" && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`pb-2.5 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === "achievements" ? "text-accent" : "text-tertiary hover:text-secondary"}`}
          >
            Achievements
            {activeTab === "achievements" && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div {...fd(0.15)} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[var(--glass-surface)] shadow-md p-5 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-primary">Algorithm Mastery</h2>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center relative">
                     <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path className="text-black/5 dark:text-white/5" strokeWidth="4" stroke="currentColor" fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-accent transition-all duration-1000 ease-out" strokeWidth="4" strokeDasharray={`${solvedPct}, 100`} strokeLinecap="round" stroke="currentColor" fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary">{solvedPct}%</div>
                  </div>
                </div>
                
                <div className="space-y-4 mt-auto">
                  <DiffBar label="Easy" solved={easy.solved} total={easy.total} color="#22c55e" />
                  <DiffBar label="Medium" solved={medium.solved} total={medium.total} color="#eab308" />
                  <DiffBar label="Hard" solved={hard.solved} total={hard.total} color="#ef4444" />
                </div>
              </motion.div>

              <motion.div {...fd(0.2)} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[var(--glass-surface)] shadow-md p-5 overflow-hidden flex flex-col justify-center">
                 <ActivityHeatmap submissions={submissions} />
              </motion.div>
            </div>

            <motion.div {...fd(0.25)} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[var(--glass-surface)] shadow-md overflow-hidden">
              <div className="p-4 border-b border-black/[0.06] dark:border-b-white/[0.06] flex items-center justify-between">
                 <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                   <FiActivity className="text-accent" /> Recent Submissions
                 </h2>
                 {!username && (
                   <Link to="/dashboard" className="text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-wider flex items-center gap-1">
                     Go to Arena <FiArrowRight size={10} />
                   </Link>
                 )}
              </div>
              
              {recentSubs.length === 0 ? (
                <div className="p-10 text-center">
                  <FiCpu size={32} className="text-black/10 dark:text-white/10 mx-auto mb-3" />
                  <p className="text-xs font-bold text-tertiary uppercase tracking-widest">No recent submissions</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {recentSubs.map((sub, i) => {
                    const ac = sub.status === "Accepted";
                    const wa = sub.status === "Rejected";
                    const badgeCls = ac
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : wa
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                    const badgeLabel = ac ? "ACCEPTED" : wa ? "REJECTED" : "PENDING";

                    return (
                      <Link key={sub._id + i} to={`/submission/${sub._id}`} className="flex items-center justify-between p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                            {sub.challengeId?.title || "Unknown Challenge"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-tertiary">
                              {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[10px] text-tertiary">•</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{sub.language}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shrink-0 ${badgeCls}`}>
                          {badgeLabel}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        ) : (
          <motion.div {...fd(0.15)} className="space-y-6">
            {/* Filter and Sorting Header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <FiAward className="text-yellow-500 text-lg" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-primary">Achievements & Badges</h2>
                  <p className="text-[10px] text-tertiary">Conquer challenges to unlock prestigious titles</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-1">
                  {["all", "achieved", "locked"].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? "bg-accent text-white shadow-sm" : "text-tertiary hover:text-secondary"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Sorting Select */}
                <div className="flex items-center gap-2 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-1.5">
                  <FiFilter size={10} className="text-tertiary" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-secondary focus:outline-none cursor-pointer"
                  >
                    <option value="rarity-desc">Rarity: High to Low</option>
                    <option value="rarity-asc">Rarity: Low to High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Badges Cards Grid */}
            {sortedBadges.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] shadow-md p-10 text-center">
                <FiAward size={36} className="text-tertiary mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold text-tertiary uppercase tracking-widest">No badges match this filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedBadges.map((badge, i) => {
                  const r = RARITY[badge.rarity] || RARITY.COMMON;
                  const isUnlocked = badge.isUnlocked;
                  return (
                    <motion.div
                      key={badge._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative rounded-2xl border bg-gradient-to-br p-5 flex items-start gap-4 transition-all duration-300 shadow-sm overflow-hidden"
                      style={{
                        borderColor: isUnlocked ? "#facc15" : "rgba(255,255,255,0.08)",
                        background: isUnlocked ? `linear-gradient(135deg, ${r.bg}, rgba(250,204,21,0.04))` : r.bg,
                        boxShadow: isUnlocked ? "0 4px 20px rgba(250, 204, 21, 0.04)" : undefined
                      }}
                    >
                      {isUnlocked && (
                        /* Shining sweeping line */
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none -skew-x-12"
                          initial={{ x: "-150%" }}
                          animate={{ x: "150%" }}
                          transition={{
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 3,
                            ease: "linear",
                            delay: i * 0.3
                          }}
                        />
                      )}

                      {/* Large Badge Icon */}
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl shrink-0 transition-transform group-hover:scale-110 duration-300 relative"
                        style={{
                          background: `rgba(${r.glow}, 0.25)`,
                          border: `1px solid ${r.border}`
                        }}
                      >
                        {badge.icon}
                        {isUnlocked && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px] font-bold text-black border border-black/20 shadow-md">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Text info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-primary truncate leading-none pt-0.5">{badge.name}</h3>
                          <span
                            className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0"
                            style={{
                              borderColor: r.border,
                              color: r.label,
                              background: `rgba(${r.glow}, 0.1)`
                            }}
                          >
                            {badge.rarity}
                          </span>
                        </div>

                        <p className="text-xs text-secondary leading-normal">{badge.description || "Unlock criteria not specified."}</p>

                        <div className="flex items-center gap-1.5 pt-1">
                          {isUnlocked ? (
                            <span className="text-[9px] font-black uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                              Unlocked {(() => {
                                const d = new Date(badge.unlockedAt);
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const year = String(d.getFullYear()).slice(-2);
                                return `${day}-${month}-${year}`;
                              })()}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider text-tertiary bg-black/10 dark:bg-white/5 px-2 py-0.5 rounded-md">
                              Locked Badge
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default Profile;
