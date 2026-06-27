import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAward, FiX, FiCheck, FiSearch, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

const RARITY_CONFIG = {
  COMMON:    { text: 'text-slate-400',  bg: 'bg-slate-500/10  border-slate-500/20' },
  RARE:      { text: 'text-blue-400',   bg: 'bg-blue-500/10   border-blue-500/20'  },
  EPIC:      { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  LEGENDARY: { text: 'text-amber-400',  bg: 'bg-amber-500/10  border-amber-500/20'  },
};

// ── Award Badge Modal ─────────────────────────────────────────────────────────
const AwardBadgeModal = ({ member, chiefBadges, onClose, onAward }) => {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAward = async () => {
    if (!selected) return;
    setLoading(true);
    await onAward(member._id, selected._id);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <FiAward className="text-amber-400" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Award Chief Badge</p>
            <p className="text-xs text-white/40 truncate">
              To: <span className="text-white/60">{member.name || member.username}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1">
            <FiX size={16} />
          </button>
        </div>

        {/* Badge Picker */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Select a Badge</p>
          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {chiefBadges.map(badge => {
              const r = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.COMMON;
              const isSelected = selected?._id === badge._id;
              return (
                <button
                  key={badge._id}
                  onClick={() => setSelected(badge)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{badge.name}</p>
                    <p className="text-xs text-white/40 truncate">{badge.description}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${r.bg} ${r.text}`}>
                    {badge.rarity}
                  </span>
                  {isSelected && <FiCheck size={14} className="text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-white/5 border border-white/8 text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAward}
            disabled={!selected || loading}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Awarding…' : `Award "${selected?.name || 'Badge'}"`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ChiefBadgesTab = ({ clan }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [awardingMember, setAwardingMember] = useState(null);

  // Fetch chief badge pool
  const { data: chiefBadges = [] } = useQuery({
    queryKey: ['chief-badge-pool'],
    queryFn: async () => {
      const res = await api.get('/api/badges/chief');
      return res.data.data;
    },
  });

  // Fetch member badges
  const { data: memberBadgeMap = {}, isLoading } = useQuery({
    queryKey: ['member-badges', clan?._id],
    queryFn: async () => {
      if (!clan?.members?.length) return {};
      const results = await Promise.all(
        clan.members.map(async m => {
          try {
            const res = await api.get(`/api/badges/user/${m._id}`);
            const chiefAwarded = (res.data.data || []).filter(b => b.isChiefBadge && b.isUnlocked);
            return [m._id, chiefAwarded];
          } catch { return [m._id, []]; }
        })
      );
      return Object.fromEntries(results);
    },
    enabled: !!clan?.members?.length,
  });

  const awardMutation = useMutation({
    mutationFn: async ({ userId, badgeId }) => {
      await api.post(`/api/badges/award/${userId}`, { badgeId });
    },
    onSuccess: () => {
      toast.success('Badge awarded successfully! 🏆');
      queryClient.invalidateQueries({ queryKey: ['member-badges'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to award badge.'),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }) => {
      await api.delete(`/api/badges/revoke/${userId}/${badgeId}`);
    },
    onSuccess: () => {
      toast.success('Badge revoked.');
      queryClient.invalidateQueries({ queryKey: ['member-badges'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to revoke badge.'),
  });

  const members = (clan?.members || []).filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FiAward className="text-amber-400" />
            Award Chief Badges
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Recognize outstanding members with honorary badges. These badges appear permanently on their profile.
          </p>
        </div>
        <div className="relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="field-input pl-8 py-2 text-xs h-9 w-52"
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chief badge pool preview */}
      <div className="flex flex-wrap gap-2">
        {chiefBadges.map(b => (
          <div key={b._id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs">
            <span>{b.icon}</span>
            <span className="text-amber-300/80 font-semibold">{b.name}</span>
          </div>
        ))}
      </div>

      {/* Member list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const awarded = memberBadgeMap[member._id] || [];
            return (
              <div
                key={member._id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.05] transition-colors"
              >
                {/* Avatar */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.profilePicture
                      ? <img src={member.profilePicture} alt={member.username} className="w-full h-full object-cover" />
                      : <FiUser size={14} className="text-accent" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{member.name || member.username}</p>
                    <p className="text-xs text-white/40">@{member.username}</p>
                  </div>
                </div>

                {/* Awarded badges */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {awarded.length === 0 && (
                    <span className="text-xs text-white/20 italic">No chief badges yet</span>
                  )}
                  {awarded.map(badge => (
                    <div key={badge._id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 group">
                      <span className="text-sm">{badge.icon}</span>
                      <span className="text-xs text-amber-300 font-semibold">{badge.name}</span>
                      <button
                        onClick={() => revokeMutation.mutate({ userId: member._id, badgeId: badge._id })}
                        className="ml-0.5 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Revoke badge"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Award button */}
                <button
                  onClick={() => setAwardingMember(member)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
                >
                  <FiAward size={12} />
                  Award Badge
                </button>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <FiUser size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No members found.</p>
            </div>
          )}
        </div>
      )}

      {/* Award modal */}
      <AnimatePresence>
        {awardingMember && (
          <AwardBadgeModal
            member={awardingMember}
            chiefBadges={chiefBadges}
            onClose={() => setAwardingMember(null)}
            onAward={async (userId, badgeId) => {
              await awardMutation.mutateAsync({ userId, badgeId });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChiefBadgesTab;
