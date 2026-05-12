import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiRadio, FiTrash2 } from 'react-icons/fi';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import BaseCard from '../../components/BaseCard';
import toast from 'react-hot-toast';

const NoticesAdmin = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ title: '', content: '', type: 'Standard' });

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/api/notices/history');
      return res.data.data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (newNotice) => {
      const res = await api.post('/api/notices', newNotice);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-notices']);
      toast.success('Transmission Broadcasted Globally.');
      setFormData({ title: '', content: '', type: 'Standard' });
    },
    onError: () => toast.error('Failed to broadcast transmission.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-notices']);
      toast.success('Transmission Revoked.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Network Broadcaster" 
        subtitle="Deploy global transmissions to all operatives." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BaseCard className="lg:col-span-1 h-fit">
          <h2 className="font-bold mb-4">New Transmission</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Signal Title</label>
              <input 
                type="text" required
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none focus:border-accent/50" 
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Priority Level</label>
              <select 
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none"
              >
                <option value="Standard">Standard</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Payload Content</label>
              <textarea 
                required rows={4}
                value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none focus:border-accent/50 resize-none" 
              />
            </div>
            <button 
              type="submit" 
              disabled={uploadMutation.isPending}
              className="w-full py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"
            >
              <FiRadio /> {uploadMutation.isPending ? 'Broadcasting...' : 'Broadcast Transmission'}
            </button>
          </form>
        </BaseCard>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold">Active Transmissions</h2>
          {isLoading ? (
            <p className="text-secondary text-sm">Intercepting signals...</p>
          ) : notices.length === 0 ? (
            <BaseCard className="text-center text-secondary text-sm py-8">No active transmissions.</BaseCard>
          ) : (
            <div className="space-y-3">
              {notices.map(notice => (
                <BaseCard key={notice._id} className="p-4" hover={false}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${notice.type === 'Urgent' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {notice.type}
                        </span>
                        <h3 className="font-bold text-primary">{notice.title}</h3>
                      </div>
                      <p className="text-sm text-secondary">{notice.content}</p>
                      <p className="text-[10px] text-tertiary mt-2">Transmitted: {new Date(notice.createdAt).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if(window.confirm('Are you sure you want to revoke this transmission?')) {
                          deleteMutation.mutate(notice._id);
                        }
                      }}
                      className="text-red-400 hover:bg-red-500/20 p-2 rounded transition-colors"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </BaseCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticesAdmin;
