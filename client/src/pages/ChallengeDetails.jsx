import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiClipboard, FiRefreshCw, FiTrash2, FiGithub, FiCode, FiFileText, FiClock, FiChevronLeft, FiSend } from 'react-icons/fi';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../lib/api';
import { USE_MOCK, mockChallenges, mockSubmissions } from '../lib/mockData';

const starterByLanguage = {
  javascript: 'function solve(input) {\n  // TODO: implement\n  return input;\n}\n',
  python: 'def solve(data):\n    # TODO: implement\n    return data\n',
  java: 'class Solution {\n    public static void solve() {\n        // TODO: implement\n    }\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: implement\n    return 0;\n}\n',
};

const ChallengeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draftKey = `challenge-draft:${id}`;

  const [repoUrl, setRepoUrl] = useState('');
  const [codeByLang, setCodeByLang] = useState({});
  const [language, setLanguage] = useState('javascript');
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState('description');

  // Derived: current code for the active language
  const codeSnippet = codeByLang[language] || '';
  const setCodeSnippet = (val) => {
    const newVal = typeof val === 'function' ? val(codeByLang[language] || '') : val;
    setCodeByLang((prev) => ({ ...prev, [language]: newVal }));
  };

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      setRepoUrl(draft.repoUrl || '');
      // Support both old format (codeSnippet string) and new format (codeByLang map)
      if (draft.codeByLang) {
        setCodeByLang(draft.codeByLang);
      } else if (draft.codeSnippet) {
        setCodeByLang({ [draft.language || 'javascript']: draft.codeSnippet });
      }
      setLanguage(draft.language || 'javascript');
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    const hasAnyCode = Object.values(codeByLang).some((c) => c.trim());
    const hasDraft = repoUrl.trim() || hasAnyCode;
    if (!hasDraft) {
      localStorage.removeItem(draftKey);
      return;
    }

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        repoUrl,
        codeByLang,
        language,
      })
    );
  }, [draftKey, repoUrl, codeByLang, language]);

  // Language switch handler — preserves code per language
  const handleLanguageChange = (newLang) => {
    if (newLang === language) return;
    setLanguage(newLang);
  };

  const challengeQuery = useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      if (USE_MOCK) {
        const found = mockChallenges.find((c) => c._id === id);
        if (!found) throw new Error('Challenge not found');
        return found;
      }
      const res = await api.get(`/api/challenges/${id}`);
      return res.data.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ['my-submissions', id],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockSubmissions.filter((s) => s.challengeId._id === id);
      }
      const res = await api.get(`/api/submissions/my-submissions?challengeId=${id}&limit=8`);
      return res.data.data || [];
    },
  });

  const codeStats = useMemo(() => {
    const lines = codeSnippet ? codeSnippet.split('\n').length : 0;
    const characters = codeSnippet.length;
    return { lines, characters };
  }, [codeSnippet]);

  const handleInsertStarter = () => {
    const starter = starterByLanguage[language] || starterByLanguage.javascript;
    setCodeSnippet(starter);
  };

  const handleCopyCode = async () => {
    if (!codeSnippet.trim()) {
      toast.error('No code to copy yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(codeSnippet);
      toast.success('Code copied');
    } catch {
      toast.error('Unable to copy code');
    }
  };

  const handleClearDraft = () => {
    setRepoUrl('');
    setCodeByLang({});
    localStorage.removeItem(draftKey);
    toast.success('Draft cleared');
  };

  const handleSubmit = async () => {
    if (!repoUrl && !codeSnippet.trim()) {
      toast.error('Please provide code or a GitHub repository link.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/submissions', {
        challengeId: id,
        repositoryUrl: repoUrl.trim() || undefined,
        code: codeSnippet.trim() || undefined,
        language,
      });

      toast.success('Solution submitted successfully.');
      setRepoUrl('');
      setCodeByLang({});
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ['my-submissions', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    } catch (err) {
      toast.error(err.userMessage || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (challengeQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 6rem)' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (challengeQuery.isError || !challengeQuery.data) {
    return (
      <div className="macos-glass p-6">
        <h2 className="text-xl font-bold mb-3">Challenge Not Available</h2>
        <p className="text-secondary mb-4">{challengeQuery.error?.userMessage || 'Failed to load challenge details.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const challenge = challengeQuery.data;
  const difficultyColor =
    challenge.difficulty === 'Easy'
      ? 'text-green-400'
      : challenge.difficulty === 'Medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  const difficultyBg =
    challenge.difficulty === 'Easy'
      ? 'bg-green-500/15'
      : challenge.difficulty === 'Medium'
        ? 'bg-yellow-500/15'
        : 'bg-red-500/15';

  return (
    <div
      className="flex flex-col px-4 sm:px-6 lg:px-8"
      style={{
        height: 'calc(100vh - 6rem)',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-3 shrink-0">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-sm"
        >
          <FiChevronLeft size={16} />
          <span className="hidden sm:inline">Missions</span>
        </Link>
        <div className="w-px h-5 bg-white/10" />
        <h1 className="text-lg sm:text-xl font-bold truncate">{challenge.title}</h1>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${difficultyBg} ${difficultyColor}`}>
            {challenge.difficulty}
          </span>
          <span className="text-secondary text-sm hidden sm:inline">{challenge.points} XP</span>
          <span className="text-secondary text-xs hidden sm:inline">•</span>
          <span className="text-secondary text-sm hidden sm:inline">{challenge.category || 'General'}</span>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 w-full">
        {/* LEFT PANEL - Problem Details */}
        <div className="flex-1 flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
                leftTab === 'description'
                  ? 'text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
              onClick={() => setLeftTab('description')}
            >
              <FiFileText size={14} />
              Description
              {leftTab === 'description' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
                leftTab === 'submissions'
                  ? 'text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
              onClick={() => setLeftTab('submissions')}
            >
              <FiClock size={14} />
              Submissions
              {historyQuery.data?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent">
                  {historyQuery.data.length}
                </span>
              )}
              {leftTab === 'submissions' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === 'description' ? (
              <div className="space-y-4">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-primary/90">
                  {challenge.description}
                </div>

                {/* Challenge Meta Tags */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${difficultyBg} ${difficultyColor}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-secondary">
                    {challenge.category || 'General'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent">
                    {challenge.points} XP
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {historyQuery.isLoading ? (
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : historyQuery.data?.length ? (
                  historyQuery.data.map((sub) => (
                    <Link
                      key={sub._id}
                      to={`/submission/${sub._id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-white/8 hover:border-accent/50 transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              sub.status === 'Accepted'
                                ? 'bg-green-400'
                                : sub.status === 'Rejected'
                                  ? 'bg-red-400'
                                  : 'bg-yellow-400'
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              sub.status === 'Accepted'
                                ? 'text-green-400'
                                : sub.status === 'Rejected'
                                  ? 'text-red-400'
                                  : 'text-yellow-400'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-secondary text-xs">{new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-secondary bg-white/5 px-2 py-0.5 rounded-md">
                          {sub.language || 'javascript'}
                        </span>
                        <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FiCode size={32} className="text-secondary mb-3 opacity-40" />
                    <p className="text-secondary text-sm">No submissions yet.</p>
                    <p className="text-secondary text-xs mt-1">Submit your first solution on the right →</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Code Editor / Submission */}
        <div className="lg:w-1/2 flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <FiCode size={14} className="text-accent" />
              <span className="text-sm font-semibold">Code Editor</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1.5 text-primary focus:border-accent focus:outline-none"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          {/* Code Textarea */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            <textarea
              className="flex-1 w-full bg-transparent resize-none p-4 font-mono text-sm leading-relaxed text-primary/90 placeholder-white/20 focus:outline-none"
              placeholder="// Write your solution here..."
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              spellCheck={false}
              style={{ minHeight: '200px' }}
            />

            {/* Code Stats Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/8 text-[11px] text-secondary shrink-0">
              <span>{codeStats.lines} lines • {codeStats.characters} chars</span>
              <div className="flex gap-1">
                <button
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  onClick={handleInsertStarter}
                  title="Insert starter code"
                >
                  <FiRefreshCw size={12} />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  onClick={handleCopyCode}
                  title="Copy code"
                >
                  <FiClipboard size={12} />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-red-400/60 hover:text-red-400"
                  onClick={handleClearDraft}
                  title="Clear draft"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Submit Section */}
          <div className="px-4 py-3 border-t border-white/10 shrink-0 space-y-3">
            {/* GitHub URL Input */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex-1 focus-within:border-accent transition-colors">
                <FiGithub size={14} className="text-secondary shrink-0" />
                <input
                  type="text"
                  placeholder="GitHub repository URL (optional)"
                  className="bg-transparent text-sm text-primary placeholder-white/25 focus:outline-none w-full"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FiSend size={14} />
              {submitting ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetails;
