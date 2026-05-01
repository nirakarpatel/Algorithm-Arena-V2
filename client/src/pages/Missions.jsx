import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiGrid, FiList } from 'react-icons/fi';
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

const Missions = () => {
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
    () => localStorage.getItem("missions:view") || "grid",
  );

  useEffect(() => {
    localStorage.setItem("missions:view", viewMode);
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

  const challenges = challengesQuery.data?.data?.length ? challengesQuery.data.data : mockChallenges;
  const meta = challengesQuery.data?.meta || { page: 1, totalPages: 1, total: challenges.length };
  const MotionBlock = motion.div;

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
        title="All Missions"
        subtitle="Browse all available challenges, filter by difficulty, and push your limits."
      />

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

      <div className="space-y-6">
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
                limit: 12,
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
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                            className={`px-3 py-1 rounded-full text-xs font-bold ${challenge.difficulty === "Easy"
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
                          className="text-secondary text-sm mt-2 line-clamp-2"
                        >
                          {challenge.description}
                        </p>
                      </div>
                    </Link>
                  </MotionBlock>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {challenges.map((challenge, index) => (
                  <MotionBlock
                    key={challenge._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link to={`/challenge/${challenge._id}`} className="group">
                      <div className="macos-glass p-4 sm:p-6 hover:border-accent transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div>
                          <h3 className="text-lg font-bold group-hover:text-accent transition-colors">
                            {challenge.title}
                          </h3>
                          <p className="text-secondary text-sm mt-1">
                            {challenge.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${challenge.difficulty === "Easy"
                                ? "bg-green-500/20 text-green-500"
                                : challenge.difficulty === "Medium"
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                          >
                            {challenge.difficulty}
                          </span>
                          <span className="text-secondary text-sm min-w-[60px] text-right">
                            {challenge.points} XP
                          </span>
                        </div>
                      </div>
                    </Link>
                  </MotionBlock>
                ))}
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-glass-border/40 pt-6 mt-8">
                <span className="text-secondary text-sm">
                  Showing {challenges.length} of {meta.total} challenges
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(-1)}
                    disabled={filters.page === 1}
                    className="btn-secondary px-4 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={filters.page >= meta.totalPages}
                    className="btn-secondary px-4 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Missions;
