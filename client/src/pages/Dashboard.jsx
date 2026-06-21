import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';
import {
  FiArrowRight,
  FiZap,
  FiFilter,
  FiSearch,
  FiCpu,
  FiAlertTriangle,
  FiActivity,
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiMessageSquare,
} from "react-icons/fi";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import ChallengeCard from "../components/Card";
import { getSessionGreeting } from "../constants/greetings";

/* ── helpers ─────────────────────────────────── */
const getRGB = (d) =>
  d === "Easy"
    ? "34,197,94"
    : d === "Medium"
      ? "234,179,8"
      : d === "Hard"
        ? "239,68,68"
        : "99,102,241";

const buildQS = ({
  page,
  limit,
  search,
  difficulty,
  category,
  sortBy,
  sortDir,
}) => {
  const p = new URLSearchParams();
  p.set("page", page);
  p.set("limit", limit);
  p.set("sortBy", sortBy);
  p.set("sortDir", sortDir);
  if (search) p.set("search", search);
  if (difficulty) p.set("difficulty", difficulty);
  if (category) p.set("category", category);
  return p.toString();
};

const fd = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay: d, ease: "easeOut" },
});

/* ══════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();

  const [showWarning, setShowWarning] = useState(true);
  useEffect(() => {
    if (user?.status === "Warned") {
      const warnedToastShown = sessionStorage.getItem("warnedToastShown");
      if (!warnedToastShown) {
        toast.error('You have been warned', { icon: '⚠️', duration: 6000 });
        sessionStorage.setItem("warnedToastShown", "true");
      }
      const t = setTimeout(() => setShowWarning(false), 20000);
      return () => clearTimeout(t);
    }
  }, [user?.status]);

  const greeting = useMemo(() => getSessionGreeting(), []);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 4,
    search: "",
    difficulty: "",
    category: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const hf = (k, v) => setFilters((p) => ({ ...p, [k]: v, page: 1 }));
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroDir, setHeroDir] = useState(1);

  /* ── queries ─────────────────────────────── */
  const challengesQ = useQuery({
    queryKey: ["dash-challenges", filters],
    queryFn: async () => {
      const r = await api.get(`/api/challenges?${buildQS(filters)}`);
      return r.data.data || [];
    },
  });

  const summaryQ = useQuery({
    queryKey: ["dash-summary"],
    queryFn: async () => {
      const r = await api.get("/api/dashboard/summary");
      return r.data.data || {};
    },
  });

  const profileQ = useQuery({
    queryKey: ["dash-profile"],
    queryFn: async () => {
      const r = await api.get("/api/profile/stats");
      return r.data.data || {};
    },
  });

  const setsQ = useQuery({
    queryKey: ["dash-sets"],
    queryFn: async () => {
      try {
        const r = await api.get("/api/sets");
        return r.data.data || [];
      } catch {
        return [];
      }
    },
  });

  /* ── derived ─────────────────────────────── */
  const summary = summaryQ.data;
  const profile = profileQ.data;
  const challenges = challengesQ.data || [];
  const allSubs = useMemo(
    () => profile?.recentSubmissions || summary?.recentActivity || [],
    [profile, summary],
  );

  const solved = summary?.solved ?? profile?.acceptedCount ?? 0;
  const total = summary?.totalChallenges ?? 0;
  const pending = summary?.pending ?? profile?.pendingCount ?? 0;
  const solvedPct = total > 0 ? Math.round((solved / total) * 100) : 0;

  const activeSets = useMemo(
    () =>
      (setsQ.data || [])
        .filter((s) => new Date(s.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)),
    [setsQ.data],
  );
  const clampedIdx = Math.min(heroIdx, Math.max(activeSets.length - 1, 0));
  const activeSet = activeSets[clampedIdx];

  const goHero = (dir) => {
    setHeroDir(dir);
    setHeroIdx((i) => Math.max(0, Math.min(activeSets.length - 1, i + dir)));
  };

  const recentSubs = useMemo(
    () =>
      [...allSubs]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 6),
    [allSubs],
  );

  const diffChips = [
    { v: "", l: "All" },
    { v: "Easy", l: "Easy" },
    { v: "Medium", l: "Medium" },
    { v: "Hard", l: "Hard" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ── Warning ─────────────────────────── */}
      {user?.status === "Warned" && showWarning && (
        <motion.div
          {...fd(0)}
          className="flex items-center gap-3 p-4 rounded-xl border border-red-500/40 bg-red-500/8"
        >
          <FiAlertTriangle className="text-red-400 text-lg flex-shrink-0" />
          <p className="text-sm text-red-400">
            <strong className="font-black mr-2">Official Warning:</strong>
            {user?.warningMessage || "You have an active warning from your Clan Chief. Please review your activity."}
          </p>
        </motion.div>
      )}

      {/* ── Greeting ────────────────────────── */}
      <motion.div {...fd(0.04)}>
        <h2 className="text-2xl font-black text-primary mb-1 font-h2">
          {greeting.heading.replace("{username}", user?.username || "Operative")}
        </h2>
        <p className="text-secondary text-sm">
          {greeting.subtext}
        </p>
      </motion.div>

      {/* ── Hero Carousel ────────────────────────── */}
      <motion.div {...fd(0.08)} className="relative">
        {/* card shell */}
        <div
          className="relative overflow-hidden rounded-2xl group transition-all duration-250 border border-black/[0.12] dark:border-white/[0.07]
          shadow-[0_5px_10px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]
          dark:shadow-[0_5px_10px_rgba(var(--accent-rgb),0.1),inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          {/* glow orbs — static behind slides */}
          <div className="absolute -top-20 -left-10 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),1), transparent 70%)" }} />
          <div className="absolute -bottom-16 left-40 w-60 h-60 rounded-full blur-[100px] pointer-events-none opacity-15"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,1), transparent 70%)" }} />

          {/* slides */}
          <div className="relative overflow-hidden">
            {setsQ.isLoading ? (
              <div className="p-8 animate-pulse">
                <div className="relative z-30 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Tag skeleton */}
                    <div className="h-3 w-32 bg-black/10 dark:bg-white/10 rounded-full" />
                    
                    {/* Title skeleton */}
                    <div className="space-y-2">
                      <div className="h-8 md:h-10 w-2/3 bg-black/15 dark:bg-white/15 rounded-xl" />
                      <div className="h-8 md:h-10 w-1/2 bg-black/15 dark:bg-white/15 rounded-xl" />
                    </div>

                    {/* Description skeleton */}
                    <div className="space-y-2 max-w-md pt-2">
                      <div className="h-3 w-full bg-black/10 dark:bg-white/10 rounded-full" />
                      <div className="h-3 w-5/6 bg-black/10 dark:bg-white/10 rounded-full" />
                    </div>

                    {/* Action button + XP indicator skeleton */}
                    <div className="flex items-center gap-4 pt-4">
                      <div className="h-10 w-36 bg-black/15 dark:bg-white/15 rounded-xl" />
                      <div className="h-5 w-20 bg-black/10 dark:bg-white/10 rounded-full" />
                    </div>
                  </div>

                  {/* Watermark watermark CPU skeleton */}
                  <div className="hidden md:flex items-center justify-center flex-shrink-0 opacity-[0.03]">
                    <div className="w-40 h-40 bg-black/20 dark:bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false} custom={heroDir}>
                <motion.div
                  key={clampedIdx}
                  custom={heroDir}
                  variants={{
                    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="p-8"
                >
                  <div className="relative z-30 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 min-w-0">
                      {/* deadline badge */}
                      {activeSet && (
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-block text-[10px] font-black uppercase tracking-[0.35em] text-accent">
                            {activeSets.length > 1
                              ? `Challenge ${clampedIdx + 1} of ${activeSets.length}`
                              : "This Week's Challenge"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            <FiClock size={9} /> Due {new Date(activeSet.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                      )}
                      {!activeSet && (
                        <span className="inline-block text-[10px] font-black uppercase tracking-[0.35em] text-accent mb-4">
                          This Week's Challenge
                        </span>
                      )}

                      <h1 className="text-2xl md:text-3xl font-black leading-[1.1] dark:text-white text-black mb-3 font-h1">
                        {activeSet ? (
                          <>
                            {activeSet.title.split(" ").slice(0, -1).join(" ")}{" "}
                            <span style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb)), rgba(168,85,247,1))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                              {activeSet.title.split(" ").slice(-1)[0]}
                            </span>
                          </>
                        ) : (
                          <>Mastering Dynamic{" "}<span style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb)), rgba(168,85,247,1))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Programming</span></>
                        )}
                      </h1>

                      <p className="text-secondary text-sm leading-relaxed mb-6 max-w-md">
                        {activeSet
                          ? `Target Level: ${activeSet.targetLevel} · ${activeSet.questions?.length || 0} questions `
                          : "Push your limits with this week's elite challenge. Solve complex optimizations and climb the global leaderboards."}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 z-10">
                        <Link
                          to={activeSet ? `/missions?setId=${activeSet._id}` : "/missions"}
                          className="inline-flex items-center gap-2 px-6 py-2.5 z-30 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb)), rgba(168,85,247,0.9))", boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.4)" }}
                        >
                          Enter Arena <FiArrowRight size={14} />
                        </Link>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-tertiary">
                          <FiZap className="text-yellow-400" size={13} />+
                          {activeSet?.questions?.reduce((a, q) => a + (q.points || 0), 0) || 50} XP
                        </div>
                      </div>
                    </div>

                    {/* watermark */}
                    <div className="clip md:flex items-center justify-center flex-shrink-0 opacity-[0.08] group-hover:opacity-[0.4] transition-all duration-700 group-hover:rotate-6">
                      <FiCpu size={180} className="text-accent" />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* edge-click navigation zones — only when multiple sets */}
          {activeSets.length > 1 && (
            <>
              {/* LEFT zone */}
              <div
                onClick={() => clampedIdx > 0 && goHero(-1)}
                className={`absolute inset-y-0 left-0 w-1/4 z-20 flex items-center justify-start group/left transition-all duration-300
                  ${clampedIdx === 0 ? 'pointer-events-none' : 'cursor-pointer'}`}
              >
                <div className="absolute inset-0 opacity-0 group-hover/left:opacity-100 transition-opacity duration-300 rounded-l-2xl"
                  style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
                <svg
                  viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"
                  className={`relative ml-3 w-5 h-5 transition-all duration-300
                    ${clampedIdx === 0 ? 'text-white/0' : 'text-black/35 dark:text-white/35 group-hover/left:text-accent group-hover/left:-translate-x-0.5'}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </div>

              {/* RIGHT zone */}
              <div
                onClick={() => clampedIdx < activeSets.length - 1 && goHero(1)}
                className={`absolute inset-y-0 right-0 w-1/4 z-20 flex items-center justify-end group/right transition-all duration-300
                  ${clampedIdx === activeSets.length - 1 ? 'pointer-events-none' : 'cursor-pointer'}`}
              >
                <div className="absolute inset-0 opacity-0 group-hover/right:opacity-100 transition-opacity duration-300 rounded-r-2xl"
                  style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
                <svg
                  viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"
                  className={`relative mr-3 w-5 h-5 transition-all duration-300
                    ${clampedIdx === activeSets.length - 1 ? 'text-white/0' : 'text-black/35 dark:text-white/35 group-hover/right:text-accent group-hover/right:translate-x-0.5'}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </>
          )}
        </div>

        {/* dot indicators */}
        {activeSets.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {activeSets.map((_, i) => (
              <button
                key={i}
                onClick={() => { setHeroDir(i > clampedIdx ? 1 : -1); setHeroIdx(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === clampedIdx
                    ? "w-5 h-1.5 bg-accent"
                    : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Stat bar ────────────────────────── */}
      <motion.div {...fd(0.12)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: FiTarget,
              label: "Total Challenges",
              value: total,
              color: "text-accent",
            },
            {
              icon: FiCheckCircle,
              label: "Solved",
              value: solved,
              color: "text-green-400",
            },
            {
              icon: FiClock,
              label: "Pending Reviews",
              value: pending,
              color: "text-yellow-400",
            },
            {
              icon: FiTrendingUp,
              label: "Solver Rate",
              value: `${solvedPct}%`,
              color: "text-purple-400",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-4 rounded-xl border border-black/[0.15] dark:border-white/[0.11] transition-all hover:scale-[1.02]
              hover:shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
              dark:hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.25),0_10px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <Icon size={16} className={`${color} opacity-50 flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-[9px] text-tertiary uppercase tracking-widest font-bold mb-0.5 truncate font-h2">
                  {label}
                </p>
                <div className="flex items-baseline gap-2">
                  {summaryQ.isLoading || profileQ.isLoading ? (
                    <div className="h-6 w-12 bg-black/10 dark:bg-white/10 rounded-md animate-pulse mt-0.5" />
                  ) : (
                    <span className={`text-xl font-black ${color} font-h2`}>{value}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Two-column: Missions + Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* LEFT: Available Missions */}
        <motion.div {...fd(0.16)} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-primary font-h2">
              Available Missions
            </h2>
            <Link
              to="/missions"
              className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1"
            >
              View All <FiArrowRight size={12} />
            </Link>
          </div>

          {/* filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[120px] max-w-xs">
              <FiSearch
                size={11}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
              />
              <input
                className="field-input pl-8 text-xs py-1.5 h-8 w-full"
                placeholder="Search titles..."
                value={filters.search}
                onChange={(e) => hf("search", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-black/[0.12] dark:border-white/[0.06] rounded-xl px-3 h-8">
              <FiFilter size={10} className="text-tertiary" />
              <select
                className="bg-transparent text-xs text-secondary font-semibold outline-none"
                value={filters.sortBy}
                onChange={(e) => hf("sortBy", e.target.value)}
              >
                <option value="createdAt">Newest</option>
                <option value="points">XP</option>
              </select>
            </div>
          </div>

          {/* difficulty chips */}
          <div className="flex gap-2 flex-wrap">
            {diffChips.map(({ v, l }) => {
              const active = filters.difficulty === v;
              const cls = active
                ? v === "Easy"
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : v === "Medium"
                    ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400"
                    : v === "Hard"
                      ? "bg-red-500/15 border-red-500/40 text-red-400"
                      : "bg-accent/15 border-accent/40 text-accent"
                : "bg-white/[0.03] border-black/[0.12] dark:border-white/[0.07] text-tertiary hover:text-secondary hover:border-white/20";
              return (
                <button
                  key={v}
                  onClick={() => hf("difficulty", v)}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-bold border transition-all ${cls}`}
                >
                  {l}
                </button>
              );
            })}
          </div>

          {/* challenge grid 2×2 */}
          {challengesQ.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <EmptyState
              title="No missions found"
              description="Adjust filters or check back later."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {challenges.map((ch, i) => {
                const diffCls =
                  ch.difficulty === "Easy"
                    ? "bg-green-500/15 text-green-400 border-green-500/25"
                    : ch.difficulty === "Medium"
                      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
                      : "bg-red-500/15 text-red-400 border-red-500/25";
                return (
                  <motion.div
                    key={ch._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/challenge/${ch._id}`}
                      className="group block h-full"
                    >
                      <ChallengeCard
                        className="h-full p-5 !rounded-2xl"
                        innerClassName="flex flex-col gap-3 h-full justify-between w-full"
                        difficultyColor={getRGB(ch.difficulty)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${diffCls}`}
                          >
                            {ch.difficulty}
                          </span>
                          <span className="text-[10px] font-black text-accent">
                            {ch.points} XP
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-sm font-bold leading-snug text-primary group-hover:text-accent transition-colors line-clamp-2 flex-1 font-h2">
                            {ch.title}
                          </h2>
                          {/* eslint-disable-next-line */}
                          {new Date() - new Date(ch.createdAt || Date.now()) <
                            7 * 24 * 60 * 60 * 1000 && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 flex-shrink-0 mt-0.5">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          {ch.tags &&
                            ch.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-black/[0.1] dark:border-white/5"
                              >
                                {tag}
                              </span>
                            ))}
                          {(!ch.tags || ch.tags.length === 0) &&
                            ch.category &&
                            ch.category.split(',').slice(0, 3).map((cat, idx) => (
                              <span
                                key={`cat-${idx}`}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-black/[0.1] dark:border-white/5"
                              >
                                {cat.trim()}
                              </span>
                            ))}
                        </div>
                      </ChallengeCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* RIGHT: Recent Activity */}
        <motion.div {...fd(0.18)} className="space-y-4">
          <h2 className="text-base font-black text-primary flex items-center gap-2 font-h2">
            <FiActivity className="text-accent" size={16} /> Recent Activity
          </h2>

          <div className="rounded-2xl border border-black/[0.12] dark:border-white/[0.06] overflow-hidden">
            {summaryQ.isLoading || profileQ.isLoading ? (
              <div className="divide-y divide-black/[0.08] dark:divide-white/[0.04]">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-4 animate-pulse">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="h-3.5 w-2/3 bg-black/10 dark:bg-white/10 rounded-full" />
                      <div className="h-2.5 w-1/3 bg-black/10 dark:bg-white/10 rounded-full" />
                    </div>
                    <div className="h-5 w-16 bg-black/10 dark:bg-white/10 rounded-md ml-3" />
                  </div>
                ))}
              </div>
            ) : recentSubs.length === 0 ? (
              <div className="p-8 text-center">
                <FiCpu size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-xs text-tertiary">
                  No submissions yet — start a challenge!
                </p>
              </div>
            ) : (
              <div className="rounded-2xl">
                {recentSubs.map((sub, i) => {
                  const ac = sub.status === "Accepted";
                  const wa = sub.status === "Rejected";
                  const badgeCls = ac
                    ? "bg-green-500/15 text-green-400 border-green-500/25"
                    : wa
                      ? "bg-red-500/15 text-red-400 border-red-500/25"
                      : "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
                  const badgeLabel = ac
                    ? "ACCEPTED"
                    : wa
                      ? "REJECTED"
                      : "PENDING";
                  return (
                    <Link
                      key={sub._id + i}
                      to={`/submission/${sub._id}`}
                      className="group flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors truncate">
                          {sub.challengeId?.title || "Unknown Challenge"}
                        </p>
                        <p className="text-[10px] text-tertiary mt-0.5">
                          {new Date(sub.submittedAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <span
                        className={`ml-3 text-[9px] font-black px-2 py-0.5 rounded border flex-shrink-0 ${badgeCls}`}
                      >
                        {badgeLabel}
                      </span>
                      {wa && sub.feedback && (
                        <span className="ml-1 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">
                          <FiMessageSquare size={9} />
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>



    </div>
  );
};

export default Dashboard;
