import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiGrid, FiList } from 'react-icons/fi';
import { api } from '../lib/api';
import { mockChallenges } from '../lib/mockData';
import ChallengeCard from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/useAuth';

const buildChallengeQuery = ({
  page,
  limit,
  search,
  difficulty,
  category,
  setId,
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
  if (setId) params.set("setId", setId);
  return params.toString();
};

const difficultyChips = [
  { value: "", label: "All" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];
const FALLBACK_CREATED_AT = '2026-01-01T00:00:00.000Z';

const getRGB = (d) =>
  d === "Easy" ? "34,197,94" : d === "Medium" ? "234,179,8" : d === "Hard" ? "239,68,68" : "99,102,241";

const Missions = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSetId = searchParams.get('setId') || '';
  
  const submissionsQuery = useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/submissions/my');
        return res.data.data || [];
      } catch { return []; }
    }
  });

  const subsMap = useMemo(() => {
    const map = {};
    (submissionsQuery.data || []).forEach(sub => {
      // Prioritize Accepted over Pending if multiple
      if (!map[sub.challengeId?._id] || sub.status === 'Accepted') {
        map[sub.challengeId?._id] = sub.status;
      }
    });
    return map;
  }, [submissionsQuery.data]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50, // Increase limit when grouping to show all related items
    search: "",
    difficulty: "",
    category: "",
    status: "All", // 'All', 'Accepted', 'Pending'
    setId: initialSetId,
    sortBy: "createdAt",
    sortDir: "desc",
    grouping: "none", // 'none', 'weekly', 'monthly'
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
      const getFilteredMockData = () => {
        let filtered = mockChallenges;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower) ||
            (c.category && c.category.toLowerCase().includes(searchLower)) ||
            (Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase().includes(searchLower)))
          );
        }
        if (filters.difficulty) {
          filtered = filtered.filter(c => c.difficulty === filters.difficulty);
        }
        if (filters.category) {
          const categoryLower = filters.category.toLowerCase();
          filtered = filtered.filter(c => c.category && c.category.toLowerCase().includes(categoryLower));
        }
        if (filters.status !== "All") {
          filtered = filtered.filter(c => {
            const st = subsMap[c._id];
            return st === filters.status;
          });
        }
        return filtered;
      };

      try {
        const qs = buildChallengeQuery(filters);
        const res = await api.get(`/api/challenges?${qs}`);
        const data = res.data.data || [];

        if (data.length > 0) {
          return {
            data,
            meta: res.data.meta || { page: 1, totalPages: 1, total: data.length },
          };
        }

        const filteredMock = getFilteredMockData();
        return {
          data: filteredMock,
          meta: { page: 1, totalPages: Math.ceil(filteredMock.length / filters.limit) || 1, total: filteredMock.length },
        };
      } catch {
        const filteredMock = getFilteredMockData();
        return {
          data: filteredMock,
          meta: { page: 1, totalPages: Math.ceil(filteredMock.length / filters.limit) || 1, total: filteredMock.length },
        };
      }
    },
  });

  const challenges = challengesQuery.data?.data?.length ? challengesQuery.data.data : mockChallenges;
  const meta = challengesQuery.data?.meta || { page: 1, totalPages: 1, total: challenges.length };

  const groupedChallenges = useMemo(() => {
    if (filters.grouping === 'none') return { "All Missions": challenges };

    return challenges.reduce((acc, ch) => {
      const date = new Date(ch.createdAt || FALLBACK_CREATED_AT);
      let key = "";

      if (filters.grouping === 'weekly') {
        if (ch.questionSetId && typeof ch.questionSetId === 'object' && typeof ch.questionSetId.weekNumber === 'number') {
          key = `Week ${ch.questionSetId.weekNumber}`;
        } else if (typeof ch.weekNumber === 'number') {
          key = `Week ${ch.weekNumber}`;
        } else {
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          key = `Week ${weekNum}`;
        }
      } else if (filters.grouping === 'monthly') {
        key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(ch);
      return acc;
    }, {});
  }, [challenges, filters.grouping]);

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
          placeholder="Category or Tag"
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
            <option value="createdAt">Date (Newest)</option>
            <option value="points">XP Points</option>
            <option value="difficulty">Difficulty</option>
            <option value="title">Title</option>
          </select>

          <select
            className="field-select flex-1 min-w-[70px] md:w-full px-3 py-2 sm:px-3 sm:py-3"
            value={filters.grouping}
            onChange={(e) => handleFilterChange("grouping", e.target.value)}
          >
            <option value="none">No Grouping</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left Side: Difficulty Chips */}
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

          {/* Status Tabs */}
          <div className="flex bg-glass-border/30 rounded-lg p-1">
            {['All', 'Accepted', 'Pending'].map(st => {
              const label = st === 'Accepted' ? 'Solved' : st === 'Pending' ? 'Pending Review' : 'All';
              return (
                <button
                  key={st}
                  onClick={() => handleFilterChange("status", st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filters.status === st ? 'bg-accent/20 text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: View Mode Toggle & Clan Stat */}
        <div className="flex items-center gap-4">
          {user?.clan && (
            <div className="hidden xl:flex items-center gap-3 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Clan vs Global Solve Rate</span>
              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 w-[60%]" title="Clan: 60%" />
                <div className="h-full bg-accent w-[40%]" title="Global: 40%" />
              </div>
            </div>
          )}
          
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
          <div className="space-y-12">
            {Object.entries(groupedChallenges).map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black text-primary uppercase tracking-widest">{groupName}</h2>
                  <div className="h-[1px] flex-1 bg-glass-border/30" />
                  <span className="text-xs text-tertiary font-bold">{groupItems.length} Missions</span>
                </div>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {groupItems.map((challenge, index) => (
                      <MotionBlock
                        key={challenge._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Link to={`/challenge/${challenge._id}`} className="group block h-full">
                          <ChallengeCard
                            className="h-full p-6 !rounded-2xl"
                            innerClassName="flex flex-col gap-3 h-full justify-between w-full"
                            difficultyColor={getRGB(challenge.difficulty)}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                challenge.difficulty === "Easy" ? "bg-green-500/20 text-green-500" :
                                challenge.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"
                              }`}>
                                {challenge.difficulty}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {subsMap[challenge._id] === 'Accepted' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Approved</span>
                                )}
                                {subsMap[challenge._id] === 'Pending' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending Review</span>
                                )}
                                <span className="text-secondary text-sm font-bold">{challenge.points} XP</span>
                              </div>
                            </div>
                            <div className="flex items-start justify-between gap-3 mt-2">
                              <h3 className="text-xl font-bold group-hover:text-accent transition-colors line-clamp-2 flex-1">{challenge.title}</h3>
                              {new Date() - new Date(challenge.createdAt || Date.now()) < 7 * 24 * 60 * 60 * 1000 && (
                                <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 flex-shrink-0 mt-1">New</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-auto pt-4">
                              {challenge.tags && challenge.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">{tag}</span>
                              ))}
                              {(!challenge.tags || challenge.tags.length === 0) && challenge.category && (
                                <span className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">{challenge.category}</span>
                              )}
                            </div>
                          </ChallengeCard>
                        </Link>
                      </MotionBlock>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupItems.map((challenge, index) => (
                      <MotionBlock
                        key={challenge._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Link to={`/challenge/${challenge._id}`} className="group block">
                          <ChallengeCard
                            className="p-4 sm:p-6 !rounded-2xl"
                            innerClassName="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full h-full"
                            difficultyColor={getRGB(challenge.difficulty)}
                          >
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <h3 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-1 flex-1">{challenge.title}</h3>
                                {new Date() - new Date(challenge.createdAt || Date.now()) < 7 * 24 * 60 * 60 * 1000 && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 flex-shrink-0 mt-0.5">New</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {challenge.tags && challenge.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-secondary border border-white/5">{tag}</span>
                                ))}
                                {(!challenge.tags || challenge.tags.length === 0) && challenge.category && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-secondary border border-white/5">{challenge.category}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              {subsMap[challenge._id] === 'Accepted' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 hidden sm:block">Approved</span>
                              )}
                              {subsMap[challenge._id] === 'Pending' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hidden sm:block">Pending Review</span>
                              )}
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                challenge.difficulty === "Easy" ? "bg-green-500/20 text-green-500" :
                                challenge.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"
                              }`}>
                                {challenge.difficulty}
                              </span>
                              <span className="text-secondary text-sm min-w-[60px] text-right font-bold">{challenge.points} XP</span>
                            </div>
                          </ChallengeCard>
                        </Link>
                      </MotionBlock>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

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
