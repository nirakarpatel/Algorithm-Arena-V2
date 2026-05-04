import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import { api } from "../lib/api";
import {
  USE_MOCK,
  mockChallenges,
  mockDashboardSummary,
} from "../lib/mockData";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

const MotionBlock = motion.div;

const buildChallengeQuery = ({
  page,
  limit,
  search,
  difficulty,
  category,
  sortBy,
  sortDir,
}) => {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);
  params.set("sortBy", sortBy);
  params.set("sortDir", sortDir);
  if (search) params.set("search", search);
  if (difficulty) params.set("difficulty", difficulty);
  if (category) params.set("category", category);
  return params.toString();
};

const difficultyChips = [
  { value: "", label: "All" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

const Dashboard = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 4,
    search: "",
    difficulty: "",
    category: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const challengesQuery = useQuery({
    queryKey: ["dashboard-challenges", filters],
    queryFn: async () => {
      if (USE_MOCK) {
        let filtered = mockChallenges;
        if (filters.search) {
          filtered = filtered.filter(c => c.title.toLowerCase().includes(filters.search.toLowerCase()) || c.description.toLowerCase().includes(filters.search.toLowerCase()));
        }
        if (filters.difficulty) {
          filtered = filtered.filter(c => c.difficulty === filters.difficulty);
        }
        if (filters.category) {
          filtered = filtered.filter(c => c.category && c.category.toLowerCase().includes(filters.category.toLowerCase()));
        }
        return filtered.slice(0, filters.limit);
      }

      try {
        const qs = buildChallengeQuery(filters);
        const res = await api.get(`/api/challenges?${qs}`);
        const data = res.data.data || [];
        return data.length > 0 ? data : mockChallenges.slice(0, filters.limit);
      } catch {
        return mockChallenges.slice(0, filters.limit);
      }
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockDashboardSummary;
      }

      try {
        const res = await api.get("/api/dashboard/summary");
        return res.data.data || mockDashboardSummary;
      } catch {
        return mockDashboardSummary;
      }
    },
  });

  const challenges = challengesQuery.data || [];
  const recentActivity = summaryQuery.data?.recentActivity?.length
    ? summaryQuery.data.recentActivity
    : mockDashboardSummary.recentActivity;
  const solvedRate = summaryQuery.data?.totalChallenges
    ? Math.round(
        (summaryQuery.data.solved / summaryQuery.data.totalChallenges) * 100,
      )
    : 0;

  const stats = [
    {
      label: "Total Challenges",
      value: summaryQuery.data?.totalChallenges ?? "-",
      icon: FiTarget,
      valueClass: "text-primary",
    },
    {
      label: "Solved",
      value: summaryQuery.data?.solved ?? "-",
      icon: FiCheckCircle,
      valueClass: "text-green-500",
    },
    {
      label: "Pending Reviews",
      value: summaryQuery.data?.pending ?? "-",
      icon: FiClock,
      valueClass: "text-yellow-500",
    },
    {
      label: "Solved Rate",
      value: `${solvedRate}%`,
      icon: FiTrendingUp,
      valueClass: "text-accent",
    },
  ];

  const sortedActivity = useMemo(() => {
    const statusOrder = { Rejected: 0, Pending: 1, Accepted: 2 };
    return [...recentActivity].sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 3;
      const orderB = statusOrder[b.status] ?? 3;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });
  }, [recentActivity]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mission Control"
        subtitle="Track progress, jump back into your latest work, and command the arena."
      />

      <MotionBlock
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden macos-glass p-8 md:p-12 border-accent/20 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10"
      >
        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.3em] text-accent">
            Recommended for you
          </span>
          <h2 className="mb-4 text-3xl font-black leading-tight text-primary md:text-5xl">
            Mastering Dynamic <br />
            <span className="text-accent underline decoration-accent/30 underline-offset-8">
              Programming
            </span>
          </h2>
          <p className="mb-8 max-w-lg text-sm leading-relaxed text-secondary md:text-lg">
            Push your limits with this week&apos;s elite challenge. Solve
            complex optimizations and climb the global leaderboards.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/missions"
              className="btn-primary inline-block px-8 shadow-accent-glow"
            >
              Enter Arena
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs">
              <FiZap className="text-yellow-400" />
              <span className="font-bold">+50 Bonus XP</span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute right-0 top-1/2 translate-x-1/4 -translate-y-1/2 opacity-10">
          <FiCpu size={400} className="text-accent" />
        </div>
      </MotionBlock>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card, index) => {
          const Icon = card.icon;
          return (
            <MotionBlock
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden macos-glass p-6 hover:border-accent/40 transition-all"
            >
              <div className="absolute -bottom-2 -right-2 opacity-5 transition-opacity group-hover:opacity-10">
                <Icon size={64} />
              </div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                  {card.label}
                </h3>
                <Icon className="text-secondary" size={14} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-black ${card.valueClass}`}>
                  {card.value}
                </p>
                <span className="rounded bg-green-500/10 px-1 text-[10px] font-bold text-green-500">
                  ▲ 2%
                </span>
              </div>
            </MotionBlock>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-section-title font-semibold">
              Available Missions
            </h2>
            <Link
              to="/missions"
              className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              View All <FiArrowRight />
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="macos-glass p-3 sm:p-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-xs sm:text-base">
            <input
              className="field-input md:col-span-2"
              placeholder="Search title or description"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
            <input
              className="field-input md:col-span-1"
              placeholder="Category"
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            />

            <div className="flex gap-1 md:gap-2 md:grid md:grid-cols-2 md:col-span-3 items-center text-xs sm:text-base">
              <select
                className="field-select flex-[1] md:w-full"
                value={filters.limit}
                onChange={(e) => handleFilterChange("limit", Number(e.target.value))}
              >
                <option value={4}>4 / page</option>
                <option value={8}>8 / page</option>
                <option value={12}>12 / page</option>
              </select>

              <select
                className="field-select flex-1 min-w-[70px] md:w-full px-3 py-2 sm:px-3 sm:py-3"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="createdAt">Date (Newest)</option>
                <option value="points">XP Points</option>
                <option value="difficulty">Difficulty</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
          
          <div className="chip-group flex flex-wrap gap-2">
            {difficultyChips.map((chip) => (
              <button
                key={chip.label}
                className={`chip-btn ${filters.difficulty === chip.value ? "active" : ""}`}
                onClick={() => handleFilterChange("difficulty", chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {challengesQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : challenges.length === 0 ? (
            <EmptyState
              title="No challenges found"
              description="Check back later for new missions."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {challenges.map((challenge, index) => (
                <MotionBlock
                  key={challenge._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    to={`/challenge/${challenge._id}`}
                    className="group block h-full"
                  >
                    <div className="flex h-full flex-col macos-glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent">
                      <div className="mb-3 flex items-start justify-between">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            challenge.difficulty === "Easy"
                              ? "bg-green-500/20 text-green-500"
                              : challenge.difficulty === "Medium"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {challenge.difficulty}
                        </span>
                        <span className="text-xs font-bold text-secondary">
                          {challenge.points} XP
                        </span>
                      </div>
                      <h3 className="mb-2 text-lg font-bold leading-tight transition-colors group-hover:text-accent">
                        {challenge.title}
                      </h3>
                      <p className="mt-auto line-clamp-2 text-xs text-secondary">
                        {challenge.description}
                      </p>
                    </div>
                  </Link>
                </MotionBlock>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/missions"
              className="btn-secondary flex w-full items-center justify-center gap-2 py-3 transition-all hover:border-accent/40 hover:bg-white/5"
            >
              Explore More Missions <FiArrowRight />
            </Link>
          </div>
        </div>

        <div className="flex h-full flex-col space-y-4">
          <h2 className="text-section-title flex items-center gap-2 font-semibold">
            <FiActivity className="text-accent" />
            Recent Activity
          </h2>
          <div className="custom-scrollbar space-y-3 overflow-y-auto macos-glass p-4 xl:h-[350px]">
            {sortedActivity.length ? (
              sortedActivity.map((submission) => (
                <Link
                  key={submission._id}
                  to={`/submission/${submission._id}`}
                  className="block rounded-xl border border-glass-border bg-white/[0.01] p-4 transition-all hover:border-accent hover:bg-accent/5"
                >
                  <p className="line-clamp-1 text-sm font-semibold">
                    {submission.challengeId?.title || "Unknown Challenge"}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-xs text-secondary">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                    <p
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        submission.status === "Accepted"
                          ? "bg-green-500/20 text-green-500"
                          : submission.status === "Rejected"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      {submission.status}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-secondary">
                No recent submissions yet. Start with an easy challenge.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
