import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiAward, FiSearch, FiUsers, FiUser } from "react-icons/fi";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import PageHeader from "../components/PageHeader";
import { api } from "../lib/api";
import { USE_MOCK, mockLeaderboardMembers, mockClans, paginate } from "../lib/mockData";
import { useAuth } from "../context/useAuth";

const Leaderboard = () => {
  const { user } = useAuth();
  const [board, setBoard] = useState("members"); // "members" | "clans"
  const [filters, setFilters] = useState({ window: "all", page: 1, limit: 20 });
  const [search, setSearch] = useState("");

  // ─── Members Leaderboard ──────────────────────────────────────
  const membersQuery = useQuery({
    queryKey: ["leaderboard", filters],
    enabled: board === "members",
    queryFn: async () => {
      if (USE_MOCK) return paginate(mockLeaderboardMembers, filters);
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

  // ─── Clans Leaderboard ────────────────────────────────────────
  const clansQuery = useQuery({
    queryKey: ["clan-leaderboard", filters],
    enabled: board === "clans",
    queryFn: async () => {
      if (USE_MOCK) return paginate(mockClans, filters);
      const params = new URLSearchParams({
        window: filters.window,
        page: String(filters.page),
        limit: String(filters.limit),
      });
      const res = await api.get(
        `/api/clans/leaderboard?${params.toString()}`,
      );
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const activeQuery = board === "members" ? membersQuery : clansQuery;
  const meta = activeQuery.data?.meta || {};
  const rows = useMemo(
    () => activeQuery.data?.data || [],
    [activeQuery.data],
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    if (board === "members") {
      return rows.filter((row) => row.username?.toLowerCase().includes(query));
    }
    return rows.filter((row) => row.name?.toLowerCase().includes(query));
  }, [rows, search, board]);

  const myRow = board === "members"
    ? rows.find((row) => row.username === user?.username)
    : null;

  const handleBoardChange = (newBoard) => {
    if (newBoard === board) return;
    setBoard(newBoard);
    setSearch("");
    setFilters((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        subtitle={board === "members"
          ? "Track top solvers and compare your rank."
          : "See which clans are dominating the arena."}
        actions={
          <>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                className="field-input !pl-9 min-w-56"
                placeholder={board === "members" ? "Search username" : "Search clan name"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="field-select"
              value={filters.window}
              onChange={(e) =>
                setFilters((p) => ({ ...p, page: 1, window: e.target.value }))
              }
              aria-label="Leaderboard timeframe"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <select
              className="field-select"
              value={filters.limit}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  page: 1,
                  limit: Number(e.target.value),
                }))
              }
              aria-label="Leaderboard page size"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </>
        }
      />

      {/* Board Toggle */}
      <div className="flex items-center gap-3">
        <div className="segmented">
          <button
            className={`segmented-btn flex items-center gap-2 ${board === "members" ? "active" : ""}`}
            onClick={() => handleBoardChange("members")}
          >
            <FiUser size={14} />
            Members
          </button>
          <button
            className={`segmented-btn flex items-center gap-2 ${board === "clans" ? "active" : ""}`}
            onClick={() => handleBoardChange("clans")}
          >
            <FiUsers size={14} />
            Clans
          </button>
        </div>
      </div>

      {/* My Rank Banner (members only) */}
      {board === "members" && myRow ? (
        <div className="macos-glass p-4 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Your rank on this page window:</span>
          <span className="text-accent font-bold">
            #{myRow.rank} - {myRow.totalPoints} pts
          </span>
        </div>
      ) : null}

      {/* ─── MEMBERS TABLE ─────────────────────────────────────── */}
      {board === "members" && (
        <Card className="p-0 overflow-hidden">
          {activeQuery.isLoading ? (
            <div className="p-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No rankings found"
                description="Try another filter or search query."
              />
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-auto">
                <table className="responsive-table text-left">
                  <thead>
                    <tr className="border-b border-glass-border text-secondary text-xs uppercase tracking-wide">
                      <th className="p-4">Rank</th>
                      <th className="p-4">User</th>
                      <th className="p-4 text-center">Solved</th>
                      <th className="p-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((leader) => {
                      const isMe = leader.username === user?.username;
                      const isPodium = leader.rank <= 3;
                      return (
                        <tr
                          key={`${leader._id}-${leader.rank}`}
                          className={`border-b border-glass-border/70 ${isMe ? "bg-accent/10" : ""} ${isPodium ? "bg-white/[0.03]" : ""}`}
                        >
                          <td className="p-4 font-semibold">#{leader.rank}</td>
                          <td className="p-4 font-semibold">
                            <span className="inline-flex items-center gap-2">
                              {isPodium ? (
                                <FiAward className="text-yellow-400" />
                              ) : null}
                              {leader.username}
                            </span>
                            {isMe && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-accent text-white">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-secondary">
                            {leader.solvedCount}
                          </td>
                          <td className="p-4 text-right font-bold text-green-400">
                            {leader.totalPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden p-4 space-y-3">
                {visibleRows.map((leader) => {
                  const isMe = leader.username === user?.username;
                  return (
                    <div
                      key={`${leader._id}-${leader.rank}`}
                      className={`border border-glass-border rounded-xl p-4 ${isMe ? "bg-accent/10" : ""}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">#{leader.rank}</span>
                        <span className="font-bold text-green-400">
                          {leader.totalPoints} pts
                        </span>
                      </div>
                      <div className="font-semibold">
                        {leader.username}
                        {isMe && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-accent text-white">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-secondary text-sm">
                        Solved: {leader.solvedCount}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ─── CLANS TABLE ───────────────────────────────────────── */}
      {board === "clans" && (
        <Card className="p-0 overflow-hidden">
          {activeQuery.isLoading ? (
            <div className="p-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No clans found"
                description="Try another filter or search query."
              />
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-auto">
                <table className="responsive-table text-left">
                  <thead>
                    <tr className="border-b border-glass-border text-secondary text-xs uppercase tracking-wide">
                      <th className="p-4">Rank</th>
                      <th className="p-4">Clan</th>
                      <th className="p-4 text-center">Members</th>
                      <th className="p-4 text-center">Challenges Solved</th>
                      <th className="p-4 text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((clan, index) => {
                      const rank = clan.rank || index + 1;
                      const isPodium = rank <= 3;
                      return (
                        <tr
                          key={clan._id}
                          className={`border-b border-glass-border/70 ${isPodium ? "bg-white/[0.03]" : ""}`}
                        >
                          <td className="p-4 font-semibold">#{rank}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                                {isPodium ? (
                                  <FiAward size={16} className="text-yellow-400" />
                                ) : (
                                  <FiUsers size={14} className="text-secondary" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">{clan.name}</p>
                                {clan.tag && (
                                  <p className="text-secondary text-xs">[{clan.tag}]</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center text-secondary">
                            {clan.memberCount ?? "-"}
                          </td>
                          <td className="p-4 text-center text-secondary">
                            {clan.solvedCount ?? "-"}
                          </td>
                          <td className="p-4 text-right font-bold text-green-400">
                            {clan.totalPoints ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden p-4 space-y-3">
                {visibleRows.map((clan, index) => {
                  const rank = clan.rank || index + 1;
                  const isPodium = rank <= 3;
                  return (
                    <div
                      key={clan._id}
                      className="border border-glass-border rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {isPodium && <FiAward className="text-yellow-400" />}
                          <span className="font-bold">#{rank}</span>
                        </div>
                        <span className="font-bold text-green-400">
                          {clan.totalPoints ?? 0} pts
                        </span>
                      </div>
                      <div className="font-semibold">
                        {clan.name}
                        {clan.tag && (
                          <span className="ml-2 text-xs text-secondary">[{clan.tag}]</span>
                        )}
                      </div>
                      <div className="text-secondary text-sm flex gap-4 mt-1">
                        <span>{clan.memberCount ?? "-"} members</span>
                        <span>{clan.solvedCount ?? "-"} solved</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Pagination */}
      <div className="macos-glass p-4 flex items-center justify-between">
        <span className="text-secondary text-sm">
          Page {meta.page || filters.page} of {meta.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            disabled={(meta.page || filters.page) <= 1}
            onClick={() =>
              setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
            }
          >
            Prev
          </button>
          <button
            className="btn-secondary"
            disabled={(meta.page || filters.page) >= (meta.totalPages || 1)}
            onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
