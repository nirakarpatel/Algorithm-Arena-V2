import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiClock,
  FiCheckCircle,
  FiGrid,
  FiList,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";
import { api } from "../lib/api";
import { USE_MOCK, filterChallenges, mockDashboardSummary } from "../lib/mockData";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

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
    limit: 6,
    search: "",
    difficulty: "",
    category: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("dashboard:view") || "grid",
  );

  useEffect(() => {
    localStorage.setItem("dashboard:view", viewMode);
  }, [viewMode]);

  const queryKey = useMemo(() => ["challenges", filters], [filters]);

  const challengesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (USE_MOCK) return filterChallenges(filters);
      const qs = buildChallengeQuery(filters);
      const res = await api.get(`/api/challenges?${qs}`);
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      if (USE_MOCK) return mockDashboardSummary;
      const res = await api.get("/api/dashboard/summary");
      return res.data.data;
    },
  });

  const challenges = challengesQuery.data?.data || [];
  const meta = challengesQuery.data?.meta || {};
  const recentActivity = summaryQuery.data?.recentActivity || [];
  const solvedRate = summaryQuery.data?.totalChallenges
    ? Math.round(
        (summaryQuery.data.solved / summaryQuery.data.totalChallenges) * 100,
      )
    : 0;
  const MotionBlock = motion.div;

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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (direction) => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(1, prev.page + direction),
    }));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mission Control"
        subtitle="Track progress, filter missions fast, and jump back into your latest work."
      />

      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((card, index) => {
          const Icon = card.icon;
          return (
            <MotionBlock
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="macos-glass p-3 sm:p-5"
            >
              <div className="flex items-center justify-between ">
                <h3 className="text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate">
                  {card.label}
                </h3>
                <Icon className="text-secondary text-sm sm:text-base" />
              </div>
              <p className={`text-xl sm:text-3xl font-bold mt-1 sm:mt-2 ${card.valueClass}`}>
                {card.value}
              </p>
            </MotionBlock>
          );
        })}
      </div>

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

        {/* Mobile controls row: Pagination (long) + Sort + Order (small) */}
        <div className="flex gap-1 md:gap-2 md:grid md:grid-cols-3 md:col-span-3 items-center text-xs sm:text-base">
          <select
            className="field-select flex-[1] md:w-full"
            value={filters.limit}
            onChange={(e) => handleFilterChange("limit", Number(e.target.value))}
          >
            <option value={6}>6 / page</option>
            <option value={12}>12 / page</option>
            <option value={24}>24 / page</option>
          </select>

          <select
            className="field-select flex-1 min-w-[70px] md:w-full px-3 py-2 sm:px-3 sm:py-3"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
          >
            <option value="createdAt">Newest</option>
            <option value="difficulty">Difficulty</option>
            <option value="title">Title</option>
          </select>

          <select
            className="field-select flex-1 min-w-[70px] md:w-full px-2 py-2 sm:px-3 sm:py-3 s"
            value={filters.sortDir}
            onChange={(e) => handleFilterChange("sortDir", e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
        {/* Left Side: Difficulty Chips */}
        <div className="chip-group flex gap-2">
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

        {/* Right Side: View Mode Toggle */}
        <div className="segmented flex items-center">
          <button
            className={`segmented-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <FiGrid className="mr-2" />
            Grid
          </button>
          <button
            className={`segmented-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <FiList className="mr-2" />
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-section-title font-semibold">
            Available Missions
          </h2>

          {challengesQuery.isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : challengesQuery.isError ? (
            <div className="macos-glass p-6 text-red-400">
              {challengesQuery.error?.userMessage ||
                "Failed to fetch challenges."}
            </div>
          ) : challenges.length === 0 ? (
            <EmptyState
              title="No challenges found"
              description="Try changing filters, or ask admin to publish new challenges."
              actionLabel="Reset Filters"
              onAction={() =>
                setFilters({
                  page: 1,
                  limit: 6,
                  search: "",
                  difficulty: "",
                  category: "",
                  sortBy: "createdAt",
                  sortDir: "desc",
                })
              }
            />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {challenges.map((challenge, index) => (
                    <MotionBlock
                      key={challenge._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        to={`/challenge/${challenge._id}`}
                        className="group"
                      >
                        <div className="macos-glass p-6 hover:border-accent transition-all duration-300 transform hover:-translate-y-1 h-full">
                          <div className="flex justify-between items-start mb-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                challenge.difficulty === "Easy"
                                  ? "bg-green-500/20 text-green-500"
                                  : challenge.difficulty === "Medium"
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {challenge.difficulty}
                            </span>
                            <span className="text-secondary text-sm">
                              {challenge.points} XP
                            </span>
                          </div>
                          <h3 className="text-xl font-bold group-hover:text-accent transition-colors">
                            {challenge.title}
                          </h3>
                          <p
                            className="text-secondary text-sm mt-2"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {challenge.description}
                          </p>
                        </div>
                      </Link>
                    </MotionBlock>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges.map((challenge) => (
                    <Link
                      key={challenge._id}
                      to={`/challenge/${challenge._id}`}
                      className="block"
                    >
                      <div className="macos-glass p-4 hover:border-accent transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-bold">{challenge.title}</h3>

                            <p
                              className="text-secondary text-sm mt-1"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {challenge.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-secondary">
                              {challenge.category || "General"}
                            </span>
                            <span className="font-semibold">
                              {challenge.points} XP
                            </span>
                           <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                challenge.difficulty === "Easy"
                                  ? "bg-green-500/20 text-green-500"
                                  : challenge.difficulty === "Medium"
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {challenge.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between macos-glass p-3 sm:p-4 gap-3">
                <span className="text-secondary text-sm">
                  Page {meta.page || filters.page} of {meta.totalPages || 1} (
                  {meta.total || challenges.length} total)
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => handlePageChange(-1)}
                    disabled={(meta.page || filters.page) <= 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handlePageChange(1)}
                    disabled={
                      (meta.page || filters.page) >= (meta.totalPages || 1)
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-section-title font-semibold">Recent Activity</h2>
          <div className="macos-glass p-4 space-y-3">
            {recentActivity.length ? (
              recentActivity.map((submission) => (
                <Link
                  key={submission._id}
                  to={`/submission/${submission._id}`}
                  className="block border border-glass-border rounded-xl p-3 hover:border-accent transition-colors"
                >
                  <p className="font-semibold text-sm">
                    {submission.challengeId?.title || "Unknown Challenge"}
                  </p>
                  <p className="text-secondary text-xs mt-1">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  <p className="text-xs mt-2">{submission.status}</p>
                </Link>
              ))
            ) : (
              <p className="text-secondary text-sm">
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
