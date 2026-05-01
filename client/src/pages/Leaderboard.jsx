import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiAward, FiSearch, FiUsers, FiTrendingUp, FiZap, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';
import { USE_MOCK } from '../lib/mockData';
import { useAuth } from '../context/useAuth';



const Podium = ({ items, type }) => {
  // Sort items for podium: [2, 1, 3] layout
  const podiumSteps = [
    items[1], // 2nd Place
    items[0], // 1st Place
    items[2]  // 3rd Place
  ];

  const colors = [
    'from-slate-400/80 via-slate-300 to-slate-500/50', // Silver
    'from-yellow-500 via-yellow-200 to-yellow-600/50', // Gold
    'from-orange-600 via-orange-300 to-orange-700/50' // Bronze
  ];

  const heights = ['h-32 md:h-44', 'h-40 md:h-60', 'h-24 md:h-36'];
  const delays = [0.2, 0, 0.4];

  return (
    <div className="flex items-end justify-center gap-2 md:gap-8 mb-16 mt-12 px-4">
      {podiumSteps.map((item, index) => {
        if (!item) return <div key={index} className="flex-1 invisible" />;
        
        const isFirst = index === 1;
        const colorClass = colors[index];
        const heightClass = heights[index];

        return (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: delays[index], duration: 1, type: "spring", bounce: 0.4 }}
            className="flex flex-col items-center flex-1 max-w-[120px] md:max-w-[200px] relative group"
          >
            <div className={`mb-6 text-center transform transition-transform group-hover:-translate-y-2 duration-500`}>
              <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-glass-surface border-2 ${isFirst ? 'border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-white/10'} flex items-center justify-center mb-3 shadow-2xl mx-auto overflow-hidden relative`}>
                 {isFirst && (
                   <motion.div 
                     animate={{ rotate: 360 }} 
                     transition={{ repeat: Infinity, duration: 8, ease: "linear" }} 
                     className="absolute inset-[-50%] bg-gradient-to-r from-yellow-500/40 via-transparent to-yellow-500/40" 
                   />
                 )}
                 {item.profilePicture ? (
                    <img src={item.profilePicture} alt="" className="w-full h-full object-cover relative z-10" />
                 ) : (
                    <span className="text-2xl md:text-3xl font-black text-primary relative z-10">{item.username?.[0] || item.name?.[0]}</span>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
              </div>
              
              <div className="flex flex-col items-center">
                <span className="font-black text-[10px] md:text-none text-accent uppercase tracking-widest mb-1">
                  {isFirst ? 'Grandmaster' : index === 0 ? 'Legend' : 'Elite'}
                </span>
                <p className="font-bold text-sm md:text-base text-primary truncate max-w-full px-1">
                  {item.username || item.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                   <FiZap size={10} className="text-accent" />
                   <p className="text-secondary font-black text-sm md:text-lg tracking-tighter">
                     {item.totalPoints.toLocaleString()}
                   </p>
                </div>
              </div>
            </div>
            
            <div className={`w-full ${heightClass} rounded-t-3xl bg-gradient-to-b ${colorClass} relative shadow-2xl flex flex-col items-center justify-start pt-6 border-t border-white/20`}>
                <span className="text-white/20 text-5xl md:text-8xl font-black select-none">{index === 1 ? '1' : index === 0 ? '2' : '3'}</span>
                {isFirst && (
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -top-6"
                  >
                    <FiAward size={40} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
                  </motion.div>
                )}
            </div>
            <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full -z-10 group-hover:bg-accent/10 transition-colors" />
          </motion.div>
        );
      })}
    </div>
  );
};

const Leaderboard = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ window: 'all', page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [leaderType, setLeaderType] = useState('individual'); // 'individual' or 'clans'
  const [sortConfig, setSortConfig] = useState(null);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
         direction = 'desc';
      } else {
         setSortConfig(null);
         return;
      }
    } else {
      if (key === 'totalPoints' || key === 'solvedCount' || (key === 'clanOrMembers' && leaderType === 'clans')) {
        direction = 'desc';
      }
    }
    setSortConfig({ key, direction });
  };

  const renderSortableHeader = (label, sortKey, align = 'left') => (
    <th 
      className={`p-6 cursor-pointer group hover:bg-white/5 transition-colors select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        {sortConfig?.key === sortKey ? (
          sortConfig.direction === 'asc' ? <FiChevronUp className="text-accent" /> : <FiChevronDown className="text-accent" />
        ) : (
          <div className="opacity-0 group-hover:opacity-30 transition-opacity flex flex-col -space-y-[0.4rem] text-[10px]">
            <FiChevronUp/><FiChevronDown/>
          </div>
        )}
      </div>
    </th>
  );

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', filters, leaderType],
    enabled: leaderType === 'individual',
    queryFn: async () => {
      if (USE_MOCK) {
        return { data: [], meta: { page: 1, totalPages: 1 } };
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
    queryKey: ['clan-leaderboard'],
    enabled: leaderType === 'clans',
    queryFn: async () => {
      const res = await api.get('/api/clans/leaderboard');
      return res.data.data || [];
    },
  });

  const rows = useMemo(() => {
    if (leaderType === 'clans') {
      return clanLeaderboardQuery.data || [];
    }
    
    return leaderboardQuery.data?.data || [];
  }, [leaderboardQuery.data, clanLeaderboardQuery.data, leaderType]);

  const meta = leaderType === 'clans' ? { page: 1, totalPages: 1 } : (leaderboardQuery.data?.meta || {});
  
  const visibleRows = useMemo(() => {
    let result = [...rows];
    
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((row) => (row.username || row.name).toLowerCase().includes(query));
    }
    
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'nameOrUsername') {
           valA = a.username || a.name || '';
           valB = b.username || b.name || '';
        }
        if (sortConfig.key === 'clanOrMembers') {
           valA = leaderType === 'individual' ? (a.clan || '') : (a.memberCount || 0);
           valB = leaderType === 'individual' ? (b.clan || '') : (b.memberCount || 0);
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [rows, search, sortConfig, leaderType]);

  const myRow = leaderType === 'individual' ? rows.find((row) => row.username === user?.username) : null;
  const topThree = rows.slice(0, 3);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Hall of Fame"
        subtitle="Celebrate the top rankers and elite clans of the arena."
        actions={
          <div className="segmented">
            <button 
              className={`segmented-btn ${leaderType === 'individual' ? 'active' : ''}`}
              onClick={() => { setLeaderType('individual'); setSortConfig(null); }}
            >
              <FiAward />
              Individual
            </button>
            <button 
              className={`segmented-btn ${leaderType === 'clans' ? 'active' : ''}`}
              onClick={() => { setLeaderType('clans'); setSortConfig(null); }}
            >
              <FiUsers />
              Clans
            </button>
          </div>
        }
      />

      <Podium items={topThree} type={leaderType} />
      <div className="macos-glass p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            className="field-input pl-9"
            placeholder={leaderType === 'individual' ? "Search coders..." : "Search clans..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field-select"
          value={filters.window}
          onChange={(e) => setFilters((p) => ({ ...p, page: 1, window: e.target.value }))}
        >
          <option value="all">All Time</option>
          <option value="30d">30 Days</option>
          <option value="7d">7 Days</option>
        </select>
        <select
          className="field-select"
          value={filters.limit}
          onChange={(e) => setFilters((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {myRow && leaderType === 'individual' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="macos-glass p-4 flex flex-wrap items-center justify-between gap-2 border-accent/30 bg-accent/5"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-accent/20 text-accent">
               <FiTrendingUp />
             </div>
             <span className="font-semibold text-primary">Your current standing in this window</span>
          </div>
          <span className="text-accent font-bold text-lg">Rank #{myRow.rank} — {myRow.totalPoints} pts</span>
        </motion.div>
      )}

      <Card className="p-0 overflow-hidden">
        {(leaderboardQuery.isLoading && leaderType === 'individual') || (clanLeaderboardQuery.isLoading && leaderType === 'clans') ? (
          <div className="p-4 space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState title="No rankings found" description="Adjust your filters or try a different search." />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={leaderType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="hidden md:block overflow-auto">
                <table className="responsive-table text-left">
                  <thead>
                    <tr className="border-b border-glass-border text-secondary text-xs uppercase tracking-widest font-bold">
                      {renderSortableHeader('Rank', 'rank', 'left')}
                      {renderSortableHeader(leaderType === 'individual' ? 'Coder' : 'Clan', 'nameOrUsername', 'left')}
                      {renderSortableHeader(leaderType === 'individual' ? 'Clan' : 'Members', 'clanOrMembers', 'center')}
                      {renderSortableHeader('Solved', 'solvedCount', 'center')}
                      {renderSortableHeader('XP Points', 'totalPoints', 'right')}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((item, index) => {
                      const isMe = leaderType === 'individual' && item.username === user?.username;
                      const isPodium = item.rank <= 3;
                      return (
                        <motion.tr
                          key={item._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`border-b border-glass-border/40 transition-colors hover:bg-white/[0.02] ${isMe ? 'bg-accent/10 border-l-4 border-l-accent' : ''}`}
                        >
                          <td className="p-6">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isPodium ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-secondary'}`}>
                               {item.rank}
                             </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-glass-surface flex items-center justify-center font-bold text-accent overflow-hidden">
                                {item.profilePicture ? (
                                   <img src={item.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (item.username || item.name)[0]
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-primary flex items-center gap-2">
                                  {item.username || item.name}
                                  {isMe && <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-white italic">YOU</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <span className="px-2 py-1 rounded bg-glass-surface text-xs font-mono">
                              {leaderType === 'individual' ? (item.clan || 'Solo') : item.memberCount}
                            </span>
                          </td>
                          <td className="p-6 text-center text-secondary font-medium">{item.solvedCount}</td>
                          <td className="p-6 text-right">
                             <span className="font-black text-primary bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500">
                               {item.totalPoints.toLocaleString()}
                             </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden p-4 space-y-4">
                {visibleRows.map((item) => {
                  const isMe = leaderType === 'individual' && item.username === user?.username;
                  return (
                    <div key={item._id} className={`macos-glass p-5 border-glass-border ${isMe ? 'border-accent bg-accent/5' : ''}`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-secondary">#{item.rank}</span>
                          <span className="font-bold text-lg">{item.username || item.name}</span>
                        </div>
                        <span className="font-black text-accent">{item.totalPoints} pts</span>
                      </div>
                      <div className="flex justify-between text-sm text-secondary">
                        <span>Solved: {item.solvedCount}</span>
                        {leaderType === 'clans' && <span>{item.memberCount} Members</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </Card>


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
