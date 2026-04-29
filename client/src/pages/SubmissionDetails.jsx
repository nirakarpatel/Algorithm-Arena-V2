import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../lib/api';
import { USE_MOCK, mockSubmissions } from '../lib/mockData';

const StatusBadge = ({ status }) => {
  const colorClass =
    status === 'Accepted'
      ? 'bg-green-500/20 text-green-400'
      : status === 'Rejected'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-yellow-500/20 text-yellow-400';

  return <span className={`px-3 py-1 mt-8 rounded-full text-xs font-bold ${colorClass}`}>{status}</span>;
};

const SubmissionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const submissionQuery = useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      if (USE_MOCK) {
        const found = mockSubmissions.find((s) => s._id === id);
        if (!found) throw new Error('Submission not found');
        return found;
      }
      const res = await api.get(`/api/submissions/${id}`);
      return res.data.data;
    },
  });

  if (submissionQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (submissionQuery.isError || !submissionQuery.data) {
    return (
      <Card>
        <h1 className="text-section-title font-bold mb-3">Submission Not Available</h1>
        <p className="text-secondary mb-4">{submissionQuery.error?.userMessage || 'Unable to fetch submission details.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/profile')}>
          Back to Profile
        </button>
      </Card>
    );
  }

  const submission = submissionQuery.data;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div>
            <h1 className="text-page-title font-bold">{submission.challengeId?.title || 'Submission'}</h1>
            <p className="text-secondary text-sm mt-1">Submitted {new Date(submission.submittedAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="macos-glass p-3">
            <p className="text-secondary">Language</p>
            <p className="font-semibold mt-1">{submission.language || 'javascript'}</p>
          </div>
          <div className="macos-glass p-3">
            <p className="text-secondary">Difficulty</p>
            <p className="font-semibold mt-1">{submission.challengeId?.difficulty || '-'}</p>
          </div>
          <div className="macos-glass p-3">
            <p className="text-secondary">Points</p>
            <p className="font-semibold mt-1">{submission.challengeId?.points ?? '-'}</p>
          </div>
        </div>

        {submission.repositoryUrl && (
          <div className="mt-4">
            <a href={submission.repositoryUrl} target="_blank" rel="noreferrer" className="text-accent underline font-medium">
              Open Repository
            </a>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-section-title font-bold">Submitted Code</h2>
          <Link to={`/challenge/${submission.challengeId?._id || ''}`} className="text-accent text-sm underline">
            View Challenge
          </Link>
        </div>
        {submission.code ? (
          <pre className="w-full overflow-auto rounded-xl border border-glass-border bg-black/40 p-4 text-sm text-white">
            <code>{submission.code}</code>
          </pre>
        ) : (
          <p className="text-secondary">No inline code was provided for this submission.</p>
        )}
      </Card>
    </div>
  );
};

export default SubmissionDetails;
