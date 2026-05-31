import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiAward, FiStar, FiUserCheck, FiUserX, FiAlertCircle, FiUsers, FiMoreVertical, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import MemberHoverCard from '../../components/MemberHoverCard';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { canManageClanGlobally } from '../../lib/permissions';
import toast from 'react-hot-toast';

import { USE_MOCK, mockLeaderboardMembers } from '../../lib/mockData';

const MembersTab = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [clanFilter, setClanFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const canManageUsers = canManageClanGlobally(user);

  const usersQuery = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      try {
        if (USE_MOCK) return mockLeaderboardMembers;
        const res = await api.get('/api/users');
        return res.data.data || [];
      } catch (err) {
        console.warn("Failed to fetch users, using mock data.", err);
        return mockLeaderboardMembers;
      }
    }
  });

  const clansQuery = useQuery({
    queryKey: ['admin-clans-list'],
    queryFn: async () => {
      const res = await api.get('/api/clans');
      return res.data.data || [];
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      return api.put(`/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries(['admin-all-users']);
      setMenuOpen(null);
    },
    onError: () => {
      toast.error("Failed to update role");
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId) => {
      return api.put(`/api/users/${userId}/ban`);
    },
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries(['admin-all-users']);
      setMenuOpen(null);
    },
    onError: () => {
      toast.error("Failed to ban user");
    }
  });

  // Filter users
  const filteredUsers = (usersQuery.data || []).filter(u => {
    const s = search.toLowerCase();
    const matchSearch = u.username.toLowerCase().includes(s) || (u.regNo && u.regNo.toLowerCase().includes(s));
    const matchLevel = levelFilter ? u.codingLevel === levelFilter : true;
    const matchClan = clanFilter ? u.clan?._id === clanFilter || u.clan === clanFilter : true;
    return matchSearch && matchLevel && matchClan;
  });

  const getStatusDot = (status) => {
    switch(status) {
      case 'Active': return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />;
      case 'Warned': return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />;
      default: return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'Beginner': return 'bg-white/5 border-white/10 text-secondary';
      case 'Intermediate': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'Advanced': return 'bg-red-500/10 border-red-500/20 text-red-400';
      default: return 'bg-white/5 border-white/10 text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2"><FiUsers className="text-green-400" /> Member Directory</h2>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input className="field-input pl-9 w-full md:w-64" placeholder="Search name or Reg No..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <select className="field-select pl-9 appearance-none" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <select className="field-select pl-9 appearance-none" value={clanFilter} onChange={e => setClanFilter(e.target.value)}>
              <option value="">All Clans</option>
              {clansQuery.data?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <BaseCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse relative">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.05] text-xs uppercase tracking-widest text-tertiary font-bold">
                <th className="p-4 pl-6">Member</th>
                <th className="p-4">Reg No</th>
                <th className="p-4">Clan</th>
                <th className="p-4">Level</th>
                <th className="p-4 text-center">Stats</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => (
                <motion.tr key={user._id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors group">
                  <td className="p-4 pl-6 font-bold text-sm text-primary">
                    <MemberHoverCard userId={user._id} username={user.username}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-black transition-colors">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="transition-colors">{user.username}</span>
                      </div>
                    </MemberHoverCard>
                  </td>
                  <td className="p-4 text-sm text-secondary font-mono">{user.regNo || '---'}</td>
                  <td className="p-4 text-sm">
                    {user.clan ? (
                      <span className="text-secondary">{clansQuery.data?.find(c => c._id === user.clan || c._id === user.clan?._id)?.name || 'Unknown'}</span>
                    ) : (
                      <span className="text-tertiary italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-widest ${getLevelColor(user.codingLevel)}`}>
                      {user.codingLevel}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3 text-xs font-mono">
                      <span className="text-accent flex items-center gap-1" title="Points"><FiStar /> {user.points || 0}</span>
                      <span className="text-orange-400 flex items-center gap-1" title="Streak">🔥 {user.streak || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center" title={user.status || 'Active'}>
                      {getStatusDot(user.status || 'Active')}
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6 relative">
                    <button 
                      onClick={() => setMenuOpen(menuOpen === user._id ? null : user._id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 text-tertiary"
                    >
                      <FiMoreVertical />
                    </button>
                    {menuOpen === user._id && (
                       <div className="absolute right-10 top-4 w-48 bg-[#121218] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                         <div className="p-1">
                            <button 
                              onClick={() => canManageUsers && updateRoleMutation.mutate({ userId: user._id, role: 'clan-chief' })}
                              disabled={!canManageUsers}
                              className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-white hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50"
                            >
                              <FiShield className="text-blue-400" /> Make Clan Chief
                            </button>
                            <button 
                              onClick={() => canManageUsers && updateRoleMutation.mutate({ userId: user._id, role: 'member' })}
                              disabled={!canManageUsers}
                              className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-white hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50"
                            >
                              <FiUserCheck className="text-green-400" /> Make Member
                            </button>
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <button 
                              onClick={() => {
                                if (!canManageUsers) return;
                                if(window.confirm(`Ban user ${user.username}?`)) {
                                  banUserMutation.mutate(user._id);
                                }
                              }}
                              disabled={!canManageUsers}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded flex items-center gap-2 disabled:opacity-50"
                            >
                              <FiUserX /> Ban User
                            </button>
                         </div>
                       </div>
                    )}
                  </td>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan="7" className="p-10 text-center text-tertiary">No members found matching the criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-white/[0.05] bg-white/[0.01] text-xs text-tertiary flex justify-between items-center px-6">
          <span>Showing {filteredUsers.length} members</span>
        </div>
      </BaseCard>

      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
};

export default MembersTab;
