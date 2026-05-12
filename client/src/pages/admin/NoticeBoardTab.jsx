import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiBell, FiX, FiCheck, FiInfo, FiAlertTriangle, FiStar } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { api } from '../../lib/api';

const NoticeBoardTab = () => {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ content: '', priority: 'General', isPinned: false });

  const noticesQuery = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/api/notices/history');
      return res.data.data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/notices', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice published globally!');
      queryClient.invalidateQueries(['admin-notices']);
      setCreateModal(false);
      setForm({ content: '', priority: 'General', isPinned: false });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to publish notice');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/notices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice removed');
      queryClient.invalidateQueries(['admin-notices']);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const getPriorityColors = (priority) => {
    switch(priority) {
      case 'Urgent': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'Info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      default: return 'border-purple-500/50 bg-purple-500/10 text-purple-400';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'Urgent': return <FiAlertTriangle />;
      case 'Info': return <FiInfo />;
      default: return <FiBell />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-section-title font-bold flex items-center gap-2"><FiBell className="text-yellow-400" /> Global Notice Board</h2>
        <button onClick={() => setCreateModal(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] !bg-yellow-500 hover:!bg-yellow-600 !text-black">
          <FiPlus /> New Broadcast
        </button>
      </div>

      <div className="space-y-4">
        {noticesQuery.data?.map((notice, i) => (
          <motion.div key={notice._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <BaseCard className={`p-5 flex flex-col gap-3 relative overflow-hidden border-l-4 ${getPriorityColors(notice.priority).split(' ')[0]}`}>
              {notice.isPinned && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow flex items-center gap-1">
                  <FiStar size={10} /> Pinned
                </div>
              )}
              <div className="flex justify-between items-start pr-16">
                <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${getPriorityColors(notice.priority)}`}>
                  {getPriorityIcon(notice.priority)} {notice.priority}
                </div>
                <button onClick={() => { if(window.confirm('Delete this notice?')) deleteMutation.mutate(notice._id); }} className="text-red-400 hover:text-red-300 p-1 bg-red-500/10 rounded-lg">
                  <FiTrash2 size={16} />
                </button>
              </div>
              <p className="text-primary leading-relaxed text-sm">{notice.content}</p>
              <div className="text-[10px] text-tertiary flex items-center gap-2 font-mono">
                <span>By {notice.createdBy?.username || 'Admin'}</span> • <span>{new Date(notice.createdAt).toLocaleString()}</span>
              </div>
            </BaseCard>
          </motion.div>
        ))}
        {noticesQuery.data?.length === 0 && (
          <div className="text-center py-10 text-tertiary">No notices broadcasted yet.</div>
        )}
      </div>

      <AnimatePresence>
        {createModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg">
              <BaseCard className="p-6 space-y-6 border border-yellow-500/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary">New Broadcast</h3>
                  <button onClick={() => setCreateModal(false)} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="field-label">Priority Level</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {['General', 'Info', 'Urgent'].map(p => (
                        <button type="button" key={p} onClick={() => setForm({...form, priority: p})} 
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2
                          ${form.priority === p ? getPriorityColors(p) + ' scale-105' : 'border-white/10 bg-white/5 text-secondary hover:bg-white/10'}`}>
                          {getPriorityIcon(p)} {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Message Content</label>
                    <textarea required rows="4" className="field-textarea text-sm" placeholder="Enter the announcement..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm({...form, isPinned: !form.isPinned})} className={`w-10 h-6 rounded-full p-1 transition-colors ${form.isPinned ? 'bg-yellow-500' : 'bg-white/10'}`}>
                      <motion.div className="w-4 h-4 bg-white rounded-full shadow" animate={{ x: form.isPinned ? 16 : 0 }} />
                    </button>
                    <span className="text-sm font-bold text-secondary flex items-center gap-1"><FiStar className="text-yellow-500"/> Pin to top</span>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 text-secondary hover:bg-white/10 transition-colors">Cancel</button>
                    <button type="submit" disabled={createMutation.isLoading} className="btn-primary px-6 py-2 text-sm !bg-yellow-500 hover:!bg-yellow-600 !text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                      {createMutation.isLoading ? 'Broadcasting...' : 'Broadcast & Notify'}
                    </button>
                  </div>
                </form>
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoticeBoardTab;
