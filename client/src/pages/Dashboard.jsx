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
  FiMessageSquare,
} from "react-icons/fi";
import { api } from "../lib/api";
import {
  USE_MOCK,
  mockChallenges,
  mockDashboardSummary,
} from "../lib/mockData";
import BaseCard from "../components/BaseCard";

import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ChallengeCard from "../components/Card";
import { useSocket } from "../hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const MotionBlock = motion.div;
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

const Dashboard = () => {
  const { user } = useAuth();
  const [limit] = useState(4);

  const queryClient = useQueryClient();

  useSocket("challenge_update", () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-challenges"] });
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
  });

  useSocket("leaderboard_update", () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  });


  const challengesQuery = useQuery({
    queryKey: ["dashboard-challenges", limit],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockChallenges.slice(0, limit);
      }

      try {
        const res = await api.get(`/api/challenges?limit=${limit}&sortBy=createdAt&sortDir=desc`);
        const data = res.data.data || [];
        return data.length > 0 ? data : mockChallenges.slice(0, limit);
      } catch {
        return mockChallenges.slice(0, limit);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${getGreeting()}, ${user?.username || "Commander"}`}
        subtitle="Track progress, jump back into your latest work, and command the arena."
      />

      <ChallengeCard
        className="relative overflow-hidden rounded-3xl border border-accent/20 p-8 md:p-12"
        style={{
          background:
            "linear-gradient(135deg, rgba(var(--accent-rgb),0.08) 0%, rgba(var(--accent-rgb),0.02) 50%, rgba(168,85,247,0.06) 100%)",
          boxShadow: "0 4px 24px rgba(var(--accent-rgb), 0.08)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-2xl"
        >
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
            <div className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs">
              <FiZap className="text-yellow-400" />
              <span className="font-bold">+50 Bonus XP</span>
            </div>
          </div>
        </motion.div>
        <div className="pointer-events-none absolute right-0 top-1/2 translate-x-1/4 -translate-y-1/2 opacity-10">
          <FiCpu size={400} className="text-accent" />
        </div>
      </ChallengeCard>


      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card, index) => {
          const Icon = card.icon;
          return (
            <MotionBlock
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BaseCard className="p-6 !rounded-3xl" hover={false} >
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
              </BaseCard>
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
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                    <ChallengeCard
                      className="h-full p-6"
                      difficultyColor={getDifficultyRGB(challenge.difficulty)}
                    >
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
                    </ChallengeCard>
                  </Link>
                </MotionBlock>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/missions"
              className={`btn-secondary flex w-full items-center justify-center gap-2 py-3 transition-all hover:border-accent/40 hover:bg-white/5`}
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
          <div className="custom-scrollbar space-y-2 overflow-y-auto macos-glass p-4 xl:h-[350px]">
            {sortedActivity.length ? (
              sortedActivity.map((submission) => (
                <Link
                  key={submission._id}
                  to={`/submission/${submission._id}`}
                  className="group block"
                >
                  <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 transition-all hover:border-accent/30 hover:bg-white/70 dark:hover:bg-accent/5">
                    <p className="line-clamp-1 text-sm font-semibold group-hover:text-accent transition-colors">
                      {submission.challengeId?.title || "Unknown Challenge"}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="text-xs text-secondary">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {submission.status === "Rejected" && submission.reviewComment && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[9px] font-bold">
                            <FiMessageSquare size={9} />
                            Feedback
                          </span>
                        )}
                        <p
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                            submission.status === "Accepted"
                              ? "bg-green-500/15 text-green-500"
                              : submission.status === "Rejected"
                                ? "bg-red-500/15 text-red-500"
                                : "bg-yellow-500/15 text-yellow-500"
                          }`}
                        >
                          {submission.status}
                        </p>
                      </div>
                    </div>
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
