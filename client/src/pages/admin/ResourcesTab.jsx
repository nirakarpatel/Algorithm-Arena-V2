import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiFolder, FiFileText, FiLink, FiDownload, FiX, FiUploadCloud } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { api } from '../../lib/api';

const TOPICS = ['Arrays', 'Linked Lists', 'DP', 'Graphs', 'Trees', 'Stacks & Queues', 'Strings', 'Sorting'];

const ResourcesTab = () => {
  const queryClient = useQueryClient();
  const [activeFolder, setActiveFolder] = useState('Arrays');
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm] = useState({ title: '', folder: 'Arrays', type: 'PDF', url: '', sizeBytes: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  const resourcesQuery = useQuery({
    queryKey: ['admin-resources', activeFolder],
    queryFn: async () => {
      const res = await api.get(`/api/resources?folder=${encodeURIComponent(activeFolder)}`);
      return res.data.data || [];
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/resources', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Resource added!');
      queryClient.invalidateQueries(['admin-resources']);
      setUploadModal(false);
      setForm({ title: '', folder: activeFolder, type: 'PDF', url: '', sizeBytes: 0 });
      setFileName('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/resources/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Resource deleted');
      queryClient.invalidateQueries(['admin-resources']);
    }
  });

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File exceeds 20MB limit');
      return;
    }
    setFileName(file.name);
    if (!form.title) setForm(p => ({ ...p, title: file.name.replace('.pdf', '') }));
    setForm(p => ({ ...p, type: 'PDF', sizeBytes: file.size, url: URL.createObjectURL(file) })); // Mock URL
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.type === 'PDF' && !form.url) {
      toast.error('Please upload a PDF file'); return;
    }
    uploadMutation.mutate(form);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Folders Sidebar */}
      <div className="w-full md:w-64 space-y-4">
        <h2 className="text-section-title font-bold flex items-center gap-2"><FiFolder className="text-blue-400" /> Library</h2>
        <BaseCard className="p-2 space-y-1">
          {TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => setActiveFolder(topic)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeFolder === topic ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-secondary hover:bg-white/5 hover:text-primary border border-transparent'}`}
            >
              <FiFolder className={activeFolder === topic ? 'fill-blue-500/20' : ''} />
              {topic}
            </button>
          ))}
        </BaseCard>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-primary">{activeFolder}</h2>
            <p className="text-sm text-secondary">Manage study materials and resources.</p>
          </div>
          <button onClick={() => { setForm(p => ({ ...p, folder: activeFolder })); setUploadModal(true); }} className="btn-primary py-2 px-4 text-sm flex items-center gap-2 !bg-blue-500 hover:!bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <FiPlus /> Add Resource
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {resourcesQuery.data?.map((res, i) => (
            <motion.div key={res._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <BaseCard className="p-4 flex items-center gap-4 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${res.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {res.type === 'PDF' ? <FiFileText size={24} /> : <FiLink size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary truncate group-hover:text-blue-400 transition-colors">{res.title}</h3>
                  <div className="flex gap-3 text-[10px] font-mono text-tertiary mt-1">
                    <span className="uppercase font-bold">{res.type}</span>
                    {res.sizeBytes > 0 && <span>{formatSize(res.sizeBytes)}</span>}
                    <span>Added {new Date(res.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 text-secondary hover:bg-white/10 hover:text-white transition-colors">
                    {res.type === 'PDF' ? <FiDownload /> : <FiLink />}
                  </a>
                  <button onClick={() => { if(window.confirm('Delete resource?')) deleteMutation.mutate(res._id); }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    <FiTrash2 />
                  </button>
                </div>
              </BaseCard>
            </motion.div>
          ))}
          {resourcesQuery.data?.length === 0 && (
            <div className="xl:col-span-2 p-10 text-center border-2 border-dashed border-white/10 rounded-2xl text-tertiary">
              <FiFolder size={48} className="mx-auto mb-4 opacity-20" />
              <p>No resources found in {activeFolder}.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {uploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-6 border border-blue-500/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary">Add Resource</h3>
                  <button onClick={() => setUploadModal(false)} className="text-tertiary hover:text-primary"><FiX size={20} /></button>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl">
                  {['PDF', 'LINK'].map(type => (
                    <button key={type} onClick={() => setForm({ ...form, type, url: '' })} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.type === type ? 'bg-blue-500 text-white shadow' : 'text-tertiary hover:text-secondary'}`}>
                      {type}
                    </button>
                  ))}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="field-label">Resource Title</label>
                    <input required className="field-input" placeholder="e.g. Graph Algorithms Cheat Sheet" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>

                  <div>
                    <label className="field-label">Folder</label>
                    <select className="field-select" value={form.folder} onChange={e => setForm({...form, folder: e.target.value})}>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {form.type === 'LINK' ? (
                    <div>
                      <label className="field-label">External URL</label>
                      <input required type="url" className="field-input" placeholder="https://..." value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
                    </div>
                  ) : (
                    <div>
                      <label className="field-label">Upload PDF</label>
                      <div 
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden
                          ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'}`}
                      >
                        <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                        <FiUploadCloud size={32} className={`mx-auto mb-2 ${dragActive ? 'text-blue-400' : 'text-tertiary'}`} />
                        {fileName ? (
                          <p className="text-sm font-bold text-blue-400">{fileName}</p>
                        ) : (
                          <>
                            <p className="text-sm text-secondary font-bold">Drag & drop PDF here</p>
                            <p className="text-xs text-tertiary mt-1">or click to browse (Max 20MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4">
                    <button type="button" onClick={() => setUploadModal(false)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 text-secondary hover:bg-white/10 transition-colors">Cancel</button>
                    <button type="submit" disabled={uploadMutation.isLoading} className="btn-primary px-6 py-2 text-sm !bg-blue-500 hover:!bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      {uploadMutation.isLoading ? 'Uploading...' : 'Save Resource'}
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

export default ResourcesTab;
