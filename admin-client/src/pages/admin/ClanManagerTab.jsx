import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiUserPlus, FiPercent, FiX, FiShield, FiArrowLeft, FiTrash2, FiAward, FiPlus, FiUserMinus, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import MemberHoverCard from '../../components/MemberHoverCard';
import { api } from '../../lib/api';

const ClanManagerTab = () => {
  const queryClient = useQueryClient();
  const [assignModal, setAssignModal] = useState({ open: false, user: null });
  const [selectedClanForAssign, setSelectedClanForAssign] = useState('');
  const [viewClanId, setViewClanId] = useState(null);
  const [createModal, setCreateModal] = useState({ open: false, name: '', tag: '', description: '' });

  const clansQuery = useQuery({
    queryKey: ['admin-clans'],
    queryFn: async () => {
      const res = await api.get('/api/clans/leaderboard?status=all');
      return res.data.data || [];
    }
  });

  const clanDetailQuery = useQuery({
    queryKey: ['admin-clan-detail', viewClanId],
    queryFn: async () => {
      const res = await api.get(`/api/clans/${viewClanId}/admin-stats`);
      return res.data.data;
    },
    enabled: !!viewClanId
  });

  const unassignedQuery = useQuery({
    queryKey: ['admin-unassigned-users'],
    queryFn: async () => {
      const res = await api.get('/api/users');
      // Filter out users who already have a clan
      return (res.data.data || []).filter(u => !u.clan && u.role === 'user');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newClan) => {
      const res = await api.post('/api/clans', newClan);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clan created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      setCreateModal({ open: false, name: '', tag: '', description: '' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create clan');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (clanId) => {
      const res = await api.patch(`/api/clans/${clanId}/archive`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clan archived');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      if (viewClanId) queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to archive clan');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (clanId) => {
      const res = await api.patch(`/api/clans/${clanId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clan restored');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      if (viewClanId) queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore clan');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (clanId) => {
      const res = await api.delete(`/api/clans/${clanId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clan permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-users'] });
      setViewClanId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete clan');
    }
  });

  const assignMutation = useMutation({
    mutationFn: async ({ clanId, userId }) => {
      const res = await api.post(`/api/clans/${clanId}/members`, { userId });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Member assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-users'] });
      if (viewClanId) queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
      setAssignModal({ open: false, user: null });
      setSelectedClanForAssign('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to assign member');
    }
  });

  const handleAssign = () => {
    if (!selectedClanForAssign) {
      toast.error('Please select a clan');
      return;
    }
    assignMutation.mutate({ clanId: selectedClanForAssign, userId: assignModal.user._id });
  };

  const removeMemberMutation = useMutation({
    mutationFn: async ({ clanId, userId }) => {
      const res = await api.delete(`/api/clans/${clanId}/members/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Member removed from clan');
      queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-users'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  });

  const assignChiefMutation = useMutation({
    mutationFn: async ({ clanId, userId }) => {
      return api.put(`/api/clans/${clanId}/chief`, { userId });
    },
    onSuccess: () => {
      toast.success("Clan chief updated");
      queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    },
    onError: () => {
      toast.error("Failed to update clan chief");
    }
  });

  const removeChiefMutation = useMutation({
    mutationFn: async ({ clanId }) => {
      return api.delete(`/api/clans/${clanId}/chief`);
    },
    onSuccess: () => {
      toast.success("Chief demoted to regular member");
      queryClient.invalidateQueries({ queryKey: ['admin-clan-detail', viewClanId] });
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    },
    onError: () => {
      toast.error("Failed to demote chief");
    }
  });

  const handleDemote = async (member) => {
    if (!window.confirm(`Demote ${member.username} to regular member?`)) {
      return;
    }
    removeChiefMutation.mutate({ clanId: viewClanId });
  };

  if (viewClanId) {
    const clan = clanDetailQuery.data;
    const isArchived = clan?.status === 'archived';
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <button onClick={() => setViewClanId(null)} className="flex items-center gap-2 text-tertiary hover:text-primary transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-xl w-fit">
          <FiArrowLeft /> Back to Clan Overview
        </button>

        {clanDetailQuery.isLoading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : clan ? (
          <>
            <BaseCard className="p-6 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-3xl font-black text-primary flex items-center gap-3">
                    {clan.name}
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-tertiary font-mono tracking-widest uppercase">{clan.tag}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase ${isArchived ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'}`}>
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
                  </h2>
                  <p className="text-secondary mt-2">{clan.description}</p>
                  {isArchived && (
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                      <FiAlertTriangle /> Read-only archive. Restore this clan before making further changes.
                    </p>
                  )}
                  <div className="text-sm text-tertiary mt-2 flex items-center gap-2">
                    <FiShield className="text-accent" /> Chief: 
                    {clan.chief ? (
                       <MemberHoverCard userId={clan.chief._id} username={clan.chief.username}>
                          <strong className="text-primary hover:text-accent transition-colors cursor-pointer">{clan.chief.username}</strong>
                       </MemberHoverCard>
                    ) : (
                       <strong className="text-primary">Unassigned</strong>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                    <p className="text-2xl font-black text-blue-400">{clan.members?.length || 0}</p>
                    <p className="text-[10px] text-tertiary uppercase font-bold tracking-widest">Members</p>
                  </div>
                  <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                    <p className="text-2xl font-black text-green-400">
                      {clan.members?.reduce((acc, m) => acc + (m.solvedCount || 0), 0) || 0}
                    </p>
                    <p className="text-[10px] text-tertiary uppercase font-bold tracking-widest">Total Solved</p>
                  </div>
                  <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                    <p className="text-2xl font-black text-purple-400">
                      {clan.members?.reduce((acc, m) => acc + (m.points || 0), 0) || 0}
                    </p>
                    <p className="text-[10px] text-tertiary uppercase font-bold tracking-widest">Total Points</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex flex-wrap gap-3">
                {!isArchived ? (
                  <button
                    onClick={() => {
                      if (window.confirm(`Archive ${clan.name}? Members will keep their assignment until an admin restores or deletes the clan.`)) {
                        archiveMutation.mutate(clan._id);
                      }
                    }}
                    disabled={archiveMutation.isLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-60"
                  >
                    <FiAlertTriangle /> {archiveMutation.isLoading ? 'Archiving...' : 'Archive Clan'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (window.confirm(`Restore ${clan.name}?`)) {
                          restoreMutation.mutate(clan._id);
                        }
                      }}
                      disabled={restoreMutation.isLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                    >
                      <FiRefreshCw /> {restoreMutation.isLoading ? 'Restoring...' : 'Restore Clan'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently delete ${clan.name}? This will remove the clan, members' clan links, and chat history.`)) {
                          deleteMutation.mutate(clan._id);
                        }
                      }}
                      disabled={deleteMutation.isLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                    >
                      <FiTrash2 /> {deleteMutation.isLoading ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </>
                )}
              </div>
            </BaseCard>

            <h3 className="text-xl font-bold flex items-center gap-2 text-primary mt-8"><FiUsers className="text-blue-400" /> Clan Roster & Progress</h3>
            <BaseCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.05] text-xs uppercase tracking-widest text-tertiary font-bold">
                      <th className="p-4">Member</th>
                      <th className="p-4">Reg No</th>
                      <th className="p-4">Coding Level</th>
                      <th className="p-4">Points</th>
                      <th className="p-4">Solved</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clan.members?.map(member => (
                      <tr key={member._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-black">
                            {(member.username?.[0] || member.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary flex items-center gap-2">
                              <MemberHoverCard userId={member._id} username={member.username}>
                                <span className="hover:text-accent transition-colors cursor-pointer">{member.username || member.email || 'Onboarding Pending'}</span>
                              </MemberHoverCard>
                              {clan.chief?._id === member._id && <FiAward className="text-yellow-400" title="Clan Chief" />}
                            </p>
                            <p className="text-xs text-tertiary">{member.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-secondary font-mono">{member.regNo || 'N/A'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-tertiary border border-white/10 uppercase tracking-widest">
                            {member.codingLevel || 'Beginner'}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-purple-400">{member.points || 0}</td>
                        <td className="p-4 text-sm font-bold text-green-400">{member.solvedCount || 0}</td>
                        <td className="p-4 flex items-center justify-end gap-2">
                          {isArchived ? (
                            <span className="text-xs font-bold text-tertiary uppercase tracking-widest">Read only</span>
                          ) : (
                            <>
                              {clan.chief?._id !== member._id ? (
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`Make ${member.username} the Clan Chief?`)) {
                                      assignChiefMutation.mutate({ clanId: clan._id, userId: member._id });
                                    }
                                  }}
                                  className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                  title="Make Clan Chief"
                                >
                                  <FiShield size={14} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleDemote(member)}
                                  className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                                  title="Demote to Member"
                                >
                                  <FiUserMinus size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Remove ${member.username} from clan?`)) {
                                    removeMemberMutation.mutate({ clanId: clan._id, userId: member._id });
                                  }
                                }} 
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Remove Member"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!clan.members || clan.members.length === 0) && (
                      <tr><td colSpan="6" className="p-8 text-center text-tertiary text-sm">No members in this clan.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </BaseCard>
          </>
        ) : (
          <div className="p-8 text-center text-red-400">Failed to load clan details.</div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clan Cards Grid */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
         <h2 className="text-section-title font-bold flex items-center gap-2"><FiShield className="text-accent" /> Clan Overview</h2>
         <button onClick={() => setCreateModal({ ...createModal, open: true })} className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm w-full sm:w-auto">
            <FiPlus /> Create Clan
         </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {clansQuery.data?.map((clan, i) => (
          <motion.div key={clan._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <BaseCard 
              className={`p-5 flex flex-col gap-4 relative overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors ${clan.status === 'archived' ? 'opacity-70 border-amber-500/20' : ''}`}
              onClick={() => setViewClanId(clan._id)}
            >
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors" />
              
              <div>
                <h3 className="font-bold text-xl text-primary group-hover:text-accent transition-colors">{clan.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-black">
                  <span className={`px-2 py-1 rounded-full ${clan.status === 'archived' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {clan.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </div>
                <div className="text-xs text-tertiary uppercase tracking-widest mt-1 flex items-center gap-1">
                   Chief: 
                   <span className="text-secondary font-bold">
                      {clan.chief ? (
                        <MemberHoverCard userId={clan.chief._id} username={clan.chief.username}>
                           <span className="hover:text-accent transition-colors">{clan.chief.username}</span>
                        </MemberHoverCard>
                      ) : 'None'}
                   </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center my-2">
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.05]">
                  <p className="text-lg font-black text-blue-400">{clan.memberCount}</p>
                  <p className="text-[9px] text-tertiary uppercase font-bold"><FiUsers className="inline mr-1"/>Members</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.05]">
                  <p className="text-lg font-black text-green-400">{clan.solvedCount}</p>
                  <p className="text-[9px] text-tertiary uppercase font-bold"><FiPercent className="inline mr-1"/>Solved</p>
                </div>
              </div>
            </BaseCard>
          </motion.div>
        ))}
      </div>

      {/* Unassigned Members Table */}
      <div className="mt-8">
        <h2 className="text-section-title font-bold flex items-center gap-2 mb-4"><FiUsers className="text-orange-400" /> Unassigned Recruits</h2>
        <BaseCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05] text-xs uppercase tracking-widest text-tertiary font-bold">
                  <th className="p-4">Recruit</th>
                  <th className="p-4">Reg No</th>
                  <th className="p-4">Branch/Year</th>
                  <th className="p-4">Level</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {unassignedQuery.data?.map(user => (
                  <tr key={user._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                    <td className="p-4 font-bold text-sm text-primary flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-black">{(user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}</div>
                      <MemberHoverCard userId={user._id} username={user.username}>
                        <span className="hover:text-accent transition-colors cursor-pointer">{user.username || user.email || 'Onboarding Pending'}</span>
                      </MemberHoverCard>
                    </td>
                    <td className="p-4 text-sm text-secondary font-mono">{user.regNo || 'N/A'}</td>
                    <td className="p-4 text-sm text-secondary">{user.branch} / {user.year}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-tertiary border border-white/10 uppercase tracking-widest">
                        {user.codingLevel}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setAssignModal({ open: true, user })} className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/30 transition-colors border border-orange-500/20 inline-flex items-center gap-1">
                        <FiUserPlus /> Assign Clan
                      </button>
                    </td>
                  </tr>
                ))}
                {unassignedQuery.data?.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-tertiary text-sm">No unassigned recruits found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary">Assign Recruit</h3>
                  <button onClick={() => setAssignModal({ open: false, user: null })} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                
                <div>
                  <p className="text-sm text-secondary mb-4">Assigning <strong className="text-white">{assignModal.user.username}</strong> to a clan. This will notify the member and the Clan Chief via email.</p>
                  <label className="field-label">Select Clan</label>
                  <select className="field-select w-full" value={selectedClanForAssign} onChange={(e) => setSelectedClanForAssign(e.target.value)}>
                    <option value="">-- Choose a Clan --</option>
                    {clansQuery.data?.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.memberCount} members) - Chief: {c.chief?.username || 'None'}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setAssignModal({ open: false, user: null })} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 text-secondary hover:bg-white/10 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleAssign} disabled={assignMutation.isLoading || !selectedClanForAssign} className="btn-primary px-6 py-2 text-sm">
                    {assignMutation.isLoading ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Clan Modal */}
      <AnimatePresence>
        {createModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-black text-primary flex items-center gap-2"><FiShield className="text-accent"/> Create New Clan</h3>
                  <button onClick={() => setCreateModal({ ...createModal, open: false })} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                
                <div className="space-y-3">
                  <div>
                     <label className="field-label">Clan Name</label>
                     <input className="field-input w-full" placeholder="e.g. Cyber Ninjas" value={createModal.name} onChange={e => setCreateModal(m => ({...m, name: e.target.value}))} />
                  </div>
                  <div>
                     <label className="field-label">Clan Tag (Unique)</label>
                     <input className="field-input w-full uppercase font-mono" placeholder="e.g. CYBER" maxLength={15} value={createModal.tag} onChange={e => setCreateModal(m => ({...m, tag: e.target.value.toUpperCase()}))} />
                  </div>
                  <div>
                     <label className="field-label">Description</label>
                     <textarea className="field-input w-full min-h-[80px]" placeholder="Brief lore or description..." value={createModal.description} onChange={e => setCreateModal(m => ({...m, description: e.target.value}))} />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button onClick={() => setCreateModal({ ...createModal, open: false })} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 text-secondary hover:bg-white/10 hover:text-white transition-colors">Cancel</button>
                  <button 
                    onClick={() => createMutation.mutate({ name: createModal.name, tag: createModal.tag, description: createModal.description })} 
                    disabled={createMutation.isLoading || !createModal.name || !createModal.tag} 
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    {createMutation.isLoading ? 'Creating...' : 'Create Clan'}
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClanManagerTab;
