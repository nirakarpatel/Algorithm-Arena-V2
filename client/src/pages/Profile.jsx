import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiActivity, FiCpu, FiArrowRight, FiCalendar, FiZap, FiMapPin, FiLink, FiGithub, FiTwitter } from "react-icons/fi";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";
import SkeletonCard from "../components/SkeletonCard";
import ProfileSidebar from "../components/ProfileSidebar";
import ActivityHeatmap from "../components/ActivityHeatmap";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  if (h >= 17 && h < 21) return "Good Evening";
  return "Good Night";
};

const fd = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" },
});

const DiffBar = ({ label, solved, total, color }) => {
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono text-tertiary">{solved}<span className="text-tertiary/50">/{total}</span> <span className="text-white/20 ml-1">{Math.round(pct)}%</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }} />
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const { username } = useParams();

  const profileQ = useQuery({
    queryKey: ["full-profile-stats", username || "me"],
    queryFn: async () => {
      const endpoint = username 
        ? `/api/profile/username/${username}` 
        : `/api/profile/stats`;
      const res = await api.get(endpoint);
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const subsQ = useQuery({
    queryKey: ["full-profile-submissions", username || "me"],
    queryFn: async () => {
      const endpoint = username 
        ? `/api/submissions/user/${username}?limit=100` 
        : `/api/submissions/my-submissions?limit=100`;
      const res = await api.get(endpoint);
      return res.data.data || [];
    },
    refetchInterval: 10000,
  });

  const submissions = useMemo(() => subsQ.data || [], [subsQ.data]);

  const recentSubs = useMemo(() => {
    return [...submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 8);
  }, [submissions]);

  if (profileQ.isLoading || subsQ.isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8">
        <SkeletonCard className="w-full lg:w-72 h-[600px] !rounded-2xl shrink-0" />
        <div className="flex-1 space-y-6">
          <SkeletonCard className="w-full h-32 !rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard className="w-full h-48 !rounded-2xl" />
            <SkeletonCard className="w-full h-48 !rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const profile = profileQ.data || {};
  const displayUser = username ? profile : user;


  const easy = profile?.difficultyBreakdown?.easy ?? { solved: 0, total: 0 };
  const medium = profile?.difficultyBreakdown?.medium ?? { solved: 0, total: 0 };
  const hard = profile?.difficultyBreakdown?.hard ?? { solved: 0, total: 0 };

  const solved = profile?.acceptedCount ?? 0;
  const total = (easy.total + medium.total + hard.total) || 1;
  const solvedPct = Math.round((solved / total) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      
      <ProfileSidebar user={displayUser} profile={profile} badges={profile?.badges} />

      <div className="flex-1 min-w-0 space-y-6">
        <motion.div {...fd(0.1)} className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.08]"
          style={{ background: "linear-gradient(135deg, rgba(15,15,22,1) 0%, rgba(20,15,35,1) 100%)" }}>
          <div className="absolute top-0 right-0 p-4 text-right z-10">
            <div className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 flex items-center gap-2">
              <FiZap className="text-accent text-sm" />
              <span className="text-xs font-black text-white">{profile.totalPoints || 0} XP</span>
            </div>
          </div>
          <div className="relative z-10">
            {!username && (
              <span className="inline-block px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-[9px] font-black uppercase tracking-widest text-accent mb-3">
                {getGreeting()}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{displayUser?.username}</h1>
            <p className="text-sm text-secondary max-w-md">
                {username ? `Viewing ${displayUser?.username}'s public profile.` : "Track your journey, analyze your performance, and dominate the algorithm arena."}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <motion.div {...fd(0.15)} className="rounded-2xl border border-white/[0.06] bg-[#0c0c14] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">Algorithm Mastery</h2>
              <div className="w-12 h-12 rounded-full flex items-center justify-center relative">
                 <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path className="text-white/5" strokeWidth="4" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-accent transition-all duration-1000 ease-out" strokeWidth="4" strokeDasharray={`${solvedPct}, 100`} strokeLinecap="round" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{solvedPct}%</div>
              </div>
            </div>
            
            <div className="space-y-4 mt-auto">
              <DiffBar label="Easy" solved={easy.solved} total={easy.total} color="#22c55e" />
              <DiffBar label="Medium" solved={medium.solved} total={medium.total} color="#eab308" />
              <DiffBar label="Hard" solved={hard.solved} total={hard.total} color="#ef4444" />
            </div>
          </motion.div>

          <motion.div {...fd(0.2)} className="rounded-2xl border border-white/[0.06] bg-[#0c0c14] p-5 overflow-hidden flex flex-col justify-center">
             <ActivityHeatmap submissions={submissions} />
          </motion.div>
        </div>

        <motion.div {...fd(0.25)} className="rounded-2xl border border-white/[0.06] bg-[#0c0c14] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
             <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <FiActivity className="text-accent" /> Recent Submissions
             </h2>
             {!username && (
               <Link to="/dashboard" className="text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-wider flex items-center gap-1">
                 Go to Arena <FiArrowRight size={10} />
               </Link>
             )}
          </div>
          
          {recentSubs.length === 0 ? (
            <div className="p-10 text-center">
              <FiCpu size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest">No recent submissions</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentSubs.map((sub, i) => {
                const ac = sub.status === "Accepted";
                const wa = sub.status === "Rejected";
                const badgeCls = ac
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : wa
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                const badgeLabel = ac ? "ACCEPTED" : wa ? "REJECTED" : "PENDING";

                return (
                  <Link key={sub._id + i} to={`/submission/${sub._id}`} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                        {sub.challengeId?.title || "Unknown Challenge"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-tertiary">
                          {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[10px] text-tertiary">•</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{sub.language}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shrink-0 ${badgeCls}`}>
                      {badgeLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;
