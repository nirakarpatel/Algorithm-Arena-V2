import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform, stagger } from "framer-motion";
import {
  FiArrowRight,
  FiClock,
  FiActivity,
  FiZap,
  FiAward,
  FiUsers,
} from "react-icons/fi";
import Card from "../components/Card";
import SkeletonCard from "../components/SkeletonCard";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";
import {
  USE_MOCK,
  mockChallenges,
  mockSubmissions,
  mockCurrentUser,
} from "../lib/mockData";

const MotionBlock = motion.div;

/* ── Animated grid background ── */
const GridBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Perspective grid */}
    <svg
      className="absolute inset-0 w-full h-full opacity-[0] dark:opacity-[0]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path
            d="M 60 0 L 0 0 0 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>

    {/* Orbs */}
    <div
      className="orb orb-1"
      style={{ filter: "blur(80px)", opacity: 0.35 }}
    />
    <div
      className="orb orb-2"
      style={{ filter: "blur(100px)", opacity: 0.25 }}
    />

    {/* Accent cross-hair lines */}
    <div
      className="absolute top-1/2 left-0 w-full h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.08), transparent)",
      }}
    />
    <div
      className="absolute top-0 left-1/2 h-full w-px"
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(var(--accent-rgb), 0.06), transparent)",
      }}
    />
  </div>
);

/* ── Floating code snippets ── */
const SNIPPETS = [
  "O(n log n)",
  "adj[u].push_back(v)",
  "1 << n",
  "dp[mask][i]",
  "LCA(u, v)",
  "segmentTree.query(l, r)",
  "T(n) = 2T(n/2) + O(n)",
  "__builtin_popcount()",
  "priority_queue<int> pq",
  "dijkstra(source, target)",
  "gcd(a, b) = gcd(b, a % b)",
  "parent[find(i)] = find(j)",
  "while(t--) { solve(); }",
  "x ≡ a (mod m)",
  "n & (n - 1) == 0",
  "dist[v] > dist[u] + w",
  "topologicalSort()",
  "memo[i][j] != -1",
  "maxFlow / minCut",
  "std::next_permutation",
  "Φ(n) [Euler Totient]",
  "segmentTree.update(idx, val)",
  "O(V + E)",
  "fenwickTree[idx] += val",
  "nCr % (10⁹ + 7)",
  "stronglyConnectedComponents",
  "long long ll = 1e18",
  "BIT[i] & (-i)",
  "std::set_intersection",
  "O(sqrt(n))",
  "Floyd-Warshall",
  "2^n submasks",
  "isBipartite(G)",
  "std::unordered_map<k, v>",
  "Σ_{i=0}^{n} i²",
  "binarySearch(low, high)",
  "node->left->height",
];

const FloatingSnippet = ({ text, style }) => (
  <span
    className="absolute font-mono text-[11px] font-bold select-none pointer-events-none"
    style={{
      color: `rgba(var(--accent-rgb), 0)`,
      letterSpacing: "0.05em",
      ...style,
    }}
  >
    {text}
  </span>
);

/* ── Stat pill ── */
const StatPill = ({ icon: Icon, value, label, color }) => (
  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/10 shadow-sm dark:shadow-none">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `rgba(${color}, 0.12)` }}
    >
      <Icon style={{ color: `rgba(${color}, 0.9)` }} className="text-sm" />
    </div>
    <div>
      <div className="text-lg font-black leading-none text-primary">
        {value}
      </div>
      <div className="text-[11px] text-secondary uppercase tracking-widest font-semibold mt-0.5">
        {label}
      </div>
    </div>
  </div>
);

const getDifficultyRGB = (diff) => {
  switch (diff) {
    case "Easy":
      return "34, 197, 94";
    case "Medium":
      return "234, 179, 8";
    case "Hard":
      return "239, 68, 68";
    default:
      return "0, 122, 255";
  }
};

