import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FiUsers, FiShield, FiActivity, FiCode, FiPercent, FiClock,
  FiPlus, FiAlertCircle, FiTrendingUp, FiAward, FiSearch, FiCalendar, FiStar
} from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import SkeletonCard from '../../components/SkeletonCard';
import { api } from '../../lib/api';

const DashboardTab = ({ setActiveTab, setInitialClanFilter }) => {
  const [metricTab, setMetricTab] = useState('points'); // 'points', 'average', 'solved'
  const [memberSearch, setMemberSearch] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const summaryQ = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/admin-summary');
      return res.data.data;
    }
  });

  const isLoading = summaryQ.isLoading;
  const data = summaryQ.data || {};

  const stats = [
    { label: 'Total Members', value: data.totalMembers || 0, icon: FiUsers, color: 'text-blue-400', bg: 'bg-blue-500/10', rgb: '96, 165, 250' },
    { label: 'Active Clans', value: data.activeClans || 0, icon: FiShield, color: 'text-purple-400', bg: 'bg-purple-500/10', rgb: '192, 132, 252' },
    { label: 'Active This Week', value: data.activeThisWeek || 0, icon: FiActivity, color: 'text-green-400', bg: 'bg-green-500/10', rgb: '74, 222, 128' },
    { label: 'Total Submissions', value: data.totalSubmissions || 0, icon: FiCode, color: 'text-pink-400', bg: 'bg-pink-500/10', rgb: '244, 114, 182' },
    { label: 'Avg Completion', value: `${data.avgCompletion || 0}%`, icon: FiPercent, color: 'text-yellow-400', bg: 'bg-yellow-500/10', rgb: '250, 204, 21' },
    { label: 'Pending Assign', value: data.pendingAssignments || 0, icon: FiClock, color: 'text-orange-400', bg: 'bg-orange-500/10', rgb: '251, 146, 60' },
  ];

  // SVG Line Chart math & rendering
  const renderActivityChart = () => {
    const trend = data.activityTrend || [];
    if (trend.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-tertiary text-xs">
          No submission activity data available.
        </div>
      );
    }

    const paddingX = 10;
    const paddingY = 30;
    const width = 500;
    const height = 200;
    const maxVal = Math.max(...trend.map(t => t.count), 10);

    const points = trend.map((t, index) => {
      const x = paddingX + (index * (width - 2 * paddingX)) / (trend.length - 1);
      const y = height - paddingY - (t.count * (height - 2 * paddingY)) / maxVal;
      return { x, y, count: t.count, date: t.date };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : "";

    return (
      <div className="relative w-full h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingY + r * (height - 2 * paddingY);
            const val = Math.round(maxVal - r * maxVal);
            return (
              <g key={i} className="opacity-50">
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--fg-tertiary)" strokeDasharray="3,3" />
                <text x={paddingX - 10} y={y + 4} textAnchor="end" className="fill-current text-[9px] font-mono font-bold dark:text-white">{val}</text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Main line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.5))' }}
            />
          )}

          {/* Data interactive nodes */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint?.index === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "var(--fg-primary)" : "var(--accent-primary)"}
                  stroke="var(--bg-app)"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Date Axis Label (only first, middle, last to prevent overlap) */}
          {points.length > 0 && (
            <g className="fill-current text-[9px] font-mono text-tertiary opacity-100">
              <text x={points[0].x} y={height - 10} textAnchor="start">
                {new Date(points[0].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
              </text>
              <text x={points[Math.floor(points.length / 2)].x} y={height - 10} textAnchor="middle">
                {new Date(points[Math.floor(points.length / 2)].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
              </text>
              <text x={points[points.length - 1].x} y={height - 10} textAnchor="end">
                {new Date(points[points.length - 1].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-30 p-2 border border-black/10 dark:border-white/10 rounded-lg shadow-xl text-[10px] pointer-events-none transition-all duration-150"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 15}%`,
              transform: 'translate(-50%, -100%)',
              background: 'var(--glass-surface)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div className="font-bold text-primary">{hoveredPoint.count} Submissions</div>
            <div className="text-tertiary mt-0.5">{new Date(hoveredPoint.date).toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}</div>
          </div>
        )}
      </div>
    );
  };

  // Filter top performers search
  const topMembersFiltered = (data.topMembers || []).filter(member => {
    const query = memberSearch.toLowerCase();
    return (
      (member.username || '').toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query) ||
      (member.clan?.name || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Unassigned Members Alert */}
      {data.pendingAssignments > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-xl border border-orange-500/30 bg-orange-500/10"
        >
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-orange-400 text-xl" />
            <div>
              <p className="font-bold text-orange-400 text-sm">Action Required</p>
              <p className="text-orange-400/80 text-xs">There are {data.pendingAssignments} unassigned members awaiting a clan.</p>
            </div>
          </div>
          <button onClick={() => { if(setInitialClanFilter) setInitialClanFilter('unassigned'); setActiveTab('members'); }} className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors">
            Assign Now
          </button>
        </motion.div>
      )}

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <BaseCard className="p-4 flex flex-col gap-3" accentColor={stat.rgb} hover={true}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <Icon size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-black text-primary">{isLoading ? '-' : stat.value}</p>
                  <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">{stat.label}</p>
                </div>
              </BaseCard>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Trend Area Chart */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <FiTrendingUp className="text-indigo-400" /> Platform Submissions Trend (Last 14 Days)
          </h2>
          <BaseCard className="p-5">
            {isLoading ? (
              <div className="h-[220px] animate-pulse bg-white/5 rounded-xl flex items-center justify-center">
                <span className="text-xs text-tertiary">Loading submissions activity...</span>
              </div>
            ) : renderActivityChart()}
          </BaseCard>
        </div>

        {/* Difficulty Mix Gauge */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <FiPercent className="text-pink-400" /> Challenge Difficulty distribution
          </h2>
          <BaseCard className="p-5 flex flex-col justify-between h-[278px]">
            {isLoading ? (
              <div className="h-full animate-pulse bg-white/5 rounded-xl flex items-center justify-center">
                <span className="text-xs text-tertiary">Loading distribution...</span>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-around py-2">
                {['Easy', 'Medium', 'Hard'].map(diff => {
                  const solved = data.difficultyStats?.solved?.[diff] || 0;
                  const total = data.difficultyStats?.total?.[diff] || 0;
                  const solvedPct = total > 0 ? Math.round((solved / (Object.values(data.difficultyStats?.solved || {}).reduce((a, b) => a + b, 0) || 1)) * 100) : 0;
                  const color = diff === 'Easy' ? 'bg-green-500' : diff === 'Medium' ? 'bg-yellow-500' : 'bg-red-500';
                  const textCls = diff === 'Easy' ? 'text-green-400' : diff === 'Medium' ? 'text-yellow-400' : 'text-red-400';

                  return (
                    <div key={diff} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-bold ${textCls}`}>{diff} Solves</span>
                        <span className="font-mono text-secondary">{solved} ({solvedPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${solvedPct}%` }} />
                      </div>
                      <div className="text-[9px] text-tertiary flex justify-between">
                        <span>Total Published: {total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </BaseCard>
        </div>
      </div>

      {/* Clans Relative Performance & Members Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clans Relative Performance Graph & Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <FiShield className="text-purple-400" /> Relative Clan Performance
            </h2>
            <div className="segmented">
              <button
                onClick={() => setMetricTab('points')}
                className={`segmented-btn text-[10px] ${metricTab === 'points' ? 'active' : ''}`}
              >
                Total XP
              </button>
              <button
                onClick={() => setMetricTab('average')}
                className={`segmented-btn text-[10px] ${metricTab === 'average' ? 'active' : ''}`}
              >
                Avg XP/Member
              </button>
              <button
                onClick={() => setMetricTab('solved')}
                className={`segmented-btn text-[10px] ${metricTab === 'solved' ? 'active' : ''}`}
              >
                Solved Count
              </button>
            </div>
          </div>

          <BaseCard className="p-0 overflow-hidden">
            <div className="p-5 border-b border-white/[0.05] bg-white/[0.01]">
              {isLoading ? (
                <div className="h-[120px] animate-pulse bg-white/5 rounded-lg" />
              ) : (
                <div className="space-y-4">
                  {[...(data.clansComparative || [])]
                    .sort((a, b) => {
                      const metricVal = (c) => metricTab === 'points' ? c.totalPoints : metricTab === 'average' ? c.averagePoints : c.solvedCount;
                      return metricVal(b) - metricVal(a);
                    })
                    .map((clan, i) => {
                    const maxVal = Math.max(...(data.clansComparative || []).map(c =>
                      metricTab === 'points' ? c.totalPoints : metricTab === 'average' ? c.averagePoints : c.solvedCount
                    ), 1);
                    const val = metricTab === 'points' ? clan.totalPoints : metricTab === 'average' ? clan.averagePoints : clan.solvedCount;
                    const pct = Math.round((val / maxVal) * 100);

                    const barColors = [
                      'bg-gradient-to-r from-purple-500 to-indigo-500',
                      'bg-gradient-to-r from-blue-500 to-cyan-500',
                      'bg-gradient-to-r from-green-500 to-emerald-500',
                      'bg-gradient-to-r from-orange-500 to-red-500'
                    ];
                    const barColor = barColors[i % barColors.length];

                    return (
                      <div key={clan._id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-primary">{clan.name} <span className="text-[10px] text-tertiary">[{clan.tag}]</span></span>
                          <span className="font-mono font-bold text-secondary">
                            {val} {metricTab === 'points' || metricTab === 'average' ? 'XP' : 'Solves'}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.05] text-[10px] uppercase tracking-widest text-tertiary font-bold">
                    <th className="p-4 pl-6">Rank</th>
                    <th className="p-4">Clan [Tag]</th>
                    <th className="p-4 text-center">Members</th>
                    <th className="p-4 text-right">Total XP</th>
                    <th className="p-4 text-right">Avg XP</th>
                    <th className="p-4 text-right pr-6">Weekly Solves</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-tertiary animate-pulse">Loading ranking list...</td>
                    </tr>
                  ) : (data.clansComparative || []).map((clan, index) => (
                    <tr key={clan._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-sm text-secondary">{index + 1}</td>
                      <td className="p-4 font-bold text-sm text-primary">
                        {clan.name} <span className="text-xs text-tertiary">[{clan.tag}]</span>
                      </td>
                      <td className="p-4 text-center font-mono text-secondary">{clan.memberCount}</td>
                      <td className="p-4 text-right font-mono text-secondary font-bold">{clan.totalPoints}</td>
                      <td className="p-4 text-right font-mono text-secondary">{clan.averagePoints}</td>
                      <td className="p-4 text-right pr-6 font-mono text-green-400 font-bold">{clan.completion}%</td>
                    </tr>
                  ))}
                  {!isLoading && (data.clansComparative || []).length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-tertiary">No active clans comparative data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </BaseCard>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest">Command shortcuts</h2>
          <BaseCard className="p-4 space-y-2">
            <button onClick={() => setActiveTab('sets')} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-accent/10 hover:border-accent/30 transition-all group">
              <span className="font-bold text-sm group-hover:text-accent transition-colors">Create Question Set</span>
              <FiPlus className="text-tertiary group-hover:text-accent transition-colors" />
            </button>
            <button onClick={() => setActiveTab('resources')} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group">
              <span className="font-bold text-sm group-hover:text-blue-400 transition-colors">Upload Resources</span>
              <FiPlus className="text-tertiary group-hover:text-blue-400 transition-colors" />
            </button>
            <button onClick={() => setActiveTab('members')} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-green-500/10 hover:border-green-500/30 transition-all group">
              <span className="font-bold text-sm group-hover:text-green-400 transition-colors">Manage Members</span>
              <FiUsers className="text-tertiary group-hover:text-green-400 transition-colors" />
            </button>
          </BaseCard>
        </div>
      </div>

      {/* Members Gauge Table / Top Performers */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <FiAward className="text-yellow-400" /> Member Performance Leaderboard (Top 10)
          </h2>
          <div className="relative w-full md:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              type="text"
              placeholder="Search top performers..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-primary focus:outline-none focus:border-accent/40"
            />
          </div>
        </div>

        <BaseCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05] text-[10px] uppercase tracking-widest text-tertiary font-bold">
                  <th className="p-4 pl-6">Rank</th>
                  <th className="p-4">Username / Email</th>
                  <th className="p-4">Clan</th>
                  <th className="p-4">Level</th>
                  <th className="p-4 text-center">XP Points</th>
                  <th className="p-4 text-center">Streak</th>
                  <th className="p-4 text-right pr-6">Solved Count</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-tertiary animate-pulse">Loading top members performance data...</td>
                  </tr>
                ) : topMembersFiltered.map((member, index) => {
                  const globalIndex = (data.topMembers || []).findIndex(m => m._id === member._id);
                  return (
                    <tr key={member._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-sm text-secondary">{globalIndex !== -1 ? globalIndex + 1 : index + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-sm text-primary">{member.username || 'Onboarding Pending'}</div>
                        <div className="text-[10px] text-tertiary mt-0.5">{member.email}</div>
                      </td>
                      <td className="p-4">
                        {member.clan ? (
                          <span className="font-bold text-xs text-secondary">{member.clan.name}</span>
                        ) : (
                          <span className="text-tertiary italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                          member.codingLevel === 'Advanced' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          member.codingLevel === 'Intermediate' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                          'bg-white/5 border-white/10 text-secondary'
                        }`}>
                          {member.codingLevel || 'Beginner'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-accent font-bold">
                        <span className="flex items-center justify-center gap-1"><FiStar size={10} /> {member.points || 0}</span>
                      </td>
                      <td className="p-4 text-center font-mono text-orange-400 font-bold">
                        🔥 {member.streak || 0}
                      </td>
                      <td className="p-4 text-right pr-6 font-mono text-secondary font-bold">
                        {member.solvedProblems || 0} solves
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && topMembersFiltered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-tertiary">No members found matching the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>
    </div>
  );
};

export default DashboardTab;
