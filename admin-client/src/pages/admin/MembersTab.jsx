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

import { USE_MOCK } from '../../lib/mockData';

const MembersTab = ({ initialClanFilter }) => {
  const queryClient = useQueryClient();
  const { user, confirmSessionIfNeeded } = useAuth();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [clanFilter, setClanFilter] = useState(initialClanFilter || '');
  const [minSolved, setMinSolved] = useState('');
  const [maxSolved, setMaxSolved] = useState('');
  const [sortBy, setSortBy] = useState('Default');
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const canManageUsers = canManageClanGlobally(user);
  const [adminEmail, setAdminEmail] = useState('');
  const [chiefSelectModal, setChiefSelectModal] = useState(null);

  const addAdminMutation = useMutation({
    mutationFn: async (email) => {
      return api.post('/api/users/add-admin', { email });
    },
    onSuccess: (res) => {
      toast.success(res.data?.message || "Admin access granted successfully");
      setAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmail) return;

    try {
      await confirmSessionIfNeeded();
      await addAdminMutation.mutateAsync(adminEmail);
    } catch (err) {
      if (err.message !== 'User cancelled re-authentication') {
        toast.error(err.response?.data?.message || "Failed to grant admin access");
      }
    }
  };

  const usersQuery = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      try {
        if (USE_MOCK) return [];
        const res = await api.get('/api/users');
        return res.data.data || [];
      } catch (err) {
        console.warn("Failed to fetch users.", err);
        return [];
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
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setMenuOpen(null);
    }
  });

  const assignChiefMutation = useMutation({
    mutationFn: async ({ clanId, userId }) => {
      return api.put(`/api/clans/${clanId}/chief`, { userId });
    },
    onSuccess: () => {
      toast.success("Clan Chief assigned successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-clans-list'] });
      setChiefSelectModal(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to assign chief");
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId) => {
      return api.put(`/api/users/${userId}/ban`);
    },
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setMenuOpen(null);
    },
    onError: () => {
      toast.error("Failed to ban user");
    }
  });

  const removeChiefMutation = useMutation({
    mutationFn: async (clanId) => {
      return api.delete(`/api/clans/${clanId}/chief`);
    },
    onSuccess: () => {
      toast.success("Clan Chief demoted to member successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-clans-list'] });
      setMenuOpen(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to demote chief");
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId) => {
      return api.put(`/api/users/${userId}/unban`);
    },
    onSuccess: () => {
      toast.success("User unbanned");
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setMenuOpen(null);
    },
    onError: () => {
      toast.error("Failed to unban user");
    }
  });

  const handleRoleChange = async (targetUser, role) => {
    if (!canManageUsers) return;

    // Bypass window.confirm to avoid browser blocking issues

    try {
      await confirmSessionIfNeeded();
      await updateRoleMutation.mutateAsync({ userId: targetUser._id, role });
    } catch (err) {
      if (err.message !== 'User cancelled re-authentication') {
        toast.error(err.response?.data?.message || "Failed to update role");
      }
    }
  };

  // Filter users
  const filteredUsers = (usersQuery.data || []).filter(u => {
    if (u.role === 'admin' || u.role === 'superAdmin') return false;
    
    const s = search.toLowerCase();
    const matchSearch = (u.username || '').toLowerCase().includes(s) || 
                        (u.regNo && u.regNo.toLowerCase().includes(s)) ||
                        (u.email && u.email.toLowerCase().includes(s));
    const matchLevel = levelFilter ? u.codingLevel === levelFilter : true;
    let matchClan = true;
    if (clanFilter === 'unassigned') {
      matchClan = !u.clan;
    } else if (clanFilter) {
      matchClan = u.clan?._id === clanFilter || u.clan === clanFilter;
    }

    const solved = u.solvedProblems || 0;
    const matchesMin = minSolved === '' || solved >= parseInt(minSolved);
    const matchesMax = maxSolved === '' || solved <= parseInt(maxSolved);

    return matchSearch && matchLevel && matchClan && matchesMin && matchesMax;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aSolved = a.solvedProblems || 0;
    const bSolved = b.solvedProblems || 0;
    if (sortBy === 'Solved (Low to High)') return aSolved - bSolved;
    if (sortBy === 'Solved (High to Low)') return bSolved - aSolved;
    return 0; // Default
  });

  const handleDownloadCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Reg No', 'Clan', 'Level', 'Solved', 'XP', 'Streak', 'Status'];
    const rows = sortedUsers.map(u => {
      const activeClan = u.clan ? (clansQuery.data || []).find(c => c._id === u.clan || c._id === u.clan?._id) : null;
      const clanName = activeClan ? activeClan.name : 'Unassigned';
      let status = 'Not Started';
      if ((u.solvedProblems || 0) > 0) status = 'In Progress'; // Can't easily determine 'Completed all' globally without total question count
      
      return [
        `"${u.name || ''}"`,
        `"${u.username || ''}"`,
        `"${u.email || ''}"`,
        `"${u.regNo || 'N/A'}"`,
        `"${clanName}"`,
        `"${u.codingLevel || 'Beginner'}"`,
        u.solvedProblems || 0,
        u.points || 0,
        u.streak || 0,
        `"${u.status || 'Active'}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Admin_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2"><FiUsers className="text-green-400" /> Member Directory</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or Reg No..."
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="relative">
            <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <select
              value={clanFilter}
              onChange={(e) => setClanFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Clans</option>
              <option value="unassigned">Unassigned</option>
              {clansQuery.data?.filter(c => c.status === 'active').map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-black/20 rounded-lg border border-black/10 dark:border-white/10 h-9">
            <span className="text-xs text-slate-500 dark:text-tertiary font-bold uppercase">Solved:</span>
            <input 
              type="number" 
              placeholder="Min" 
              value={minSolved}
              onChange={e => setMinSolved(e.target.value)}
              className="w-12 bg-transparent text-sm text-black dark:text-white text-center focus:outline-none border-b border-transparent focus:border-blue-500/50"
            />
            <span className="text-slate-500 dark:text-tertiary">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxSolved}
              onChange={e => setMaxSolved(e.target.value)}
              className="w-12 bg-transparent text-sm text-black dark:text-white text-center focus:outline-none border-b border-transparent focus:border-blue-500/50"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-black dark:text-white appearance-none focus:outline-none focus:border-blue-500/50"
            >
              <option value="Default">Sort: Default</option>
              <option value="Solved (Low to High)">Solved (Low to High)</option>
              <option value="Solved (High to Low)">Solved (High to Low)</option>
            </select>
          </div>
          
          <button 
            onClick={handleDownloadCSV}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-bold border border-blue-500/20 whitespace-nowrap h-9 flex items-center"
          >
            Export CSV
          </button>
        </div>
      </div>
      </div>

      {chiefSelectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark/90 border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-xl text-white font-medium mb-4 flex items-center gap-2">
              <FiShield className="text-blue-400" />
              Assign Clan Chief
            </h3>
            <p className="text-sm text-secondary mb-6">
              Select a clan to assign <span className="text-white font-medium">{chiefSelectModal.username}</span> as the chief.
              If the clan already has a chief, they will be demoted to a regular member.
            </p>
            
            <div className="max-h-[300px] overflow-y-auto mb-6 bg-black/30 rounded border border-white/5 divide-y divide-white/5 custom-scrollbar">
              {clansQuery.data?.filter(c => c.status === 'active').length === 0 ? (
                <div className="p-4 text-center text-secondary text-sm">No active clans available.</div>
              ) : (
                clansQuery.data?.filter(c => c.status === 'active').map(clan => (
                  <button
                    key={clan._id}
                    onClick={() => {
                      assignChiefMutation.mutate({ clanId: clan._id, userId: chiefSelectModal._id });
                    }}
                    disabled={assignChiefMutation.isPending}
                    className="w-full text-left p-3 hover:bg-white/5 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{clan.name}</div>
                      <div className="text-xs text-tertiary">
                        {clan.chief ? `Current Chief: ${clan.chief.username || 'Assigned'}` : 'No Chief Assigned'}
                      </div>
                    </div>
                    <FiUserCheck className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setChiefSelectModal(null)}
                className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors"
                disabled={assignChiefMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {canManageUsers && (
        <BaseCard className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-md font-bold text-primary flex items-center gap-2">
                <FiShield className="text-red-400" /> Pre-authorize Google Admin Email
              </h3>
              <p className="text-xs text-secondary">
                Enter a Google email address to pre-authorize Admin privileges.
                Registered users will be promoted immediately. Unregistered users will be granted access upon signup.
              </p>
            </div>
            <form onSubmit={handleAddAdmin} className="flex gap-2 w-full md:w-auto min-w-[320px]">
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="e.g. admin@gmail.com"
                className="field-input text-sm flex-1 h-10"
                required
              />
              <button
                type="submit"
                disabled={addAdminMutation.isPending}
                className="px-4 py-2 text-sm h-10 flex items-center justify-center gap-1.5 whitespace-nowrap bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl"
              >
                {addAdminMutation.isPending ? 'Granting...' : 'Grant Admin'}
              </button>
            </form>
          </div>
        </BaseCard>
      )}

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
              {sortedUsers.map((user, i) => (
                <motion.tr key={user._id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors group">
                  <td className="p-4 pl-6 font-bold text-sm text-primary">
                    <MemberHoverCard userId={user._id} username={user.username}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-black transition-colors">
                          {(user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className="transition-colors">{user.username || user.email || 'Onboarding Pending'}</span>
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
                  <td className="p-4 text-right pr-6">
                    <button
                      onClick={(e) => {
                        if (menuOpen === user._id) {
                          setMenuOpen(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                        setMenuOpen(user._id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-tertiary hover:text-primary"
                      aria-label="Member actions"
                    >
                      <FiMoreVertical />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr><td colSpan="7" className="p-10 text-center text-tertiary">No members found matching the criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-white/[0.05] bg-white/[0.01] text-xs text-tertiary flex justify-between items-center px-6">
          <span>Showing {sortedUsers.length} members</span>
        </div>
      </BaseCard>

      {menuOpen && (() => {
        const menuUser = filteredUsers.find((u) => u._id === menuOpen);
        if (!menuUser) return null;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
            <div
              style={{ top: menuPos.top, right: menuPos.right }}
              className="fixed w-48 bg-[#121218] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-1">
                {menuUser.role === 'superAdmin' ? (
                  <div className="px-3 py-2 text-xs text-tertiary italic flex items-center gap-2">
                    <FiShield className="text-yellow-400" /> Protected Super Admin
                  </div>
                ) : menuUser.status === 'Banned' ? (
                  <button
                    onClick={() => {
                      if (!canManageUsers) return;
                      unbanUserMutation.mutate(menuUser._id);
                    }}
                    disabled={!canManageUsers}
                    className="w-full text-left px-3 py-2 text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded flex items-center gap-2 disabled:opacity-50"
                  >
                    <FiUserCheck /> Unban User
                  </button>
                ) : (
                  <>
                    {menuUser.role === 'user' && (
                      <button
                        onClick={() => {
                          setMenuOpen(null);
                          setChiefSelectModal(menuUser);
                        }}
                        disabled={!canManageUsers}
                        className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-white hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiShield className="text-blue-400" /> Make Clan Chief
                      </button>
                    )}
                    {menuUser.role === 'clan-chief' && (
                      <button
                        onClick={async () => {
                          if (!canManageUsers) return;
                          try {
                            const clanId = typeof menuUser.clan === 'object' ? menuUser.clan?._id : menuUser.clan;
                            if (clanId) {
                              await confirmSessionIfNeeded();
                              await removeChiefMutation.mutateAsync(clanId);
                            } else {
                              await handleRoleChange(menuUser, 'user');
                            }
                          } catch (err) {
                            if (err.message !== 'User cancelled re-authentication') {
                              toast.error(err.response?.data?.message || "Failed to demote chief");
                            }
                          }
                        }}
                        disabled={!canManageUsers || removeChiefMutation.isPending}
                        className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-white hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiUserCheck className="text-green-400" /> Make Member
                      </button>
                    )}
                    <div className="h-px bg-white/10 my-1 mx-2" />
                    <button
                      onClick={() => {
                        if (!canManageUsers) return;
                        if (menuUser.role === 'superAdmin') {
                          toast.error("Cannot ban a superAdmin");
                          return;
                        }
                        banUserMutation.mutate(menuUser._id);
                      }}
                      disabled={!canManageUsers || menuUser.role === 'superAdmin'}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiUserX /> Ban User
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default MembersTab;