/* ════════════════════════════════════════ */
const Home = () => {
  const { isAuthenticated } = useAuth();
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.1]);

  const challengesQuery = useQuery({
    queryKey: ["home-challenges"],
    queryFn: async () => {
      if (USE_MOCK) return mockChallenges.slice(0, 6);
      const res = await api.get(
        "/api/challenges?page=1&limit=6&sortBy=createdAt&sortDir=desc",
      );
      return res.data.data || [];
    },
  });

  const challenges = challengesQuery.data || [];

  const submissionsQuery = useQuery({
    queryKey: ["home-pending-tasks"],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockSubmissions.filter(
          (s) =>
            s.status === "Pending" &&
            (s.userId._id === mockCurrentUser.id ||
              s.userId === mockCurrentUser.id),
        );
      }
      const res = await api.get("/api/submissions?status=Pending");
      return res.data.data || [];
    },
    enabled: isAuthenticated,
  });

  const pendingTasks = submissionsQuery.data || [];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-app text-primary font-sans selection:bg-accent selection:text-white">
      <GridBackground />

      {/* Floating snippets — decorative only */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {SNIPPETS.map((s, i) => (
          <FloatingSnippet
            key={i}
            text={s}
            style={{
              top: `${8 + ((i * 7.5) % 85)}%`,
              left: `${3 + ((i * 11) % 94)}%`,
              opacity: 0.6 + (i % 3) * 0.15,
              transform: `rotate(${-8 + (i % 5) * 4}deg)`,
            }}
          />
        ))}
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-5 w-full">
        <Link to="/" className="group flex items-center gap-2.5">
          {/* Logo mark */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, rgba(var(--accent-rgb), 0.9), rgba(var(--accent-rgb), 0.5))`,
              boxShadow: `0 0 16px rgba(var(--accent-rgb), 0.35)`,
            }}
          >
            <span className="text-white font-black text-sm leading-none">
              A
            </span>
          </div>
          <span className="font-black text-xl tracking-tight text-primary group-hover:opacity-80 transition-opacity">
            Algo<span style={{ color: `rgb(var(--accent-rgb))` }}>Arena</span>
          </span>
        </Link>

        <div className="flex gap-2 items-center">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 rounded-full font-bold text-sm text-white transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, rgba(var(--accent-rgb), 1), rgba(var(--accent-rgb), 0.7))`,
                boxShadow: `0 4px 16px rgba(var(--accent-rgb), 0.3)`,
              }}
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-1.5 text-secondary hover:text-primary rounded-full font-semibold text-sm transition-all hover:bg-white/5"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-full text-white font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, rgba(var(--accent-rgb), 1) 0%, #a855f7 100%)`,
                  boxShadow: `0 4px 12px rgba(var(--accent-rgb), 0.25)`,
                }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <motion.div
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-24"
      >
        {/* GDG badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-[0.15em] uppercase backdrop-blur-md"
            style={{
              background: `rgba(var(--accent-rgb), 0.1)`,
              border: `1px solid rgba(var(--accent-rgb), 0.25)`,
              color: `rgb(var(--accent-rgb))`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: `rgb(var(--accent-rgb))` }}
            />
            GDG on Campus · SOA ITER
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-5xl mx-auto"
        >
          {/* Decorative rank label */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="h-px flex-1 max-w-[80px]"
              style={{ background: `rgba(var(--accent-rgb), 0.3)` }}
            />
            <span
              className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase"
              style={{ color: `rgba(var(--accent-rgb), 0.6)` }}
            >
              Season 02
            </span>
            <div
              className="h-px flex-1 max-w-[80px]"
              style={{ background: `rgba(var(--accent-rgb), 0.3)` }}
            />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-2">
            <span className="text-primary block">Compete.</span>
            <span className="text-primary block">
              Solve.{" "}
              <span
                className="relative inline-block"
                style={{
                  background: `linear-gradient(135deg, rgb(var(--accent-rgb)), #a855f7, #ec4899)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Dominate.
              </span>
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl text-secondary max-w-xl mx-auto leading-relaxed mt-6"
        >
          The competitive programming arena built for ITER students. Sharpen
          your DSA skills, climb the ranks, and get interview-ready.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mt-10"
        >
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="group relative px-8 py-3.5 rounded-2xl text-white font-black text-base transition-all hover:-translate-y-1 flex items-center justify-center gap-2 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgb(var(--accent-rgb)), #7c3aed)`,
              boxShadow: `0 8px 32px rgba(var(--accent-rgb), 0.35), 0 2px 8px rgba(0,0,0,0.2)`,
            }}
          >
            <span className="relative z-10">
              {isAuthenticated ? "Resume Coding" : "Start Competing"}
            </span>
            <FiArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <Link
            to="/leaderboard"
            className="px-8 py-3.5 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5 backdrop-blur-md border text-primary"
            style={{
              background: `rgba(var(--accent-rgb), 0.05)`,
              borderColor: `rgba(var(--accent-rgb), 0.2)`,
            }}
          >
            View Leaderboard
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mt-12"
        >
          <StatPill
            icon={FiZap}
            value="50+"
            label="Challenges"
            color="234, 179, 8"
          />
          <StatPill
            icon={FiUsers}
            value="200+"
            label="Coders"
            color="34, 197, 94"
          />
          <StatPill
            icon={FiAward}
            value="1.5k"
            label="Submissions"
            color="var(--accent-rgb)"
          />
        </motion.div>
      </motion.div>

      {/* ── Difficulty legend strip ── */}

      {/* Divider */}
      <div
        className="relative z-10 mx-auto w-full max-w-6xl px-6"
        style={{
          height: "2px",
          background: `linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent)`,
          margin: "2rem auto",
        }}
      />

      {/* ── Authenticated sections ── */}
      {isAuthenticated && (
        <div className="relative z-10 px-6 pb-24">
          <div className="max-w-6xl mx-auto space-y-20">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(234, 179, 8, 0.1)" }}
                  >
                    <FiClock className="text-yellow-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Pending Tasks</h2>
                    <p className="text-secondary text-sm">
                      Under review — hang tight.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pendingTasks.map((task, i) => (
                    <MotionBlock
                      key={task._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <Link
                        to={`/submission/${task._id}`}
                        className="block group"
                      >
                        <Card difficultyColor="234, 179, 8" className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                              Under Review
                            </span>
                            <span className="text-secondary text-[10px]">
                              {new Date(task.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-base group-hover:text-yellow-500 transition-colors">
                            {task.challengeId?.title || "Unknown Challenge"}
                          </h3>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-secondary">
                              <FiActivity className="text-yellow-500" />
                              <span>View Status</span>
                            </div>
                            <FiArrowRight className="text-secondary group-hover:translate-x-1 transition-transform text-sm" />
                          </div>
                        </Card>
                      </Link>
                    </MotionBlock>
                  ))}
                </div>
              </section>
            )}

            {/* Available Missions */}
            <section className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  {/* Section eyebrow */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-px w-6"
                      style={{ background: `rgb(var(--accent-rgb))` }}
                    />
                    <span
                      className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase"
                      style={{ color: `rgba(var(--accent-rgb), 0.7)` }}
                    >
                      Active
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight">
                    Available Missions
                  </h2>
                  <p className="text-secondary mt-1 text-sm">
                    Your next rank-up is one solve away.
                  </p>
                </div>
                <Link
                  to="/missions"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
                  style={{
                    background: `rgba(var(--accent-rgb), 0.08)`,
                    border: `1px solid rgba(var(--accent-rgb), 0.2)`,
                    color: `rgb(var(--accent-rgb))`,
                  }}
                >
                  All Missions
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {challengesQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : challengesQuery.isError ? (
                <div className="rounded-2xl p-6 text-red-400 border border-red-500/20 bg-red-500/5">
                  {challengesQuery.error?.userMessage ||
                    "Failed to fetch challenges."}
                </div>
              ) : challenges.length === 0 ? (
                <div className="rounded-2xl p-10 text-center border border-white/5 bg-white/2">
                  <p className="text-secondary">
                    No missions yet. Check back soon.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {challenges.map((challenge, i) => (
                    <MotionBlock
                      key={challenge._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Link
                        to={`/challenge/${challenge._id}`}
                        className="group block h-full"
                      >
                        <Card
                          className="h-full p-6"
                          difficultyColor={getDifficultyRGB(
                            challenge.difficulty,
                          )}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide ${
                                challenge.difficulty === "Easy"
                                  ? "bg-green-500/15 text-green-500"
                                  : challenge.difficulty === "Medium"
                                    ? "bg-yellow-500/15 text-yellow-500"
                                    : "bg-red-500/15 text-red-500"
                              }`}
                            >
                              {challenge.difficulty}
                            </span>
                            <span className="text-secondary text-xs font-mono font-bold">
                              +{challenge.points} XP
                            </span>
                          </div>
                          <h3 className="text-lg font-black group-hover:text-accent transition-colors leading-snug">
                            {challenge.title}
                          </h3>
                          <p
                            className="text-secondary text-sm mt-2 leading-relaxed"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {challenge.description}
                          </p>
                          <div className="mt-5 flex items-center justify-between">
                            <span className="text-xs text-secondary font-mono">
                              {challenge.tags?.[0] || "Algorithm"}
                            </span>
                            <FiArrowRight className="text-secondary text-sm group-hover:translate-x-1 group-hover:text-accent transition-all" />
                          </div>
                        </Card>
                      </Link>
                    </MotionBlock>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer
        className="relative z-10 mt-auto py-6 text-center w-full"
        style={{
          borderTop: `1px solid rgba(var(--accent-rgb), 0.08)`,
          background: `rgba(var(--accent-rgb), 0.02)`,
        }}
      >
        <p className="text-xs text-secondary tracking-wide">
          © 2026 Algorithm Arena ·{" "}
          <span className="text-primary font-bold">
            GDG On Campus – SOA ITER
          </span>
        </p>
      </footer>
    </div>
  );
};

export default Home;
