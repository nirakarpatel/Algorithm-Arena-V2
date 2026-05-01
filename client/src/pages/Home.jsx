import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiCpu,
  FiCode,
  FiTrendingUp,
  FiZap,
  FiArrowRight,
  FiClock,
  FiActivity,
} from "react-icons/fi";
import Card from "../components/Card";
import SkeletonCard from "../components/SkeletonCard";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";
import { USE_MOCK, mockChallenges, mockSubmissions, mockCurrentUser } from "../lib/mockData";

const MotionBlock = motion.div;

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Fetch latest 6 challenges
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
        return mockSubmissions.filter(s => 
          s.status === 'Pending' && 
          (s.userId._id === mockCurrentUser.id || s.userId === mockCurrentUser.id)
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
      {/* Background Ambience (Manual override for landing page) */}


      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-6 max-auto w-full">
        {/* Logo: Icon removed, kept the gradient text for branding */}
        <Link to="/" className="group">
          <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500 transition-opacity group-hover:opacity-90">
            AlgoArena
          </span>
        </Link>

        <div className="flex gap-2 items-center">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent/90 text-white font-semibold text-sm transition-all shadow-lg shadow-accent/20 hover:-translate-y-0.5"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-1 text-secondary hover:text-primary hover:bg-white/5 rounded-full font-semibold text-sm transition-all"
              >
                Log in
              </Link>

              <Link
                to="/register"
                className="px-4 py-1 rounded-full bg-gradient-to-r from-accent via-purple-500 to-pink-500 text-white font-bold text-sm transition-all shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-8 ">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            Official GDG Platform
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Master Data Structures <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-purple-500 to-pink-500">
              & Algorithms.
            </span>
          </h1>

          <p className="text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
            The premier competitive programming arena for SOA ITER. Solve
            problems, climb the ranks, and prepare for your future in
            tech.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="group px-8 py-4 rounded-full bg-accent text-white font-bold text-lg transition-all shadow-xl shadow-accent/30 hover:shadow-accent/50 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              {isAuthenticated ? "Resume Coding" : "Start Coding Now"}
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-8 py-4 rounded-full bg-glass-surface border border-glass-border text-primary font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md"
              >
                View Leaderboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Authenticated User Landing Sections */}
      {isAuthenticated && (
        <div className="relative z-10 px-6 py-16">
          <div className="max-w-6xl mx-auto space-y-16">
            {/* Pending Tasks Section */}
            {pendingTasks.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <FiClock className="text-xl text-yellow-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Pending Tasks</h2>
                    <p className="text-secondary text-sm">Missions currently under review. Stay sharp.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingTasks.map((task, index) => (
                    <MotionBlock
                      key={task._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group"
                    >
                      <Link to={`/submission/${task._id}`} className="block">
                        <div className="macos-glass p-5 border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/50 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                              Under Review
                            </span>
                            <span className="text-secondary text-[10px]">
                              {new Date(task.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg group-hover:text-yellow-500 transition-colors">
                            {task.challengeId?.title || "Unknown Challenge"}
                          </h3>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-secondary">
                              <FiActivity className="text-accent" />
                              <span>View Status</span>
                            </div>
                            <FiArrowRight className="text-secondary group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </MotionBlock>
                  ))}
                </div>
              </div>
            )}

            {/* Available Missions Section */}
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Available Missions
                  </h2>
                  <p className="text-secondary mt-1">
                    Jump into a challenge — your next rank-up awaits.
                  </p>
                </div>
                <Link
                  to="/missions"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 text-accent font-semibold text-sm hover:bg-accent/20 transition-all"
                >
                  View All Missions
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            {challengesQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
              <div className="macos-glass p-8 text-center">
                <p className="text-secondary">
                  No missions available yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {challenges.map((challenge, index) => (
                  <MotionBlock
                    key={challenge._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
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
            )}
          </div>
        </div>
      </div>
      )}

      {/*Stats Strip */}
     {/* <div className="relative z-10 border-y border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-black text-primary">50+</div>
            <div className="text-sm font-medium text-secondary uppercase tracking-widest">
              Challenges
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-primary">200+</div>
            <div className="text-sm font-medium text-secondary uppercase tracking-widest">
              Active Developers
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-primary">1.5k</div>
            <div className="text-sm font-medium text-secondary uppercase tracking-widest">
              Submissions
            </div>
          </div>
        </div>
      </div> */}


      {/* <div className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Platform Features
            </h2>
            <p className="text-secondary text-lg">
              Everything you need to excel in your next interview.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:border-accent/50 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FiCode className="text-2xl text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Curated Problems</h3>
              <p className="text-secondary leading-relaxed">
                Hand-picked challenges ranging from Arrays to Dynamic
                Programming, designed to mimic real OA rounds.
              </p>
            </Card>

            <Card className="hover:border-green-500/50 group">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FiTrendingUp className="text-2xl text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Leaderboard</h3>
              <p className="text-secondary leading-relaxed">
                Compete with your peers in real-time. Every submission updates
                your rank instantly on the global stage.
              </p>
            </Card>

            <Card className="hover:border-orange-500/50 group">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FiZap className="text-2xl text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Feedback</h3>
              <p className="text-secondary leading-relaxed">
                Get immediate results on your code. Our judge engine reviews
                submissions for correctness and speed.
              </p>
            </Card>
          </div>
        </div>
      </div> */}

      {/* Footer */}
      <footer className="relative z-10 border-t border-glass-border/40 py-8 text-center w-full mt-auto bg-black/5">
        <p className="text-sm text-secondary">
          Copyright 2026 Algorithm Arena. Built for{" "}
          <span className="text-primary font-semibold">
            GDG On Campus - SOA ITER
          </span>
          .
        </p>
      </footer>
    </div>
  );
};

export default Home;
