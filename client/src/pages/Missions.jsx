import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiGrid, FiList, FiX, FiTarget, FiClock } from 'react-icons/fi';
import { api } from '../lib/api';
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

const getLocalDrafts = () => {
  const drafts = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("challenge-draft:")) {
        const challengeId = key.split(":")[1];
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          const hasCode = draft.codeByLang && Object.values(draft.codeByLang).some(c => c && c.trim());
          if (draft.repoUrl?.trim() || hasCode) {
            drafts.push({
              _id: `draft-${challengeId}`,
              challengeId: {
                _id: challengeId,
                title: draft.challengeTitle || "Unknown Challenge",
                difficulty: draft.challengeDifficulty || "Easy",
                points: draft.challengePoints || 0,
              },
              status: "Attempted",
              submittedAt: draft.updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading drafts from localStorage", e);
  }
  return drafts;
};

const Missions = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSetId = searchParams.get('setId') || '';
  const navigate = useNavigate();

  // Fetch the active question set details when setId is present
  const activeSetQuery = useQuery({
    queryKey: ['question-set', initialSetId],
    queryFn: async () => {
      if (!initialSetId) return null;
      try {
        const res = await api.get(`/api/sets/${initialSetId}`);
        return res.data.data || null;
      } catch {
        return null;
      }
    },
    enabled: !!initialSetId,
  });

  const activeSet = activeSetQuery.data;

  const clearSetFilter = () => {
    navigate('/missions', { replace: true });
    setFilters(prev => ({ ...prev, setId: '' }));
  };

  const submissionsQuery = useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/submissions/my-submissions');
        return res.data.data || [];
      } catch { return []; }
    }
  });

  const subsMap = useMemo(() => {
    const map = {};
    (submissionsQuery.data || []).forEach(sub => {
      if (!sub.challengeId) return;
      const cid = typeof sub.challengeId === 'object'
        ? (sub.challengeId._id || sub.challengeId.id)
        : sub.challengeId;
      if (!cid) return;
      const cidStr = cid.toString();
      if (!map[cidStr] || sub.status === 'Accepted' || (sub.status === 'Pending' && map[cidStr] !== 'Accepted')) {
        map[cidStr] = sub.status;
      }
      
      const titleKey = sub.challengeId?.title?.trim().toLowerCase();
      if (titleKey) {
        if (!map[titleKey] || sub.status === 'Accepted' || (sub.status === 'Pending' && map[titleKey] !== 'Accepted')) {
          map[titleKey] = sub.status;
        }
      }
    });
    return map;
  }, [submissionsQuery.data]);

  const drafts = useMemo(() => getLocalDrafts(), []);

  const getBadge = (chId) => {
    if (subsMap[chId] === 'Accepted') {
      return { label: 'Solved', cls: 'bg-green-500/10 text-green-400 border-green-500/20' };
    }
    const hasDraft = drafts.some((d) => {
      const dcid = d.challengeId?._id || d.challengeId;
      return dcid && dcid.toString() === chId.toString();
    });
    if (hasDraft) {
      return { label: 'Attempted', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
    if (subsMap[chId] === 'Rejected') {
      return { label: 'Rejected', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    if (subsMap[chId] === 'Pending') {
      return { label: 'Pending Review', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    }
    return null;
  };
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
      try {
        const qs = buildChallengeQuery(filters);
        const res = await api.get(`/api/challenges?${qs}`);
        const data = res.data.data || [];

        return {
          data,
          meta: res.data.meta || { page: 1, totalPages: 1, total: data.length },
        };
      } catch {
        return {
          data: [],
          meta: { page: 1, totalPages: 1, total: 0 },
        };
      }
    },
  });
  // When filtering by setId, if no standalone Challenge docs exist, fall back
  // to the questions embedded in the QuestionSet document itself.
  const challenges = useMemo(() => {
    let apiData = challengesQuery.data?.data || [];

    if (filters.setId) {
      if (apiData.length > 0) {
        // use apiData
      } else if (activeSet?.questions?.length) {
        // Fallback: use the embedded questions from the question set
        apiData = activeSet.questions.map((q, i) => ({
          _id: `set-q-${i}`,
          title: q.title,
          description: q.description || '',
          difficulty: q.difficulty || 'Easy',
          points: q.points || 100,
          category: q.category || 'General',
          tags: q.tags || [],
          codeSnippets: q.codeSnippets || [],
          functionName: q.functionName || '',
          testCases: q.testCases || [],
          createdAt: activeSet.createdAt,
          questionSetId: filters.setId,
        }));
      } else {
        apiData = [];
      }
    }

    // Group and filter out duplicate questions by title (case-insensitive)
    const seen = new Set();
    const unique = [];
    for (const ch of apiData) {
      const titleKey = ch.title?.trim().toLowerCase();
      if (titleKey && !seen.has(titleKey)) {
        seen.add(titleKey);
        unique.push(ch);
      }
    }
    return unique;
  }, [challengesQuery.data, filters.setId, activeSet]);

  const meta = challengesQuery.data?.meta || { page: 1, totalPages: 1, total: challenges.length };

  // Determine which difficulties actually have questions (ignoring the active
  // difficulty filter) so we only render filter chips that are usable.
  const availableDifficultiesQuery = useQuery({
    queryKey: ["challenge-difficulties", filters.search, filters.category, filters.setId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", 1000);
        if (filters.search) params.set("search", filters.search);
        if (filters.category) params.set("category", filters.category);
        if (filters.setId) params.set("setId", filters.setId);
        const res = await api.get(`/api/challenges?${params.toString()}`);
        const data = res.data.data || [];
        return [...new Set(data.map((c) => c.difficulty).filter(Boolean))];
      } catch {
        return [];
      }
    },
  });

  const availableDifficulties = useMemo(() => {
    const set = new Set(availableDifficultiesQuery.data || []);
    // Include difficulties from a question set's embedded questions (used as a
    // fallback when no standalone Challenge documents exist).
    if (filters.setId && activeSet?.questions?.length) {
      activeSet.questions.forEach((q) => set.add(q.difficulty || "Easy"));
    }
    return set;
  }, [availableDifficultiesQuery.data, filters.setId, activeSet]);

  // Until we know what's available, show every chip to avoid flicker.
  const visibleDifficultyChips = useMemo(() => {
    if (availableDifficulties.size === 0) return difficultyChips;
    return difficultyChips.filter(
      (chip) => chip.value === "" || availableDifficulties.has(chip.value),
    );
  }, [availableDifficulties]);

  // Apply the Solved / Pending Review status filter client-side. The challenges
  // API has no per-user status, so we match against the user's own submissions.
  const statusFilteredChallenges = useMemo(() => {
    if (filters.status === 'Accepted') {
      return challenges.filter((ch) => {
        const titleKey = ch.title?.trim().toLowerCase();
        return subsMap[ch._id] === 'Accepted' || (titleKey && subsMap[titleKey] === 'Accepted');
      });
    }
    if (filters.status === 'Pending') {
      return challenges.filter((ch) => {
        const titleKey = ch.title?.trim().toLowerCase();
        return subsMap[ch._id] === 'Pending' || (titleKey && subsMap[titleKey] === 'Pending');
      });
    }
    if (filters.status === 'Rejected') {
      return challenges.filter((ch) => {
        const titleKey = ch.title?.trim().toLowerCase();
        return subsMap[ch._id] === 'Rejected' || (titleKey && subsMap[titleKey] === 'Rejected');
      });
    }
    // Default: Hide already solved and pending challenges from the dashboard
    return challenges.filter((ch) => {
      const chId = ch._id?.toString();
      const titleKey = ch.title?.trim().toLowerCase();
      const statusById = subsMap[chId];
      const statusByTitle = titleKey ? subsMap[titleKey] : null;
      const isSolved = statusById === 'Accepted' || statusByTitle === 'Accepted';
      const isPending = statusById === 'Pending' || statusByTitle === 'Pending';
      return !isSolved && !isPending;
    });
  }, [challenges, filters.status, subsMap]);

  const groupedChallenges = useMemo(() => {
    if (filters.grouping === 'none') return { "All Missions": statusFilteredChallenges };

    return statusFilteredChallenges.reduce((acc, ch) => {
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
  }, [statusFilteredChallenges, filters.grouping]);

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
        title={activeSet ? activeSet.title : "All Missions"}
        subtitle={activeSet
          ? "Complete this week's curated set of challenges."
          : "Browse all available challenges, filter by difficulty, and push your limits."
        }
        showBack={true}
        backUrl="/dashboard"
        actions={activeSet && (
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-bold md:mb-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 font-h2 rounded-full bg-accent/10 text-accent">
              Week {activeSet.weekNumber}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-h2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FiTarget size={12} /> Target: {activeSet.targetLevel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-h2 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <FiClock size={12} /> Due {new Date(activeSet.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          </div>
        )}
      />

      {/* Question Set Filter Banner */}


      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <input
          className="field-input w-full sm:w-64 h-11 py-0"
          placeholder="Search title or description"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />
        <input
          className="field-input w-full sm:w-48 h-11 py-0"
          placeholder="Category or Tag"
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
        />

        <select
          className="field-select px-3 text-xs w-full sm:w-auto h-11 py-0"
          value={filters.limit}
          onChange={(e) => handleFilterChange("limit", Number(e.target.value))}
        >
          <option value={6}>6 / page</option>
          <option value={12}>12 / page</option>
          <option value={24}>24 / page</option>
        </select>

        <select
          className="field-select px-3 text-xs w-full sm:w-auto h-11 py-0"
          value={filters.sortBy}
          onChange={(e) => handleFilterChange("sortBy", e.target.value)}
        >
          <option value="createdAt">Date (Newest)</option>
          <option value="points">XP Points</option>
          <option value="difficulty">Difficulty</option>
          <option value="title">Title</option>
        </select>

        <select
          className="field-select px-3 text-xs w-full sm:w-auto h-11 py-0"
          value={filters.grouping}
          onChange={(e) => handleFilterChange("grouping", e.target.value)}
        >
          <option value="none">No Grouping</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {activeSet && (
          <button
            type="button"
            onClick={clearSetFilter}
            className="flex items-center justify-center gap-2 px-4 h-11 rounded-md text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 transition-all duration-200"
          >
            <FiX size={14} />
            Show All Missions
          </button>
        )}
      </div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left Side: Difficulty Chips */}
          <div className="chip-group flex flex-wrap gap-2">
            {visibleDifficultyChips.map((chip) => (
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
          <div className="flex bg-glass-border/30 rounded-lg p-1 flex-wrap gap-1">
            {['All', 'Accepted', 'Pending', 'Rejected'].map(st => {
              const label =
                st === 'Accepted' ? 'Solved' :
                st === 'Pending' ? 'Pending Review' :
                st === 'Rejected' ? 'Rejected' : 'All';
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
                                {(() => {
                                  const badge = getBadge(challenge._id);
                                  return badge && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>{badge.label}</span>
                                  );
                                })()}
                                <span className="text-secondary text-sm font-bold">{challenge.points} XP</span>
                              </div>
                            </div>
                            <div className="flex items-start justify-between gap-3 mt-2">
                              <h2 className="text-xl font-bold group-hover:text-accent transition-colors line-clamp-2 flex-1 font-h2">{challenge.title}</h2>
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
                                <h2 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-1 flex-1 font-h2">{challenge.title}</h2>
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
                              {(() => {
                                const badge = getBadge(challenge._id);
                                return badge && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls} hidden sm:block`}>{badge.label}</span>
                                );
                              })()}
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
