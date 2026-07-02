import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FiChevronLeft,
  FiCode,
  FiMessageSquare,
  FiUser,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiGithub,
} from 'react-icons/fi';

import CodeEditor from '../components/CodeEditor';

import SkeletonCard from '../components/SkeletonCard';
import Card from '../components/Card';
import { api } from '../lib/api';

const StatusBadge = ({ status }) => {
  const colorClass =
    status === 'Accepted'
      ? 'bg-green-500/15 text-green-400'
      : status === 'Rejected'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-yellow-500/15 text-yellow-400';

  const Icon = status === 'Accepted' ? FiCheckCircle : status === 'Rejected' ? FiXCircle : FiClock;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

const SubmissionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark',
  );

  useEffect(() => {
    const checkDark = () =>
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const submissionQuery = useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      const res = await api.get(`/api/submissions/${id}`);
      return res.data.data;
    },
  });


  if (submissionQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-8">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (submissionQuery.isError || !submissionQuery.data) {
    const errorData = submissionQuery.error?.response?.data || {};
    const message = errorData.message || submissionQuery.error?.userMessage || 'Unable to fetch submission details.';
    const challengeId = errorData.challengeId;

    return (
      <Card>
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-2">
                <FiXCircle className="text-red-500" size={32} />
            </div>
            <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
            <p className="text-secondary max-w-md">
                {message === 'Limited to Clan Chief' ? 
                    'Limited to Clan Chief. Solve the challenge yourself first to unlock and view other users\' solutions!' 
                    : message}
            </p>
            
            <div className="flex items-center gap-4 mt-6">
                <button className="btn-secondary" onClick={() => navigate(-1)}>
                    Go Back
                </button>
                {message === 'Limited to Clan Chief' && challengeId && (
                    <button className="btn-primary" onClick={() => navigate(`/challenge/${challengeId}`)}>
                        Solve Challenge to Unlock
                    </button>
                )}
            </div>
        </div>
      </Card>
    );
  }

  const submission = submissionQuery.data;
  const hasReviewComment = submission.feedback && submission.status === 'Rejected';

  return (
    <div
      className="flex flex-col w-full"
      style={{
        height: 'calc(100vh - 8rem)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10 mb-3 shrink-0 px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-sm"
        >
          <FiChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="w-px h-5 bg-black/10 dark:bg-white/10" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            {submission.challengeId?.title || 'Submission'}
          </h1>
          <p className="text-xs text-secondary">
            Submitted {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={submission.status} />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 pb-4">
        {/* LEFT PANEL — Code Viewer */}
        <div className="flex-1 flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <FiCode className="text-accent" />
              <span className="text-sm font-semibold">Submitted Code</span>
            </div>
            <span className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[10px] font-bold text-secondary uppercase">
              {submission.language || 'javascript'}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {submission.code ? (
              <CodeEditor
                value={submission.code}
                language={submission.language || 'javascript'}
                isDark={isDark}
                readOnly
              />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary text-sm">
                No inline code was provided for this submission.
              </div>
            )}
          </div>

          {/* Meta bar */}
          <div className="px-4 py-2.5 border-t border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-secondary">
              <div className="flex items-center gap-4">
                <span>{submission.code ? submission.code.split('\n').length : 0} lines</span>
                <span>{submission.code?.length || 0} chars</span>
              </div>
              <div className="flex items-center gap-3">
                {submission.challengeId?.difficulty && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    submission.challengeId.difficulty === 'Easy' ? 'bg-green-500/15 text-green-400' :
                    submission.challengeId.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {submission.challengeId.difficulty}
                  </span>
                )}
                {submission.challengeId?.points != null && (
                  <span className="font-semibold">{submission.challengeId.points} XP</span>
                )}
              </div>
            </div>
          </div>

          {/* Repo link if present */}
          {submission.repositoryUrl && (
            <div className="px-4 py-2.5 border-t border-black/10 dark:border-white/10 shrink-0">
              <a
                href={submission.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent text-sm font-medium hover:underline"
              >
                <FiGithub size={14} />
                View Repository
                <FiExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Review & Info */}
        <div className="lg:w-[380px] xl:w-[420px] flex flex-col min-h-0 gap-3">
          {/* Reviewer Feedback Card — Rejected only */}
          {hasReviewComment && (
            <div className="macos-glass rounded-xl overflow-hidden border border-red-500/20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-red-500/10 bg-red-500/5">
                <FiMessageSquare className="text-red-400" size={14} />
                <span className="text-sm font-bold text-red-400">Reviewer Feedback</span>
              </div>
              <div className="p-4 space-y-3">
                {submission.reviewedBy && (
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-accent font-bold text-[10px]">
                      <FiUser size={10} />
                    </div>
                    <span className="font-semibold text-primary">
                      {submission.reviewedBy.username || 'Reviewer'}
                    </span>
                    <span className="text-secondary">•</span>
                    <span>
                      {submission.reviewedAt
                        ? new Date(submission.reviewedAt).toLocaleString()
                        : 'Date unknown'}
                    </span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-sm text-primary leading-relaxed whitespace-pre-wrap">
                  {submission.feedback}
                </div>
              </div>
            </div>
          )}

          {/* User Feedback Card (Submit Anyway) */}
          {submission.userFeedback && (
            <div className="macos-glass rounded-xl overflow-hidden border border-accent/20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-accent/10 bg-accent/5">
                <FiMessageSquare className="text-accent" size={14} />
                <span className="text-sm font-bold text-accent">User Feedback (Submitted Anyway)</span>
              </div>
              <div className="p-4">
                <div className="p-3 rounded-xl bg-accent/5 border border-accent/10 text-sm text-primary leading-relaxed whitespace-pre-wrap">
                  {submission.userFeedback}
                </div>
              </div>
            </div>
          )}

          {/* Status State Cards */}
          {submission.status === 'Pending' && (
            <div className="macos-glass rounded-xl p-6 border border-yellow-500/20 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <FiClock className="text-yellow-500" size={24} />
              </div>
              <h3 className="text-lg font-bold">Awaiting Review</h3>
              <p className="text-sm text-secondary">
                Your submission is in the queue. A reviewer will evaluate your code soon.
              </p>
            </div>
          )}

          {submission.status === 'Accepted' && (
            <div className="macos-glass rounded-xl p-6 border border-green-500/20 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                <FiCheckCircle className="text-green-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-green-400">Accepted!</h3>
              <p className="text-sm text-secondary">
                Great work! Your solution has been accepted.
                {submission.challengeId?.points ? ` You earned ${submission.challengeId.points} XP.` : ''}
              </p>
              {submission.reviewedBy && (
                <p className="text-xs text-secondary">
                  Reviewed by <span className="font-semibold text-primary">{submission.reviewedBy.username}</span>
                  {submission.reviewedAt && ` on ${new Date(submission.reviewedAt).toLocaleDateString()}`}
                </p>
              )}
            </div>
          )}

          {submission.status === 'Rejected' && !hasReviewComment && (
            <div className="macos-glass rounded-xl p-6 border border-red-500/20 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
                <FiXCircle className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-red-400">Rejected</h3>
              <p className="text-sm text-secondary">
                Your submission was not accepted. Try again with a different approach.
              </p>
            </div>
          )}

          {/* Challenge Info */}
          <div className="macos-glass rounded-xl overflow-hidden flex-1 min-h-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-black/10 dark:border-white/10">
              <FiCode className="text-accent" size={14} />
              <span className="text-sm font-semibold">Challenge Info</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">Language</p>
                  <p className="text-sm font-bold">{submission.language || 'javascript'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">Difficulty</p>
                  <p className="text-sm font-bold">{submission.challengeId?.difficulty || '-'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                  <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">Points</p>
                  <p className="text-sm font-bold">{submission.challengeId?.points ?? '-'}</p>
                </div>
              </div>
              <Link
                to={`/challenge/${submission.challengeId?._id || ''}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-accent bg-accent/5 border border-black/20 dark:border-white/20 hover:bg-accent/10 transition-colors"
              >
                View Challenge <FiExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Retry button — Rejected submissions only */}
          {submission.status === 'Rejected' && submission.challengeId?._id && (
            <Link
              to={`/challenge/${submission.challengeId._id}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
            >
              <FiRefreshCw size={14} />
              Retry Challenge
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetails;
