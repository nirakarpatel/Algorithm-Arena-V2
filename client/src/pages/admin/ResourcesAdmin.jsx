import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiUpload, FiTrash2, FiFileText } from 'react-icons/fi';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import BaseCard from '../../components/BaseCard';
import toast from 'react-hot-toast';

const ResourcesAdmin = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ title: '', category: 'DP', type: 'PDF', url: '' });

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await api.get('/api/resources');
      return res.data.data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (newResource) => {
      const res = await api.post('/api/resources', newResource);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-resources']);
      toast.success('Resource deployed to Intel Archives.');
      setFormData({ title: '', category: 'DP', type: 'PDF', url: '' });
    },
    onError: () => toast.error('Failed to deploy resource.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-resources']);
      toast.success('Resource purged.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Intel Archives" 
        subtitle="Upload and manage curriculum documents." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BaseCard className="lg:col-span-1 h-fit">
          <h2 className="font-bold mb-4">Deploy New Resource</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Title</label>
              <input 
                type="text" required
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none focus:border-accent/50" 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-secondary mb-1">Category</label>
                <select 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none"
                >
                  <option value="DP">DP</option>
                  <option value="Graphs">Graphs</option>
                  <option value="Trees">Trees</option>
                  <option value="Arrays">Arrays</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1">Type</label>
                <select 
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none"
                >
                  <option value="PDF">PDF</option>
                  <option value="JSON">JSON</option>
                  <option value="LINK">LINK</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">URL / Link</label>
              <input 
                type="url" required
                value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-primary focus:outline-none focus:border-accent/50" 
              />
            </div>
            <button 
              type="submit" 
              disabled={uploadMutation.isPending}
              className="w-full py-2 bg-accent/20 text-accent hover:bg-accent hover:text-white rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"
            >
              <FiUpload /> {uploadMutation.isPending ? 'Deploying...' : 'Deploy Resource'}
            </button>
          </form>
        </BaseCard>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold">Active Archives</h2>
          {isLoading ? (
            <p className="text-secondary text-sm">Loading...</p>
          ) : resources.length === 0 ? (
            <BaseCard className="text-center text-secondary text-sm py-8">No resources deployed yet.</BaseCard>
          ) : (
            <div className="space-y-2">
              {resources.map(res => (
                <div key={res._id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <FiFileText className="text-accent" />
                    <div>
                      <p className="text-sm font-bold text-primary leading-tight">{res.title}</p>
                      <p className="text-[10px] uppercase font-black text-tertiary">{res.category} • {res.type}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(window.confirm('Are you sure you want to purge this resource?')) {
                        deleteMutation.mutate(res._id);
                      }
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesAdmin;
