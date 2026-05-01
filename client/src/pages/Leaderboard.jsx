import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiAward, FiSearch, FiTrendingUp, FiUser, FiUsers, 
  FiZap, FiChevronUp, FiChevronDown 
} from 'react-icons/fi';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/api';
import { USE_MOCK, mockClans, mockLeaderboardMembers } from '../lib/mockData';
import { useAuth } from '../context/useAuth';

const MotionDiv = motion.div;
const MotionRow = motion.tr;

const Podium = ({ items, leaderType }) => {
  const podiumSteps = [items[1], items[0], items[2]];
  const colors = [
    'from-slate-400/80 via-slate-300 to-slate-500/50',
    'from-yellow-500 via-yellow-200 to-yellow-600/50',
    'from-orange-600 via-orange-300 to-orange-700/50',
  ];
  const heights = ['h-32 md:h-44', 'h-40 md:h-60', 'h-24 md:h-36'];
  const delays = [0.2, 0, 0.4];

  if (!items.length) return null;

  return (
    <div className="mt-12 mb-16 flex items-end justify-center gap-2 px-4 md:gap-8">
      {podiumSteps.map((item, index) => {
        if (!item) return <div key={index} className="invisible flex-1" />;
        const isFirst = index === 1;

        return (
          <MotionDiv
            key={item._id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: delays[index], duration: 0.6 }}
            className="relative flex max-w-[120px] flex-1 flex-col items-center md:max-w-[200px]"
          >
            <div className="mb-6 text-center group">
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 bg-glass-surface shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 md:h-20 md:w-20 ${
                  isFirst ? 'border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-white/10'
                }`}
              >
                {isFirst && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute inset-[-50%] bg-gradient-to-r from-yellow-500/40 via-transparent to-yellow-500/40"
                  />
                )}
                {item.profilePicture ? (
                  <img src={item.profilePicture} alt="" className="h-full w-full object-cover relative z-10" />
                ) : (
                  <span className="text-2xl font-black text-primary md:text-3xl relative z-10">
                    {(item.username || item.name || '?')[0]}
                  </span>
                )}
              </div>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-accent">
                {isFirst ? 'Grandmaster' : index === 0 ? 'Legend' : 'Elite'}
              </span>
              <p className="truncate px-1 text-sm font-bold text-primary md:text-base">{item.username || item.name}</p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <FiZap size={10} className="text-accent" />
                <p className="text-sm font-black tracking-tighter text-secondary md:text-lg">
                  {item.totalPoints.toLocaleString()}
                </p>
              </div>
            </div>

            <div className={`relative flex w-full flex-col items-center justify-start rounded-t-3xl border-t border-white/20 bg-gradient-to-b pt-6 shadow-2xl ${colors[index]} ${heights[index]}`}>
              <span className="select-none text-5xl font-black text-white/20 md:text-8xl">
                {index === 1 ? '1' : index === 0 ? '2' : '3'}
              </span>
              {isFirst && (
                <motion.div 
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ repeat: Infinity, duration: 2 }} 
                  className="absolute -top-6"
                >
                  <FiAward size={40} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
                </motion.div>
              )}
            </div>
          </MotionDiv>
        );
      })}
    </div>
  );
};

const BackgroundAnimation = () => {
  const bubbles = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 15 + 5,
    x: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5
  })), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute inset-0 opacity-20">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 25, repeat: Infinity }} className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 30, repeat: Infinity }} className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: "110vh" }}
          animate={{ opacity: [0, 0.4, 0], y: "-10vh" }}
          transition={{ duration: b.duration, repeat: Infinity, delay: b.delay, ease: "linear" }}
          className="absolute rounded-full bg-white/10 backdrop-blur-[1px]"
          style={{ width: b.size, height: b.size, left: `${b.x}vw` }}
        />
      ))}
    </div>
  );
};

const Leaderboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ window: 'all', page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [leaderType, setLeaderType] = useState('individual');
  const [sortConfig, setSortConfig] = useState(null);

  useSocket('leaderboard_update', () => {
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['clan-leaderboard'] });
  });

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig?.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const renderSortableHeader = (label, sortKey, align = 'left') => (
    <th className={`p-6 cursor-pointer hover:bg-white/5 transition-colors ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => requestSort(sortKey)}>
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {sortConfig?.key === sortKey && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
      </div>
    </th>
  );

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', filters],
    enabled: leaderType === 'individual',
    queryFn: async () => {
      if (USE_MOCK) return { data: mockLeaderboardMembers, meta: { page: 1, totalPages: 1 } };
      const params = new URLSearchParams({ window: filters.window, page: String(filters.page), limit: String(filters.limit) });
      const res = await api.get(`/api/submissions/leaderboard?${params.toString()}`);
      return { data: res.data.data || [], meta: res.data.meta || {} };
    },
  });

  const clanLeaderboardQuery = useQuery({
    queryKey: ['clan-leaderboard', filters.window],
    enabled: leaderType === 'clans',
    queryFn: async () => {
      if (USE_MOCK) return mockClans;
      const res = await api.get(`/api/clans/leaderboard?window=${filters.window}`);
      return res.data.data || [];
    },
  });

  const rows = useMemo(() => {
    return leaderType === 'clans' ? clanLeaderboardQuery.data || [] : leaderboardQuery.data?.data || [];
  }, [clanLeaderboardQuery.data, leaderboardQuery.data, leaderType]);

  const meta = leaderType === 'clans' ? { page: 1, totalPages: 1 } : leaderboardQuery.data?.meta || {};

  const visibleRows = useMemo(() => {
    let result = [...rows];
    const query = search.trim().toLowerCase();
    if (query) result = result.filter((row) => (row.username || row.name || '').toLowerCase().includes(query));
    
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, search, sortConfig]);

  const topThree = visibleRows.slice(0, 3);
  const myRow = leaderType === 'individual' ? rows.find((row) => row.username === user?.username) : null;
  const loading = leaderType === 'individual' ? leaderboardQuery.isLoading : clanLeaderboardQuery.isLoading;

  return (
    <div className="relative space-y-6 pb-20">
      <BackgroundAnimation />
      <PageHeader title="Hall of Fame" subtitle="Celebrate the top rankers and elite clans of the arena." />

      <div className="grid grid-cols-1 gap-4 macos-glass p-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
        <div className="segmented inline-flex">
          <button className={`segmented-btn flex items-center gap-2 ${leaderType === 'individual' ? 'active' : ''}`} onClick={() => setLeaderType('individual')}>
            <FiUser size={14} /> Individuals
          </button>
          <button className={`segmented-btn flex items-center gap-2 ${leaderType === 'clans' ? 'active' : ''}`} onClick={() => setLeaderType('clans')}>
            <FiUsers size={14} /> Clans
          </button>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input className="field-input pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select className="field-select" value={filters.window} onChange={(e) => setFilters((p) => ({ ...p, page: 1, window: e.target.value }))}>
          <option value="all">All Time</option>
          <option value="30d">Last 30 Days</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>

      <Podium items={topThree} leaderType={leaderType} />

      <AnimatePresence>
        {myRow && (
          <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="macos-glass flex items-center justify-between border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center gap-3">
              <FiTrendingUp className="text-accent" />
              <span className="font-semibold">Your Standing: Rank #{myRow.rank}</span>
            </div>
            <span className="text-lg font-bold text-accent">{myRow.totalPoints} pts</span>
          </MotionDiv>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4 space-y-3"><SkeletonCard /><SkeletonCard /></div>
        ) : (
          <div className="overflow-auto hidden md:block">
            <table className="responsive-table text-left">
              <thead>
                <tr className="border-b border-glass-border text-xs font-bold uppercase tracking-widest text-secondary">
                  {renderSortableHeader('Rank', 'rank')}
                  {renderSortableHeader(leaderType === 'individual' ? 'Coder' : 'Clan', 'username')}
                  {renderSortableHeader(leaderType === 'individual' ? 'Solved' : 'Members', 'solvedCount', 'center')}
                  {renderSortableHeader('XP Points', 'totalPoints', 'right')}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item, index) => (
                  <MotionRow key={item._id} className={`border-b border-glass-border/40 hover:bg-white/[0.02] ${item.username === user?.username ? 'border-l-4 border-l-accent bg-accent/10' : ''}`}>
                    <td className="p-6"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-glass-surface text-sm font-bold">{item.rank || index + 1}</div></td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-xl bg-glass-surface">{item.profilePicture && <img src={item.profilePicture} className="h-full w-full object-cover" />}</div>
                        <span className="font-bold">{item.username || item.name}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center text-secondary">{leaderType === 'individual' ? item.solvedCount : item.memberCount}</td>
                    <td className="p-6 text-right font-black text-accent">{item.totalPoints.toLocaleString()}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Leaderboard;