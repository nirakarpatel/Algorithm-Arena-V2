import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiMessageSquare, FiX } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { api } from '../../lib/api';

const ChiefNoticeTab = ({ clan }) => {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');

  const createMutation = useMutation({
    mutationFn: async (notice) => {
      const res = await api.post(`/api/clans/${clan._id}/notices`, { notice });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice posted to clan');
      queryClient.invalidateQueries(['chief-clan-info']);
      setCreateModal(false);
      setNoticeText('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (index) => {
      const res = await api.delete(`/api/clans/${clan._id}/notices/${index}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice removed');
      queryClient.invalidateQueries(['chief-clan-info']);
    }
  });

  if (!clan) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-section-title font-bold flex items-center gap-2">
          <FiMessageSquare className="text-blue-400" /> Internal Clan Notices
        </h2>
        <button onClick={() => setCreateModal(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
          <FiPlus /> Post Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clan.notices?.map((notice, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <BaseCard className="p-5 flex flex-col gap-3 group relative overflow-hidden border-l-4 border-blue-500">
              <div className="flex justify-between items-start pr-8">
                <p className="text-primary leading-relaxed text-sm">{notice}</p>
                <button 
                  onClick={() => { if(window.confirm('Delete this notice?')) deleteMutation.mutate(i); }} 
                  className="absolute top-4 right-4 text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 rounded-lg"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </BaseCard>
          </motion.div>
        ))}
        {(!clan.notices || clan.notices.length === 0) && (
          <div className="md:col-span-2 text-center py-10 text-tertiary">No internal clan notices posted.</div>
        )}
      </div>

      <AnimatePresence>
        {createModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary">Post Clan Notice</h3>
                  <button onClick={() => setCreateModal(false)} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>
                
                <div>
                  <textarea 
                    className="field-textarea text-sm" 
                    rows="4" 
                    placeholder="Enter message for your clan members..."
                    value={noticeText}
                    onChange={e => setNoticeText(e.target.value)}
                  />
                  <p className="text-[10px] text-tertiary mt-2">This will only be visible to members of {clan.name}.</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 text-secondary hover:bg-white/10 transition-colors">Cancel</button>
                  <button 
                    onClick={() => createMutation.mutate(noticeText)} 
                    disabled={createMutation.isLoading || !noticeText.trim()} 
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    {createMutation.isLoading ? 'Posting...' : 'Post Notice'}
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

export default ChiefNoticeTab;
