import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiActivity, FiAward, FiCalendar, FiDownload, FiEdit2, FiGithub, FiLink, FiMapPin, FiSearch, FiTwitter, FiUsers, FiZap } from 'react-icons/fi';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';
import { clsx } from 'clsx';
import { useSocket } from '../hooks/useSocket';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK, mockProfileStats } from '../lib/mockData';
import { useAuth } from '../context/useAuth';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MotionDiv = motion.div;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Mock heatmap data generation (365 days starting from simulated join date)
const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Simulate joining 30 days ago
  const joinDate = new Date(today);
  joinDate.setDate(today.getDate() - 30);
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(joinDate);
    d.setDate(joinDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      count: d > today ? 0 : Math.floor(Math.random() * 5),
      isFuture: d > today,
    });
  }
  return data;
};

const SolvedBreakdown = ({ stats }) => {
  const categories = [
    { label: 'Easy', color: 'bg-green-500', val: stats?.difficultyBreakdown?.easy?.solved || 0, total: stats?.difficultyBreakdown?.easy?.total || 100 },
    { label: 'Medium', color: 'bg-yellow-500', val: stats?.difficultyBreakdown?.medium?.solved || 0, total: stats?.difficultyBreakdown?.medium?.total || 250 },
    { label: 'Hard', color: 'bg-red-500', val: stats?.difficultyBreakdown?.hard?.solved || 0, total: stats?.difficultyBreakdown?.hard?.total || 50 },
  ];

  return (
    <Card className="flex h-full flex-col">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-primary">Solved Problems</h3>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
            {stats?.rank < 10 ? 'EXPERT' : 'ACTIVE'}
          </span>
        </div>
        <div className="space-y-6">
          {categories.map((c) => (
            <div key={c.label}>
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-medium text-secondary">{c.label}</span>
                <span className="font-bold text-primary">
                  {c.val}
                  <span className="text-tertiary">/{c.total}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.val / (c.total || 1)) * 100}%` }}
                  className={`h-full ${c.color} shadow-[0_0_8px_rgba(34,197,94,0.4)]`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto border-t border-glass-border/40 pt-6">
        <div className="flex items-center justify-between text-[10px] text-tertiary">
          <span>Overall Score</span>
          <span className="text-sm font-black text-accent">{stats?.overallScore || '0'}%</span>
        </div>
      </div>
    </Card>
  );
};

const ActivityHeatmap = ({ heatmapData }) => {
  const data = useMemo(
    () => (heatmapData && heatmapData.length > 0 ? heatmapData : generateHeatmapData()),
    [heatmapData]
  );

  const months = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    let lastMonth = -1;
    
    // Scan data to find where months change
    data.forEach((day, index) => {
      const d = new Date(day.date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        // Only add month if it's the first occurrence or at least 2 weeks apart from the last one
        result.push({ name: monthNames[m], index });
        lastMonth = m;
      }
    });
    
    return result;
  }, [data]);

  return (
    <Card className="overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiActivity className="text-accent" />
          <h2 className="text-lg font-bold">Activity Heatmap</h2>
        </div>
        <span className="text-[10px] text-tertiary">365-day contribution graph</span>
      </div>

      <div className="heatmap-scrollbar overflow-x-auto pb-6 pt-2 px-1">
        <div className="flex gap-4 w-fit">
          {/* Day Labels */}
          <div className="grid grid-rows-7 gap-[3px] text-[9px] text-tertiary pt-[18px]">
             <span className="h-[11px] leading-[11px]"></span>
             <span className="h-[11px] leading-[11px]">Mon</span>
             <span className="h-[11px] leading-[11px]"></span>
             <span className="h-[11px] leading-[11px]">Wed</span>
             <span className="h-[11px] leading-[11px]"></span>
             <span className="h-[11px] leading-[11px]">Fri</span>
             <span className="h-[11px] leading-[11px]"></span>
          </div>

          <div className="flex flex-col gap-2">
            {/* Month Labels */}
            <div className="relative h-4 text-[9px] font-medium tracking-tighter text-tertiary uppercase">
              {months.map((m, idx) => (
                <span 
                  key={idx} 
                  className="absolute whitespace-nowrap"
                  style={{ left: `${(m.index / 7) * 14}px` }} 
                >
                  {m.name}
                </span>
              ))}
            </div>

            {/* The Grid */}
            <div className="grid grid-flow-col grid-rows-7 gap-[3px] w-max">
              {data.map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.0005 }}
                  className={`h-[11px] w-[11px] cursor-pointer rounded-[2px] transition-all hover:ring-1 hover:ring-white/40 ${
                    day.isFuture || day.count === 0
                      ? 'bg-[#ebedf0] dark:bg-[#161b22] border border-black/[0.03] dark:border-white/[0.03]'
                      : day.count === 1
                        ? 'bg-[#0e4429] border border-white/[0.05]'
                        : day.count === 2
                          ? 'bg-[#006d32] border border-white/[0.05]'
                          : day.count === 3
                            ? 'bg-[#26a641] border border-white/[0.05]'
                            : 'bg-[#39d353] border border-white/[0.05] shadow-[0_0_10px_rgba(57,211,83,0.3)]'
                  }`}
                  title={`${day.date}: ${day.count} missions ${day.isFuture ? '(Future)' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between px-2">
        <span className="text-[10px] text-tertiary hover:text-accent cursor-pointer transition-colors">
          Learn how we count contributions
        </span>
        <div className="flex items-center gap-4 text-[10px] text-tertiary">
          <span className="font-medium">Less</span>
          <div className="flex gap-[3px]">
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] border border-black/[0.03] dark:border-white/[0.03]" title="No activity" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[#0e4429]" title="1-2 missions" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[#006d32]" title="3-4 missions" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[#26a641]" title="5-6 missions" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[#39d353]" title="7+ missions" />
          </div>
          <span className="font-medium">More</span>
        </div>
      </div>
    </Card>
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activityFilter, setActivityFilter] = useState('All');
  const [activityQuery, setActivityQuery] = useState('');

  useSocket('leaderboard_update', () => {
    queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
  });

  const profileQuery = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockProfileStats;
      }
      const res = await api.get('/api/profile/stats');
      return res.data.data;
    },
  });

  const stats = profileQuery.data || {};
  const submissions = useMemo(() => stats.recentSubmissions || [], [stats.recentSubmissions]);
  const total = stats.totalSubmissions || 0;
  const acceptedPct = total ? Math.round(((stats.acceptedCount || 0) / total) * 100) : 0;
  const profileSnapshotMs = profileQuery.dataUpdatedAt || 0;

  const acceptedInLastWeek = useMemo(() => {
    const sevenDaysAgo = profileSnapshotMs - WEEK_MS;
    return submissions.filter((sub) => sub.status === 'Accepted' && new Date(sub.submittedAt).getTime() >= sevenDaysAgo).length;
  }, [profileSnapshotMs, submissions]);

  const filteredSubmissions = useMemo(() => {
    const query = activityQuery.trim().toLowerCase();
    return submissions.filter((sub) => {
      const matchesStatus = activityFilter === 'All' || sub.status === activityFilter;
      const title = (sub.challengeId?.title || '').toLowerCase();
      return matchesStatus && (!query || title.includes(query));
    });
  }, [activityFilter, activityQuery, submissions]);

  const handleDownloadProfile = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure any animations settle
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#050507',
        pixelRatio: 2, // Higher quality
        style: {
          borderRadius: '24px',
        }
      });
      saveAs(dataUrl, `${user?.username || 'user'}-algoarena-profile.png`);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return <Card className="text-red-400">{profileQuery.error?.userMessage || 'Failed to load profile.'}</Card>;
  }

  const statCards = [
    { label: 'Solved', value: stats.acceptedCount || 0, color: 'text-green-400', sub: 'Total missions', icon: FiZap },
    { label: 'Points', value: stats.totalPoints || 0, color: 'text-accent', sub: 'XP gained', icon: FiAward },
    { label: 'Accepted This Week', value: acceptedInLastWeek, color: 'text-yellow-400', sub: 'Recent momentum', icon: FiActivity },
    { label: 'Pending', value: stats.pendingCount || 0, color: 'text-purple-400', sub: 'Awaiting review', icon: FiSearch },
  ];

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={user?.username || 'Profile'}
        subtitle={`Role: ${user?.role || 'user'} | Acceptance Rate: ${acceptedPct}%`}
        actions={
          <div className="flex gap-2">
            <button 
              className="btn-secondary text-sm flex items-center gap-2" 
              onClick={handleDownloadProfile}
              disabled={isExporting}
            >
              <FiDownload /> {isExporting ? 'Generating...' : 'Export Card'}
            </button>
          </div>
        }
      />

      <div ref={cardRef} className={clsx("space-y-6", isExporting && "p-12 bg-[#050507] rounded-[40px] border border-white/10")}>
        {isExporting && (
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">AlgoArena <span className="text-accent">Profile</span></h1>
              <p className="text-secondary">Official Developer Certification</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-tertiary uppercase tracking-widest">Verified on</p>
              <p className="text-sm font-bold text-primary">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="flex flex-col gap-6 xl:col-span-1">
          <Card className="pt-8 text-center relative overflow-hidden" id="profile-main-card">
            <Link 
              to="/settings" 
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 border border-white/10 text-secondary hover:text-accent hover:bg-accent/10 transition-all shadow-sm group/edit"
              title="Edit Profile"
            >
              <FiEdit2 size={16} className="group-hover/edit:rotate-12 transition-transform" />
            </Link>
            
            <div className="group relative mb-6 inline-block">
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-accent to-purple-600 p-0.5 transition-all shadow-xl shadow-accent/20">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="h-full w-full rounded-[14px] object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#1a1a1c] text-4xl font-black uppercase text-white">
                    {user?.username?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full border-4 border-bg-app bg-green-500 shadow-lg ring-2 ring-green-500/20" />
            </div>

            <h2 className="text-2xl font-black text-primary tracking-tight">{user?.username || 'User'}</h2>
            <p className="mb-6 mt-1 text-sm font-medium text-secondary">
              {user?.branch || 'B.Tech CSE'} {user?.section ? `| ${user.section}` : ''}
            </p>

            <div className="space-y-3.5 text-left bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiAward className="text-accent" />
                <span>{user?.bio || 'Expert Algorithmist'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiMapPin className="text-accent" />
                <span>{user?.year || 'Third Year Student'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiCalendar className="text-accent" />
                <span>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2026'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary pt-2 border-t border-white/5">
                <FiLink className="text-accent" />
                <span className="truncate text-accent font-medium">
                  {user?.website ? user.website.replace(/^https?:\/\//, '') : `arena.dev/${user?.username}`}
                </span>
              </div>
            </div>
            
            <div className="flex justify-center gap-4 border-t border-glass-border pt-6 mt-8">
              <a href={user?.github ? `https://github.com/${user.github}` : '#'} target="_blank" rel="noreferrer">
                <FiGithub className="cursor-pointer text-secondary transition-colors hover:text-white" size={20} />
              </a>
              <a href={user?.twitter ? `https://twitter.com/${user.twitter}` : '#'} target="_blank" rel="noreferrer">
                <FiTwitter className="cursor-pointer text-secondary transition-colors hover:text-white" size={20} />
              </a>
            </div>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-transparent">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Current Rank</span>
              <FiAward className="text-accent" />
            </div>
            <p className="text-4xl font-black text-primary">{stats.rank ? `#${stats.rank}` : 'Unranked'}</p>
            <p className="mt-2 text-xs text-secondary">Top 5% of all developers</p>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Clan</span>
              <FiUsers className="text-purple-400" />
            </div>
            <p className="text-xl font-black text-primary">{user?.clanName || 'No Clan'}</p>
            <p className="mt-2 text-xs text-secondary">
              {user?.clanTag ? `[${user.clanTag}]` : 'Join a clan from the clans page'}
            </p>
          </Card>

          <div className="flex-grow">
            <SolvedBreakdown stats={stats} />
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const diffColor =
                card.color === 'text-green-400'
                  ? '34, 197, 94'
                  : card.color === 'text-accent'
                    ? undefined
                    : card.color === 'text-yellow-400'
                      ? '234, 179, 8'
                      : '168, 85, 247';
              return (
                <Card
                  key={card.label}
                  className="group relative overflow-hidden"
                  difficultyColor={diffColor}
                >
                  <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                    <Icon size={48} />
                  </div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-tighter text-secondary">{card.label}</p>
                  <p className={`text-2xl font-black md:text-3xl ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-[10px] text-tertiary">{card.sub}</p>
                </Card>
              );
            })}
          </div>

          <ActivityHeatmap heatmapData={stats.heatmapData} />
          <div
            className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white/60 dark:bg-white/[0.02] px-6 py-4"
          >
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-secondary">Acceptance Rate</span>
              <span className="font-semibold">{acceptedPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-green-400 to-accent" style={{ width: `${acceptedPct}%` }} />
            </div>
          </div>

          <Card className="flex-grow">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <FiZap className="text-yellow-400" />
                  Recent Submissions
                </h2>
                <p className="mt-1 text-xs text-secondary">Showing {filteredSubmissions.length} activities</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented">
                  {['All', 'Accepted', 'Rejected', 'Pending'].map((filter) => (
                    <button
                      key={filter}
                      type="button"
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
                    name="profileActivitySearch"
                    className="field-input !py-1.5 pl-9 !text-xs"
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
                  <MotionDiv
                    key={sub._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 transition-all hover:border-accent/30 hover:bg-white/70 dark:hover:bg-accent/5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${
                          sub.status === 'Accepted'
                            ? 'bg-green-500/10 text-green-400'
                            : sub.status === 'Rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {sub.challengeId?.title?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="font-bold text-primary transition-colors group-hover:text-accent">
                          {sub.challengeId?.title || 'Unknown Challenge'}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-tertiary">
                          <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span
                            className={
                              sub.status === 'Accepted'
                                ? 'text-green-500'
                                : sub.status === 'Rejected'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                            }
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/submission/${sub._id}`}
                      className="rounded-lg bg-glass-surface p-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <FiLink className="text-secondary" />
                    </Link>
                  </MotionDiv>
                ))}
              </div>
            ) : (
              <EmptyState title="No activities" description="Time to solve some missions!" />
            )}
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
