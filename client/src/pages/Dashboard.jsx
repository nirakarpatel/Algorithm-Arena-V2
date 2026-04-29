import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiClock, FiCheckCircle, FiFlag, FiGrid, FiList, FiTarget, FiTrendingUp, FiCpu, FiZap, FiSearch, FiAward, FiActivity } from 'react-icons/fi';
import { api } from '../lib/api';
import { mockChallenges } from '../lib/mockData';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

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

const PendingTasks = ({ pendingCount }) => {
  const mockTasks = [
    { id: 1, title: 'Sliding Window Maximum', priority: 'High', due: '2h left', category: 'Algorithms' },
    { id: 2, title: 'Dijkstra Pathfinding', priority: 'Med', due: 'Tomorrow', category: 'Graphs' },
    { id: 3, title: 'Memory Management', priority: 'Low', due: '3 days', category: 'OS' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-section-title font-semibold flex items-center gap-2">
          <FiClock className="text-accent" />
          Pending Tasks
          <span className="text-xs bg-accent/10 px-2 py-0.5 rounded-full text-accent font-black tracking-widest">{mockTasks.length}</span>
        </h2>
        <button className="text-xs text-accent font-bold hover:underline">View All Tasks</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockTasks.map((task) => (
          <div key={task.id} className="group macos-glass p-5 hover:border-accent transition-all cursor-pointer bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-tertiary uppercase font-black tracking-widest">{task.category}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${
                task.priority === 'High' ? 'bg-red-500/20 text-red-500' : 
                task.priority === 'Med' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {task.priority}
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight group-hover:text-accent transition-colors mb-4">{task.title}</h3>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-glass-border/40">
              <div className="flex items-center gap-2">
                <FiClock size={12} className="text-accent" />
                <span className="text-[10px] text-secondary font-medium">Due {task.due}</span>
              </div>
              <button className="text-[10px] bg-accent/10 text-accent px-3 py-1 rounded-lg font-bold hover:bg-accent/20 transition-colors">Resume</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
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
      try {
        const qs = buildChallengeQuery(filters);
        const res = await api.get(`/api/challenges?${qs}`);
        const data = res.data.data || [];
        return {
          data: data.length > 0 ? data : mockChallenges,
          meta: res.data.meta || { page: 1, totalPages: 1, total: mockChallenges.length },
        };
      } catch {
        return {
          data: mockChallenges,
          meta: { page: 1, totalPages: 1, total: mockChallenges.length },
        };
      }
    },
  });

  const mockSummary = {
    totalChallenges: mockChallenges.length,
    solved: 3,
    pending: 2,
    recentActivity: [],
  };

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/dashboard/summary");
        const data = res.data.data;
        return data?.totalChallenges ? data : mockSummary;
      } catch {
        return mockSummary;
      }
    },
  });

  const challenges = challengesQuery.data?.data?.length ? challengesQuery.data.data : mockChallenges;
  const meta = challengesQuery.data?.meta || { page: 1, totalPages: 1, total: challenges.length };
  const MOCK_ACTIVITY = [
    { _id: 'a1', challengeId: { title: 'Two Sum' }, submittedAt: new Date().toISOString(), status: 'Accepted' },
    { _id: 'a2', challengeId: { title: 'Reverse Link' }, submittedAt: new Date(Date.now() - 3600000).toISOString(), status: 'Pending' },
  ];

  const recentActivity = summaryQuery.data?.recentActivity?.length ? summaryQuery.data.recentActivity : MOCK_ACTIVITY;
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

      {/* Featured Hero */}
      <MotionBlock 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden macos-glass p-8 md:p-12 border-accent/20 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10"
      >
        <div className="relative z-10 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4 block">Recommended for you</span>
          <h2 className="text-3xl md:text-5xl font-black text-primary mb-4 leading-tight">Mastering Dynamic <br/><span className="text-accent underline decoration-accent/30 underline-offset-8">Programming</span></h2>
          <p className="text-secondary text-sm md:text-lg mb-8 leading-relaxed max-w-lg">Push your limits with this week's elite challenge. Solve complex optimizations and climb the global leaderboards.</p>
          <div className="flex flex-wrap gap-4">
             <button className="btn-primary px-8 shadow-accent-glow">Enter Arena</button>
             <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
                <FiZap className="text-yellow-400" />
                <span className="font-bold">+500 Bonus XP</span>
             </div>
          </div>
        </div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-10 pointer-events-none transform translate-x-1/4">
           <FiCpu size={400} className="text-accent" />
        </div>
      </MotionBlock>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((card, index) => {
          const Icon = card.icon;
          return (
            <MotionBlock
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="macos-glass p-6 group hover:border-accent/40 transition-all relative overflow-hidden"
            >
              <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon size={64} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-widest">{card.label}</h3>
                <Icon className="text-secondary" size={14} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-black ${card.valueClass}`}>{card.value}</p>
                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1 rounded">▲ 2%</span>
              </div>
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
          <h2 className="text-section-title font-semibold flex items-center gap-2">
            <FiActivity className="text-accent" />
            Recent Activity
          </h2>
          <div className="macos-glass p-4 space-y-3">
            {recentActivity.length ? (
              recentActivity.map((submission) => (
                <Link key={submission._id} to={`/submission/${submission._id}`} className="block border border-glass-border rounded-xl p-3 hover:border-accent transition-colors">
                  <p className="font-semibold text-sm">{submission.challengeId?.title || 'Unknown Challenge'}</p>
                  <p className="text-secondary text-xs mt-1">{new Date(submission.submittedAt).toLocaleString()}</p>
                  <p className="text-xs mt-2 text-accent font-bold uppercase tracking-tighter">{submission.status}</p>
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

      {/* Pending Tasks Section - Full Width at Bottom */}
      <div className="mt-12 pt-8 border-t border-glass-border/20">
         <PendingTasks pendingCount={summaryQuery.data?.pending} />
      </div>
    </div>
  );
};

export default Dashboard;
