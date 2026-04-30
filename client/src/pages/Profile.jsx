import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiCalendar, FiMapPin, FiLink, FiGithub, FiTwitter, FiAward, FiActivity, FiZap, FiSearch, FiUsers } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK, mockProfileStats } from '../lib/mockData';
import { useAuth } from '../context/useAuth';

// Mock heatmap data generation (365 days)
const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    data.push({
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 5) // 0 to 4 intensity
    });
  }
  return data.reverse();
};

const SolvedBreakdown = ({ stats }) => {
  const categories = [
    { label: 'Easy', color: 'bg-green-500', val: 42, total: 100 },
    { label: 'Medium', color: 'bg-yellow-500', val: 18, total: 250 },
    { label: 'Hard', color: 'bg-red-500', val: 5, total: 50 }
  ];

  return (
    <Card className="flex flex-col h-full">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-primary">Solved Problems</h3>
          <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">EXPERT</span>
        </div>
        <div className="space-y-6">
          {categories.map(c => (
            <div key={c.label}>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-secondary font-medium">{c.label}</span>
                <span className="text-primary font-bold">{c.val}<span className="text-tertiary">/{c.total}</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.val / c.total) * 100}%` }}
                  className={`h-full ${c.color} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-6 border-t border-glass-border/40">
         <div className="flex items-center justify-between text-[10px] text-tertiary">
            <span>Overall Score</span>
            <span className="text-accent font-black text-sm">84.2%</span>
         </div>
      </div>
    </Card>
  );
};

const ActivityHeatmap = ({ heatmapData }) => {
  const data = useMemo(() => heatmapData && heatmapData.length > 0 ? heatmapData : generateHeatmapData(), [heatmapData]);
  
  const months = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonth - i);
      result.push(monthNames[d.getMonth()]);
    }
    return result;
  }, []);
  
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <FiActivity className="text-accent" />
        <h2 className="text-lg font-bold">Activity Heatmap</h2>
      </div>
      
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex flex-col gap-2 min-w-[800px]">
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {data.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.001 }}
                className={`w-3.5 h-3.5 rounded-[3px] transition-all hover:ring-2 hover:ring-accent cursor-pointer ${
                  day.count === 0 ? 'bg-white/[0.03]' :
                  day.count === 1 ? 'bg-green-500/20' :
                  day.count === 2 ? 'bg-green-500/40' :
                  day.count === 3 ? 'bg-green-500/70' :
                  'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]'
                }`}
                title={`${day.date}: ${day.count} missions`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-tertiary px-1 mt-1 font-medium tracking-tighter">
             {months.map((m, idx) => <span key={idx} className="w-[60px] text-center">{m}</span>)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6 text-[10px] text-tertiary">
        <span className="font-medium">Less activity</span>
        <div className="flex gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[2px] bg-white/[0.03]" />
          <div className="w-3.5 h-3.5 rounded-[2px] bg-green-500/20" />
          <div className="w-3.5 h-3.5 rounded-[2px] bg-green-500/40" />
          <div className="w-3.5 h-3.5 rounded-[2px] bg-green-500/70" />
          <div className="w-3.5 h-3.5 rounded-[2px] bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.2)]" />
        </div>
        <span className="font-medium">Master level</span>
      </div>
    </Card>
  );
};

