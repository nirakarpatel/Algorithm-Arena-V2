import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiSearch, FiAlertTriangle, FiX, FiAward, FiEdit2 } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import MemberHoverCard from '../../components/MemberHoverCard';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { canManageClanMembers, canIssueWarning, canManageOwnClan, isClanArchived } from '../../lib/permissions';

const ChiefMembersTab = ({ clan }) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [levelModal, setLevelModal] = useState({ open: false, user: null });
  const [warnModal, setWarnModal] = useState({ open: false, user: null });
  const [selectedLevel, setSelectedLevel] = useState('');
  const [warnMessage, setWarnMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const isArchived = isClanArchived(clan);
  const canManageMembers = canManageClanMembers(currentUser, clan);
  const canManageClan = canManageOwnClan(currentUser, clan);

  const levelMutation = useMutation({
    mutationFn: async ({ userId, level }) => {
      const res = await api.put(`/api/users/${userId}/level`, { level });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Member level updated');
      queryClient.invalidateQueries(['chief-clan-info']);
      setLevelModal({ open: false, user: null });
    }
  });

  const warnMutation = useMutation({
    mutationFn: async ({ userId, message }) => {
      const res = await api.post(`/api/users/${userId}/warn`, { message });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Warning sent to member via email');
      queryClient.invalidateQueries(['chief-clan-info']);
      setWarnModal({ open: false, user: null });
      setWarnMessage('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to send warning');
    }
  });

  if (!clan) return null;

  if (isArchived) {
    return (
      <BaseCard className="p-6 border-amber-500/20 bg-amber-500/10 text-amber-200 text-sm font-bold flex items-center gap-2">
        <FiAlertTriangle /> This clan is archived. Member management is disabled until an admin restores it.
      </BaseCard>
    );
  }

  if (!canManageClan) {
    return (
      <BaseCard className="p-6 border-red-500/20 bg-red-500/10 text-red-200 text-sm font-bold flex items-center gap-2">
        <FiAlertTriangle /> Your chief role is not mapped to this clan, so member management is unavailable.
      </BaseCard>
    );
  }

  const members = clan.members || [];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (member.regNo && member.regNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const memberStatus = member.status || 'Active';
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && memberStatus === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2">
          <FiUsers className="text-blue-400" /> Member Management
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input 
              type="text" 
              placeholder="Search by name or reg no..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="field-input pl-10 h-10 text-sm w-full"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="field-select h-10 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Warned">Warned</option>
          </select>
        </div>
      </div>

      <BaseCard className="p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/[0.05] text-xs uppercase tracking-widest text-tertiary font-bold">
              <th className="p-4 pl-6">Member</th>
              <th className="p-4">Reg No</th>
              <th className="p-4">Level</th>
              <th className="p-4">Solved</th>
              <th className="p-4">Stats</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((user, i) => {
              const isWarned = user.status === 'Warned';
              const isInactive = user.status === 'Inactive';
              const isActive = !isWarned && !isInactive;
              const solved = user.solvedProblems || 0;

              return (
                <motion.tr 
                  key={user._id} 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }} 
                  className={`border-b border-white/[0.02] transition-colors ${isWarned ? 'bg-red-500/[0.05] hover:bg-red-500/10' : 'hover:bg-white/[0.02]'}`}
                >
                  <td className="p-4 pl-6 font-bold text-sm text-primary flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-glass-surface flex items-center justify-center font-black text-blue-400">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f1115] ${isActive ? 'bg-green-500 animate-pulse' : isWarned ? 'bg-red-500' : 'bg-gray-500'}`} />
                    </div>
                    <div>
                      {/* MemberHoverCard replaces ProfilePopover — click opens full profile */}
                      <MemberHoverCard userId={user._id} username={user.username}>
                        <span className="cursor-pointer hover:text-blue-400 transition-colors block">{user.username}</span>
                      </MemberHoverCard>
                      <span className="text-[10px] text-tertiary uppercase">{user.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-secondary font-mono">{user.regNo || 'N/A'}</td>
                  <td className="p-4 text-sm">
                    <button 
                      onClick={() => {
                        if (!canManageMembers) return;
                        setLevelModal({ open: true, user });
                        setSelectedLevel(user.codingLevel || 'Beginner');
                      }}
                      disabled={!canManageMembers}
                      className="group relative inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-tertiary hover:text-white border border-white/10 transition-all uppercase tracking-widest disabled:opacity-50"
                      title="Click to change level"
                    >
                      {user.codingLevel || 'Beginner'}
                      <FiEdit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                  <td className="p-4 text-sm text-secondary font-mono font-bold">{solved} solved</td>
                  <td className="p-4 text-xs font-bold">
                    <div className="flex flex-col gap-1 text-secondary">
                      <span className="flex items-center gap-1 text-yellow-400"><FiAward size={12}/> {user.points || 0} XP</span>
                      <span>🔥 {user.streak || 0} days</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {isWarned ? (
                      <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">Warned</span>
                    ) : isActive ? (
                      <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest">Active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-md bg-white/10 text-tertiary text-[10px] font-black uppercase tracking-widest">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button 
                      onClick={() => {
                        if (!canIssueWarning(currentUser, user, clan)) return;
                        setWarnModal({ open: true, user });
                      }}
                      disabled={!canIssueWarning(currentUser, user, clan) || !canManageMembers}
                      className={`p-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 disabled:opacity-50 ${isWarned ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-white/5 text-secondary hover:text-red-400 hover:bg-red-500/10'}`}
                      title="Issue Warning"
                    >
                      <FiAlertTriangle /> {isWarned ? 'Warn Again' : 'Warn'}
                    </button>
                  </td>
                </motion.tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-tertiary text-sm">
                  No members found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </BaseCard>

      {/* Level Change Modal */}
      <AnimatePresence>
        {levelModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm">
              <BaseCard className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary">Update Level</h3>
                  <button onClick={() => setLevelModal({ open: false, user: null })} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-4">Select new level for <strong className="text-white">{levelModal.user.username}</strong>:</p>
                  <select className="field-select w-full" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setLevelModal({ open: false, user: null })} className="px-4 py-2 text-sm text-secondary hover:text-white">Cancel</button>
                    <button 
                    onClick={() => levelMutation.mutate({ userId: levelModal.user._id, level: selectedLevel })}
                    disabled={levelMutation.isPending || !canManageMembers}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {levelMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warning Modal */}
      <AnimatePresence>
        {warnModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-6 border border-red-500/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-red-400 flex items-center gap-2"><FiAlertTriangle /> Issue Warning</h3>
                  <button onClick={() => setWarnModal({ open: false, user: null })} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-4">This will send an official warning email to <strong className="text-white">{warnModal.user.username}</strong> ({warnModal.user.email}) and flag their status.</p>
                  <textarea 
                    className="field-textarea text-sm" 
                    rows="3" 
                    placeholder="Reason for warning..."
                    value={warnMessage}
                    onChange={e => setWarnMessage(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setWarnModal({ open: false, user: null })} className="px-4 py-2 text-sm text-secondary hover:text-white">Cancel</button>
                  <button 
                    onClick={() => warnMutation.mutate({ userId: warnModal.user._id, message: warnMessage })}
                    disabled={warnMutation.isPending || !warnMessage || !canIssueWarning(currentUser, warnModal.user, clan)}
                    className="btn-primary px-4 py-2 text-sm !bg-red-500 hover:!bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
                  >
                    {warnMutation.isPending ? 'Sending...' : 'Send Warning Email'}
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

export default ChiefMembersTab;
