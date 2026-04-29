import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiClock, FiCheckCircle, FiTarget, FiTrendingUp, FiCpu, FiZap, FiActivity, FiArrowRight } from 'react-icons/fi';
import { api } from '../lib/api';
import { mockChallenges } from '../lib/mockData';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

const Dashboard = () => {
  const navigate = useNavigate();

  const challengesQuery = useQuery({
    queryKey: ["dashboard-challenges"],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/challenges?page=1&limit=4&sortBy=createdAt&sortDir=desc`);
        const data = res.data.data || [];
        return data.length > 0 ? data : mockChallenges.slice(0, 4);
      } catch {
        return mockChallenges.slice(0, 4);
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

  const challenges = challengesQuery.data?.length ? challengesQuery.data : (challengesQuery.data?.data || mockChallenges.slice(0, 4));

  const MOCK_ACTIVITY = [
    { _id: 'a1', challengeId: { title: 'Two Sum' }, submittedAt: new Date().toISOString(), status: 'Accepted' },
    { _id: 'a2', challengeId: { title: 'Reverse Link' }, submittedAt: new Date(Date.now() - 3600000).toISOString(), status: 'Pending' },
    { _id: 'a3', challengeId: { title: 'Graph Traversal' }, submittedAt: new Date(Date.now() - 86400000).toISOString(), status: 'Rejected' },
    { _id: 'a4', challengeId: { title: 'Dijkstra Path' }, submittedAt: new Date(Date.now() - 186400000).toISOString(), status: 'Accepted' },
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

  const pendingTasksPreview = challenges.slice(2, 5).map((ch, index) => ({
    id: ch._id,
    title: ch.title,
    priority: ch.difficulty === 'Hard' ? 'High' : ch.difficulty === 'Medium' ? 'Med' : 'Low',
    due: ['2h left', 'Tomorrow', '3 days'][index],
    category: ch.category || 'General',
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mission Control"
        subtitle="Track progress, jump back into your latest work, and command the arena."
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Available Missions - Left side (takes 2 cols) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-section-title font-semibold">Available Missions</h2>
            <Link to="/missions" className="text-xs text-accent font-bold hover:underline flex items-center gap-1">
              View All <FiArrowRight />
            </Link>
          </div>

          {challengesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : challenges.length === 0 ? (
            <EmptyState title="No challenges found" description="Check back later for new missions." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.slice(0, 4).map((challenge, index) => (
                <MotionBlock
                  key={challenge._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={`/challenge/${challenge._id}`} className="group block h-full">
                    <div className="macos-glass p-5 hover:border-accent transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            challenge.difficulty === "Easy" ? "bg-green-500/20 text-green-500" : 
                            challenge.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"
                        }`}>
                          {challenge.difficulty}
                        </span>
                        <span className="text-secondary text-xs font-bold">{challenge.points} XP</span>
                      </div>
                      <h3 className="text-lg font-bold group-hover:text-accent transition-colors mb-2 leading-tight">
                        {challenge.title}
                      </h3>
                      <p className="text-secondary text-xs mt-auto line-clamp-2">
                        {challenge.description}
                      </p>
                    </div>
                  </Link>
                </MotionBlock>
              ))}
            </div>
          )}
          
          <div className="pt-2">
            <Link to="/missions" className="btn-secondary w-full flex items-center justify-center gap-2 hover:bg-white/5 hover:border-accent/40 transition-all py-3">
              Explore More Missions <FiArrowRight />
            </Link>
          </div>
        </div>

        {/* Recent Activity - Right side (takes 1 col) */}
        <div className="space-y-4 h-full flex flex-col">
          <h2 className="text-section-title font-semibold flex items-center gap-2">
            <FiActivity className="text-accent" />
            Recent Activity
          </h2>
          {/* By setting flex-1, absolute positioning with inset-0 inside a relative parent makes it precisely match the adjacent column's height. */}
          <div className="macos-glass p-4 overflow-y-auto max-h-[380px] xl:max-h-none xl:h-[350px] space-y-3 custom-scrollbar">
            {recentActivity.length ? (
              recentActivity.map((submission) => (
                <Link key={submission._id} to={`/submission/${submission._id}`} className="block border border-glass-border bg-white/[0.01] rounded-xl p-4 hover:border-accent hover:bg-accent/5 transition-all">
                  <p className="font-semibold text-sm line-clamp-1">{submission.challengeId?.title || 'Unknown Challenge'}</p>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-secondary text-xs">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                        submission.status === 'Accepted' ? 'bg-green-500/20 text-green-500' :
                        submission.status === 'Rejected' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {submission.status}
                    </p>
                  </div>
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

      {/* Pending Tasks Section Preview */}
      <div className="mt-8 pt-8 border-t border-glass-border/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-section-title font-semibold flex items-center gap-2">
              <FiClock className="text-accent" />
              Pending Tasks
              <span className="text-xs bg-accent/10 px-2 py-0.5 rounded-full text-accent font-black tracking-widest">{pendingTasksPreview.length}</span>
            </h2>
            <Link to="/pending-tasks" className="text-xs text-accent font-bold hover:underline flex items-center gap-1">
              View All <FiArrowRight />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingTasksPreview.map((task) => (
              <div key={task.id} onClick={() => navigate(`/challenge/${task.id}`)} className="group macos-glass p-5 hover:border-accent transition-all cursor-pointer bg-white/[0.02]">
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
      </div>
    </div>
  );
};

export default Dashboard;
