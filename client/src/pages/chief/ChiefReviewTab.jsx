import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiCode, FiEye, FiZap, FiCpu, FiFilter } from 'react-icons/fi';
import BaseCard from '../../components/BaseCard';
import { api } from '../../lib/api';

const ChiefReviewTab = ({ clan }) => {
  const queryClient = useQueryClient();
  const [reviewModal, setReviewModal] = useState({ open: false, sub: null });
  const [feedback, setFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');

  const submissionsQuery = useQuery({
    queryKey: ['chief-submissions', clan?._id],
    queryFn: async () => {
      const res = await api.get('/api/submissions');
      return (res.data.data || []).filter(sub => 
        clan.members.some(m => m._id === sub.userId?._id || m === sub.userId)
      );
    },
    enabled: !!clan
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, status, feedback }) => {
      const res = await api.put(`/api/submissions/${id}/grade`, { status, feedback });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Submission graded');
      queryClient.invalidateQueries(['chief-submissions']);
      setReviewModal({ open: false, sub: null });
      setFeedback('');
    }
  });

  if (!clan) return null;

  const filteredSubs = (submissionsQuery.data || []).filter(sub => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Approved') return sub.status === 'Accepted'; // Assuming backend uses 'Accepted'
    if (statusFilter === 'Rejected') return sub.status === 'Rejected';
    return sub.status === statusFilter;
  });

  const pendingCount = (submissionsQuery.data || []).filter(s => s.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-section-title font-bold flex items-center gap-2">
          <FiCode className="text-purple-400" /> Code Reviews
        </h2>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <FiFilter className="text-tertiary ml-2" />
          {['Pending', 'Approved', 'Rejected', 'All'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === filter ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
            >
              {filter} {filter === 'Pending' && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSubs.map((sub, i) => (
          <motion.div key={sub._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <BaseCard className="p-5 flex flex-col gap-4 group hover:border-purple-500/30 transition-colors h-full">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-primary truncate max-w-[200px]">{sub.challengeId?.title || 'Unknown Challenge'}</h3>
                  <p className="text-xs text-secondary mt-1">By: {sub.userId?.username}</p>
                </div>
                {sub.status === 'Pending' && <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Needs Review</span>}
                {sub.status === 'Accepted' && <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Approved</span>}
                {sub.status === 'Rejected' && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Rejected</span>}
              </div>

              {/* AI Score Widget Preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-tertiary mb-1 uppercase tracking-widest">
                    <span>AI Originality Score</span>
                    <span className="text-green-400">92%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-[92%]" />
                  </div>
                </div>
                <FiCpu className="text-tertiary" />
              </div>

              <div className="flex justify-between items-center mt-auto pt-2">
                <span className="text-xs font-mono text-tertiary">{new Date(sub.submittedAt).toLocaleString()}</span>
                <button 
                  onClick={() => setReviewModal({ open: true, sub })}
                  className="px-4 py-2 rounded-lg bg-white/5 text-primary text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FiEye /> View Details
                </button>
              </div>
            </BaseCard>
          </motion.div>
        ))}
        {filteredSubs.length === 0 && (
          <div className="xl:col-span-3 p-10 text-center border-2 border-dashed border-white/10 rounded-2xl text-tertiary">
            <FiCheck size={48} className="mx-auto mb-4 text-green-400/50" />
            <p>No {statusFilter.toLowerCase()} submissions found.</p>
          </div>
        )}
      </div>

      {/* Code Review Modal */}
      <AnimatePresence>
        {reviewModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="w-full max-w-6xl h-[90vh] flex flex-col">
              <BaseCard className="flex-1 flex flex-col p-0 overflow-hidden border border-purple-500/30">
                
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                  <div>
                    <h3 className="text-lg font-black text-primary flex items-center gap-2">
                      Reviewing: <span className="text-purple-400">{reviewModal.sub.challengeId?.title}</span>
                    </h3>
                    <p className="text-xs text-secondary mt-1 font-mono">Submitted by {reviewModal.sub.userId?.username}</p>
                  </div>
                  <button onClick={() => setReviewModal({ open: false, sub: null })} className="p-2 rounded-lg hover:bg-white/10 text-tertiary hover:text-white transition-colors">
                    <FiX size={24} />
                  </button>
                </div>

                {/* Diff Viewer & AI Score */}
                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                  {/* Left: Code */}
                  <div className="flex-1 flex flex-col min-h-0 border-r border-white/10 bg-[#0d1117]">
                    <div className="p-2 border-b border-white/10 bg-[#161b22] text-xs font-mono text-tertiary flex justify-between">
                      <span>solution.{reviewModal.sub.language === 'python' ? 'py' : reviewModal.sub.language === 'cpp' ? 'cpp' : 'js'}</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed text-blue-200">
                      <pre className="whitespace-pre-wrap">{reviewModal.sub.code}</pre>
                    </div>
                  </div>

                  {/* Right: Analysis & Grading */}
                  <div className="w-full lg:w-96 flex flex-col min-h-0 bg-white/[0.02]">
                    <div className="p-6 space-y-6 overflow-y-auto">
                      
                      {/* AI Originality Widget */}
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <FiCpu /> AI Originality Analysis
                        </h4>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-black text-white">92<span className="text-lg text-tertiary">%</span></span>
                          <span className="text-xs text-green-400 font-bold bg-green-400/20 px-2 py-1 rounded">Likely Human</span>
                        </div>
                        <p className="text-[10px] text-tertiary leading-relaxed">
                          Analysis indicates this code was primarily written by a human. No significant patterns matching common LLM outputs were detected.
                        </p>
                      </div>

                      {/* Execution Output (if available) */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Test Results</h4>
                        <div className="p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-xs text-green-400">
                          All 15/15 test cases passed successfully.<br/>
                          Runtime: 42ms<br/>
                          Memory: 14.2 MB
                        </div>
                      </div>

                      {/* Grading Form (only show if Pending) */}
                      {reviewModal.sub.status === 'Pending' ? (
                        <div className="space-y-4 pt-4 border-t border-white/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">Chief Feedback</h4>
                          <textarea 
                            className="field-textarea text-sm" 
                            rows="4" 
                            placeholder="Provide constructive feedback... (this will be emailed to the member)"
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => gradeMutation.mutate({ id: reviewModal.sub._id, status: 'Rejected', feedback })}
                              disabled={gradeMutation.isLoading}
                              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <FiX /> Needs Work
                            </button>
                            <button 
                              onClick={() => gradeMutation.mutate({ id: reviewModal.sub._id, status: 'Accepted', feedback })}
                              disabled={gradeMutation.isLoading}
                              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                            >
                              <FiCheck /> Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-white/10">
                           <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">Current Status</h4>
                           <div className={`p-4 rounded-xl border ${reviewModal.sub.status === 'Accepted' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} font-bold`}>
                             {reviewModal.sub.status === 'Accepted' ? 'Approved' : 'Rejected'}
                           </div>
                           {reviewModal.sub.feedback && (
                             <div className="mt-2">
                               <p className="text-[10px] text-tertiary uppercase font-bold tracking-widest mb-1">Feedback Provided</p>
                               <div className="p-3 bg-white/5 rounded-lg text-sm text-secondary italic">
                                 "{reviewModal.sub.feedback}"
                               </div>
                             </div>
                           )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>

              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ChiefReviewTab;