const activityFilters = ['All', 'Accepted', 'Rejected', 'Pending'];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop',
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activityFilter, setActivityFilter] = useState('All');
  const [activityQuery, setActivityQuery] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      if (USE_MOCK) return mockProfileStats;
      const res = await api.get('/api/profile/stats');
      return res.data.data;
    },
  });

  const stats = profileQuery.data || {};
  const submissions = useMemo(() => stats.recentSubmissions || [], [stats.recentSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesStatus = activityFilter === 'All' || sub.status === activityFilter;
      const query = activityQuery.trim().toLowerCase();
      const title = (sub.challengeId?.title || '').toLowerCase();
      return matchesStatus && (!query || title.includes(query));
    });
  }, [submissions, activityFilter, activityQuery]);

  const handleAvatarSelect = (url) => {
    updateUser({ profilePicture: url });
    setShowAvatarPicker(false);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={user?.username || 'Profile'}
        subtitle="Developer Hub"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowAvatarPicker(true)}>Change Avatar</button>
            <button className="btn-primary text-sm shadow-accent-glow">Share</button>
          </div>
        }
      />

      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="macos-glass p-8 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-6 text-primary">Identity Selection</h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {PRESET_AVATARS.map((url, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAvatarSelect(url)}
                  className="relative group rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-accent transition-all"
                >
                  <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </button>
              ))}
              <button 
                 onClick={() => handleAvatarSelect(null)}
                 className="rounded-xl bg-glass-surface flex items-center justify-center border-2 border-dashed border-tertiary hover:border-accent transition-all text-secondary text-xs uppercase"
              >
                Clear
              </button>
            </div>
            <button className="btn-secondary w-full" onClick={() => setShowAvatarPicker(false)}>Cancel</button>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Stats Summary */}
        <div className="xl:col-span-1 flex flex-col gap-6 h-full min-h-full">
          <Card className="text-center pt-8">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-purple-500 p-1">
                {user?.profilePicture ? (
                   <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-bg-app flex items-center justify-center text-4xl text-accent font-black">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-bg-app" />
            </div>
            <h2 className="text-2xl font-black text-primary">{user?.username}</h2>
            <p className="text-secondary text-sm mt-1 mb-6">Expert Algorithmist</p>
            
            <div className="space-y-3 text-left">
               <div className="flex items-center gap-3 text-secondary text-sm">
                 <FiMapPin className="text-accent" />
                 <span>San Francisco, CA</span>
               </div>
               <div className="flex items-center gap-3 text-secondary text-sm">
                 <FiCalendar className="text-accent" />
                 <span>Joined April 2026</span>
               </div>
               <div className="flex items-center gap-3 text-secondary text-sm">
                 <FiLink className="text-accent" />
                 <span className="text-accent truncate hover:underline cursor-pointer">arena.dev/{user?.username}</span>
               </div>
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-glass-border">
               <FiGithub className="text-secondary hover:text-white cursor-pointer transition-colors" size={20} />
               <FiTwitter className="text-secondary hover:text-white cursor-pointer transition-colors" size={20} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold uppercase tracking-widest text-accent">Current Rank</span>
               <FiAward className="text-accent" />
             </div>
             <p className="text-4xl font-black text-primary">{stats.rank ? `#${stats.rank}` : 'Unranked'}</p>
             <p className="text-xs text-secondary mt-2">Top 5% of all developers</p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Clan</span>
               <FiUsers className="text-purple-400" />
             </div>
             <p className="text-xl font-black text-primary">{user?.clanName || 'No Clan'}</p>
             <p className="text-xs text-secondary mt-2">{user?.clanTag ? `[${user.clanTag}]` : 'Join a clan from the leaderboard'}</p>
          </Card>

          <div className="flex-grow">
            <SolvedBreakdown stats={stats} />
          </div>
        </div>

        {/* Right Column: Heatmap & Activity */}
        <div className="xl:col-span-3 flex flex-col gap-6 h-full min-h-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Solved', val: stats.acceptedCount || 0, color: 'text-green-400', sub: 'Total missions', icon: FiZap },
              { label: 'Points', val: stats.totalPoints || 0, color: 'text-accent', sub: 'XP Gained', icon: FiAward },
              { label: 'Streaks', val: stats.streak || 0, color: 'text-orange-400', sub: `Max: ${stats.maxStreak || 0}`, icon: FiActivity },
              { label: 'Pending', val: stats.pendingCount || 0, color: 'text-yellow-400', sub: 'Awaiting review', icon: FiSearch }
            ].map((m, idx) => (
              <Card key={idx} className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <m.icon size={48} />
                </div>
                <p className="text-xs font-bold text-secondary uppercase tracking-tighter mb-1">{m.label}</p>
                <p className={`text-2xl md:text-3xl font-black ${m.color}`}>{m.val}</p>
                <div className="flex items-center justify-between mt-1">
                   <p className="text-[10px] text-tertiary">{m.sub}</p>
                   <span className="text-[8px] bg-white/5 px-1 rounded text-secondary">+12%</span>
                </div>
              </Card>
            ))}
          </div>

          <ActivityHeatmap heatmapData={stats.heatmapData} />

          <Card className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FiZap className="text-yellow-400" />
                  Recent Submissions
                </h2>
                <p className="text-xs text-secondary mt-1">Showing {filteredSubmissions.length} activities</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented">
                  {activityFilters.map((filter) => (
                    <button 
                      key={filter} 
                      className={`segmented-btn !text-[10px] ${activityFilter === filter ? 'active' : ''}`} 
                      onClick={() => setActivityFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    className="field-input pl-9 !py-1.5 !text-xs"
                    placeholder="Filter by challenge..."
                    value={activityQuery}
                    onChange={(e) => setActivityQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredSubmissions.length ? (
              <div className="space-y-2">
                {filteredSubmissions.map((sub) => (
                  <motion.div 
                    key={sub._id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group border border-glass-border/40 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-accent/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                         sub.status === 'Accepted' ? 'bg-green-500/10 text-green-400' : 
                         sub.status === 'Rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                       }`}>
                         {sub.challengeId?.title?.[0] || 'C'}
                       </div>
                       <div>
                         <h3 className="font-bold text-primary group-hover:text-accent transition-colors">{sub.challengeId?.title || 'Unknown Challenge'}</h3>
                         <div className="flex items-center gap-2 text-[10px] text-tertiary">
                           <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                           <span>•</span>
                           <span className={
                             sub.status === 'Accepted' ? 'text-green-500' : 
                             sub.status === 'Rejected' ? 'text-red-500' : 'text-yellow-500'
                           }>{sub.status}</span>
                         </div>
                       </div>
                    </div>
                    <Link to={`/submission/${sub._id}`} className="p-2 rounded-lg bg-glass-surface opacity-0 group-hover:opacity-100 transition-opacity">
                       <FiLink className="text-secondary" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No activities" description="Time to solve some missions!" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
