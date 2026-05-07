import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiAward,
  FiSearch,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import PageHeader from "../components/PageHeader";
import { useSocket } from "../hooks/useSocket";
import { api } from "../lib/api";
import { USE_MOCK, mockLeaderboardMembers } from "../lib/mockData";
import { useAuth } from "../context/useAuth";

const MotionDiv = motion.div;
const MotionRow = motion.tr;

const Podium = ({ items, leaderType }) => {
  const podiumSteps = [items[1], items[0], items[2]];
  const colors = [
    "from-slate-400/80 via-slate-300 to-slate-500/50",
    "from-yellow-500 via-yellow-200 to-yellow-600/50",
    "from-orange-600 via-orange-300 to-orange-700/50",
  ];
  const heights = ["h-32 md:h-44", "h-40 md:h-60", "h-24 md:h-36"];
  const delays = [0.2, 0, 0.4];

  if (!items.length) {
    return null;
  }

  return (
    <div className="mt-12 mb-16 flex items-end justify-center gap-2 px-4 md:gap-8">
      {podiumSteps.map((item, index) => {
        if (!item) {
          return <div key={index} className="invisible flex-1" />;
        }

        const isFirst = index === 1;
        return (
          <MotionDiv
            key={item._id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: delays[index], duration: 0.6 }}
            className="relative flex max-w-[120px] flex-1 flex-col items-center md:max-w-[200px]"
          >
            <div className="mb-6 text-center">
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 bg-glass-surface shadow-2xl md:h-20 md:w-20 ${
                  isFirst
                    ? "border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                    : "border-white/10"
                }`}
              >
                {item.profilePicture ? (
                  <img
                    src={item.profilePicture}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-primary md:text-3xl">
                    {(item.username || item.name || "?")[0]}
                  </span>
                )}
              </div>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-accent">
                {isFirst ? "Grandmaster" : index === 0 ? "Legend" : "Elite"}
              </span>
              <p className="truncate px-1 text-sm font-bold text-primary md:text-base">
                {item.username || item.name}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <FiZap size={10} className="text-accent" />
                <p className="text-sm font-black tracking-tighter text-secondary md:text-lg">
                  {item.totalPoints.toLocaleString()}
                </p>
              </div>
              {leaderType === "clans" && (
                <p className="mt-1 text-[10px] uppercase tracking-widest text-tertiary">
                  {item.memberCount ?? 0} members
                </p>
              )}
            </div>

            <div
              className={`relative flex w-full flex-col items-center justify-start rounded-t-3xl border-t border-white/20 bg-gradient-to-b pt-6 shadow-2xl ${colors[index]} ${heights[index]}`}
            >
              <span className="select-none text-5xl font-black text-white/20 md:text-8xl">
                {index === 1 ? "1" : index === 0 ? "2" : "3"}
              </span>
              {isFirst && (
                <FiAward
                  size={40}
                  className="absolute -top-6 text-yellow-400"
                />
              )}
            </div>
          </MotionDiv>
        );
      })}
    </div>
  );
};

const Leaderboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ window: "all", page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const [leaderType, setLeaderType] = useState("individual");

  useSocket("leaderboard_update", () => {
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["clan-leaderboard"] });
  });

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", filters],
    enabled: leaderType === "individual",
    queryFn: async () => {
      if (USE_MOCK) {
        return {
          data: mockLeaderboardMembers,
          meta: { page: 1, totalPages: 1 },
        };
      }

      const params = new URLSearchParams({
        window: filters.window,
        page: String(filters.page),
        limit: String(filters.limit),
      });
      const res = await api.get(
        `/api/submissions/leaderboard?${params.toString()}`,
      );
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const clanLeaderboardQuery = useQuery({
    queryKey: ["clan-leaderboard", filters.window],
    enabled: leaderType === "clans",
    queryFn: async () => {
      try {
        const res = await api.get(
          `/api/clans/leaderboard?window=${filters.window}`,
        );
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const rows = useMemo(() => {
    return leaderType === "clans"
      ? clanLeaderboardQuery.data || []
      : leaderboardQuery.data?.data || [];
  }, [clanLeaderboardQuery.data, leaderboardQuery.data, leaderType]);

  const meta =
    leaderType === "clans"
      ? { page: 1, totalPages: 1 }
      : leaderboardQuery.data?.meta || {};

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      (row.username || row.name || "").toLowerCase().includes(query),
    );
  }, [rows, search]);

  const topThree = visibleRows.slice(0, 3);
  const myRow =
    leaderType === "individual"
      ? rows.find((row) => row.username === user?.username)
      : null;
  const loading =
    leaderType === "individual"
      ? leaderboardQuery.isLoading
      : clanLeaderboardQuery.isLoading;

  return (
    <div className="relative space-y-6 pb-20">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[10%] h-[50%] w-[50%] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <PageHeader
        title="Hall of Fame"
        subtitle="Celebrate the top rankers and elite clans of the arena."
      />

      <div className="grid grid-cols-1 gap-4 macos-glass p-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
        <div className="segmented inline-flex">
          <button
            type="button"
            className={`segmented-btn flex items-center gap-2 ${leaderType === "individual" ? "active" : ""}`}
            onClick={() => setLeaderType("individual")}
          >
            <FiUser size={14} />
            Individuals
          </button>
          <button
            type="button"
            className={`segmented-btn flex items-center gap-2 ${leaderType === "clans" ? "active" : ""}`}
            onClick={() => setLeaderType("clans")}
          >
            <FiUsers size={14} />
            Clans
          </button>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            name="leaderboardSearch"
            className="field-input pl-9"
            placeholder={
              leaderType === "individual"
                ? "Search coders..."
                : "Search clans..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          name="leaderboardWindow"
          className="field-select"
          value={filters.window}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, page: 1, window: e.target.value }))
          }
        >
          <option value="all">All Time</option>
          <option value="30d">Last 30 Days</option>
          <option value="7d">Last 7 Days</option>
        </select>

        <select
          name="leaderboardLimit"
          className="field-select"
          value={filters.limit}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              limit: Number(e.target.value),
            }))
          }
          disabled={leaderType === "clans"}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {!search.trim() && <Podium items={topThree} leaderType={leaderType} />}

      {myRow && leaderType === "individual" && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="macos-glass flex flex-wrap items-center justify-between gap-2 border-accent/30 bg-accent/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/20 p-2 text-accent">
              <FiTrendingUp />
            </div>
            <span className="font-semibold text-primary">
              Your current standing in this window
            </span>
          </div>
          <span className="text-lg font-bold text-accent">
            Rank #{myRow.rank} - {myRow.totalPoints} pts
          </span>
        </MotionDiv>
      )}

      <div className="overflow-hidden p-0 macos-glass">
        {loading ? (
          <div className="space-y-3 p-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              title="No rankings found"
              description="Adjust your filters or try a different search."
            />
          </div>
        ) : (
          <MotionDiv
            key={leaderType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="hidden overflow-auto md:block">
              <table className="responsive-table text-left">
                <thead>
                  <tr
                    className="text-xs font-bold uppercase tracking-widest text-secondary"
                    style={{
                      borderBottom: "1px solid rgba(var(--accent-rgb), 0.08)",
                    }}
                  >
                    <th className="p-6">Rank</th>
                    <th className="p-6">
                      {leaderType === "individual" ? "Coder" : "Clan"}
                    </th>
                    <th className="p-6 text-center">
                      {leaderType === "individual" ? "Solved" : "Members"}
                    </th>
                    <th className="p-6 text-right">XP Points</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item, index) => {
                    const isMe =
                      leaderType === "individual" &&
                      item.username === user?.username;
                    const rank = item.rank || index + 1;
                    return (
                      <MotionRow
                        key={item._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border-b transition-colors hover:bg-white/[0.02] ${
                          isMe ? "border-l-4 border-l-accent bg-accent/5" : ""
                        }`}
                        style={{
                          borderBottomColor: isMe
                            ? "rgba(var(--accent-rgb), 0.12)"
                            : "rgba(128, 128, 128, 0.08)",
                        }}
                      >
                        <td className="p-6">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-glass-surface text-sm font-bold text-primary">
                            {rank}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-glass-surface font-bold text-accent">
                              {item.profilePicture ? (
                                <img
                                  src={item.profilePicture}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (item.username || item.name || "?")[0]
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 font-bold text-primary">
                                {item.username || item.name}
                                {isMe && (
                                  <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] italic text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              {leaderType === "clans" && item.tag && (
                                <p className="text-xs text-secondary">
                                  [{item.tag}]
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center text-secondary">
                          {leaderType === "individual"
                            ? item.solvedCount
                            : item.memberCount}
                        </td>
                        <td className="p-6 text-right font-black text-accent">
                          {item.totalPoints.toLocaleString()}
                        </td>
                      </MotionRow>
                    );
                  })}
                </tbody>
              </table>
            </div>

              <div className="space-y-3 p-4 md:hidden">
               {visibleRows.map((item, index) => {
                const rank = item.rank || index + 1;
                const isMe =
                  leaderType === "individual" &&
                  item.username === user?.username;
                return (
                  <div
                    key={item._id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isMe
                        ? "border-accent/40 bg-accent/5"
                        : "border-black/[0.06] dark:border-white/[0.06] bg-white/40 dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-secondary">
                          #{rank}
                        </span>
                        <span className="text-lg font-bold">
                          {item.username || item.name}
                        </span>
                      </div>
                      <span className="font-black text-accent">
                        {item.totalPoints} pts
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-secondary">
                      <span>
                        {leaderType === "individual"
                          ? `Solved: ${item.solvedCount}`
                          : `${item.memberCount} members`}
                      </span>
                      {leaderType === "clans" && (
                        <span>{item.solvedCount ?? 0} solved</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </MotionDiv>
        )}
      </div>

      {leaderType === "individual" && (meta.totalPages || 1) > 1 && (
        <div className="macos-glass flex items-center justify-between p-4">
          <span className="text-sm text-secondary">
            Page {meta.page || filters.page} of {meta.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={(meta.page || filters.page) <= 1}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
            >
              Prev
            </button>
            <button
              className="btn-secondary"
              disabled={(meta.page || filters.page) >= (meta.totalPages || 1)}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
