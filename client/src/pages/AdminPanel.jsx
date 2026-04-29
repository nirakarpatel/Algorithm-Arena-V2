import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiUserPlus, FiTrash2, FiSearch, FiShield, FiUser } from 'react-icons/fi';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { api } from '../lib/api';
import { USE_MOCK, mockChallenges, mockClanMembers, filterSubmissions } from '../lib/mockData';

const defaultChallengeForm = {
  title: '',
  description: '',
  link: '',
  difficulty: 'Easy',
  points: 100,
  category: 'Logic',
};

const AdminPanel = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  const [createForm, setCreateForm] = useState(defaultChallengeForm);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Members tab state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  const [reviewFilters, setReviewFilters] = useState({
    page: 1,
    limit: 10,
    status: 'Pending',
    userId: '',
    challengeId: '',
    from: '',
    to: '',
  });

  const submissionsQuery = useQuery({
    queryKey: ['admin-submissions', reviewFilters],
    enabled: activeTab === 'review',
    queryFn: async () => {
      if (USE_MOCK) return filterSubmissions(reviewFilters);
      const params = new URLSearchParams();

      params.set('page', String(reviewFilters.page));
      params.set('limit', String(reviewFilters.limit));
      if (reviewFilters.status) params.set('status', reviewFilters.status);
      if (reviewFilters.challengeId) params.set('challengeId', reviewFilters.challengeId);
      if (reviewFilters.userId.length === 24) params.set('userId', reviewFilters.userId);
      if (reviewFilters.from) params.set('from', new Date(`${reviewFilters.from}T00:00:00.000Z`).toISOString());
      if (reviewFilters.to) params.set('to', new Date(`${reviewFilters.to}T23:59:59.999Z`).toISOString());

      const res = await api.get(`/api/submissions?${params.toString()}`);
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const challengesQuery = useQuery({
    queryKey: ['admin-challenges'],
    enabled: activeTab === 'manage' || activeTab === 'review',
    queryFn: async () => {
      if (USE_MOCK) return mockChallenges;
      const res = await api.get('/api/challenges?page=1&limit=100&sortBy=createdAt&sortDir=desc');
      return res.data.data || [];
    },
  });

  // Members query
  const membersQuery = useQuery({
    queryKey: ['clan-members'],
    enabled: activeTab === 'members',
    queryFn: async () => {
      if (USE_MOCK) return mockClanMembers;
      const res = await api.get('/api/clan/members');
      return res.data.data || [];
    },
  });

  const handleAddMember = async () => {
    if (!memberSearch.trim()) {
      toast.error('Please enter a username or email');
      return;
    }
    setAddingMember(true);
    try {
      await api.post('/api/clan/members', {
        identifier: memberSearch.trim(),
        role: memberRole,
      });
      toast.success('Member added successfully');
      setMemberSearch('');
      setMemberRole('member');
      queryClient.invalidateQueries({ queryKey: ['clan-members'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await api.delete(`/api/clan/members/${memberId}`);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['clan-members'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await api.put(`/api/clan/members/${memberId}`, { role: newRole });
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['clan-members'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update role');
    }
  };

  const onCreateChallenge = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/challenges', createForm);
      toast.success('Challenge created');
      setCreateForm(defaultChallengeForm);
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to create challenge');
    }
  };

  const onUpdateChallenge = async () => {
    if (!editingChallenge) return;
    try {
      await api.put(`/api/challenges/${editingChallenge._id}`, {
        title: editingChallenge.title,
        description: editingChallenge.description,
        link: editingChallenge.link || '',
        difficulty: editingChallenge.difficulty,
        points: Number(editingChallenge.points),
        category: editingChallenge.category,
      });
      toast.success('Challenge updated');
      setEditingChallenge(null);
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update challenge');
    }
  };

  const onDeleteChallenge = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/challenges/${deleteTarget._id}`);
      toast.success('Challenge deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete challenge');
    }
  };

  const onGrade = async (id, status) => {
    try {
      await api.put(`/api/submissions/${id}`, { status });
      toast.success(`Submission marked ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (err) {
      toast.error(err.userMessage || 'Failed to grade submission');
    }
  };

  const submissions = submissionsQuery.data?.data || [];
  const reviewMeta = submissionsQuery.data?.meta || {};

  const reviewQueryLabel = useMemo(() => {
    if (reviewFilters.status === 'Pending') return 'Pending Reviews';
    if (reviewFilters.status === 'Accepted') return 'Accepted';
    if (reviewFilters.status === 'Rejected') return 'Rejected';
    return 'All';
  }, [reviewFilters.status]);

  return (
    <div className="space-y-6">
      <h1 className="text-page-title font-extrabold">Creator Studio</h1>

      <div className="macos-glass p-2 inline-flex gap-2">
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'create' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('create')}>
          New Challenge
        </button>
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'review' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('review')}>
          Review Work
        </button>
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'manage' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('manage')}>
          Manage Challenges
        </button>
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'members' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('members')}>
          Members
        </button>
      </div>

      {activeTab === 'create' && (
        <Card>
          <form onSubmit={onCreateChallenge} className="space-y-4 max-w-2xl">
            <h2 className="text-section-title font-bold">Create Challenge</h2>
            <div>
              <label className="field-label">Title</label>
              <input className="field-input" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                className="field-textarea"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label">Original Question Link</label>
              <input
                className="field-input"
                type="url"
                placeholder="https://leetcode.com/problems/..."
                value={createForm.link}
                onChange={(e) => setCreateForm((p) => ({ ...p, link: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="field-label">Difficulty</label>
                <select
                  className="field-select"
                  value={createForm.difficulty}
                  onChange={(e) => setCreateForm((p) => ({ ...p, difficulty: e.target.value }))}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="field-label">Points</label>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  value={createForm.points}
                  onChange={(e) => setCreateForm((p) => ({ ...p, points: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="field-label">Category</label>
                <input className="field-input" value={createForm.category} onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <button className="btn-primary" type="submit">
              Publish Challenge
            </button>
          </form>
        </Card>
      )}

      {activeTab === 'review' && (
        <Card>
          <div className="space-y-4">
            <h2 className="text-section-title font-bold">{reviewQueryLabel}</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <select
                className="field-select"
                value={reviewFilters.status}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, status: e.target.value }))}
              >
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                className="field-select"
                value={reviewFilters.challengeId}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, challengeId: e.target.value }))}
              >
                <option value="">All Challenges</option>
                {(challengesQuery.data || []).map((challenge) => (
                  <option key={challenge._id} value={challenge._id}>
                    {challenge.title}
                  </option>
                ))}
              </select>
              <input
                className="field-input"
                placeholder="User ID (24 chars)"
                value={reviewFilters.userId}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, userId: e.target.value.trim() }))}
              />
              <input
                className="field-input"
                type="date"
                value={reviewFilters.from}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, from: e.target.value }))}
                aria-label="From date"
              />
              <input
                className="field-input"
                type="date"
                value={reviewFilters.to}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, to: e.target.value }))}
                aria-label="To date"
              />
              <select
                className="field-select"
                value={reviewFilters.limit}
                onChange={(e) => setReviewFilters((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
              >
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
              </select>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState title="No submissions" description="No submissions match your filters." />
            ) : (
              <>
                <div className="hidden md:block overflow-auto">
                  <table className="responsive-table">
                    <thead>
                      <tr className="text-left border-b border-glass-border text-secondary text-sm">
                        <th className="py-3">Student</th>
                        <th className="py-3">Challenge</th>
                        <th className="py-3">Language</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub._id} className="border-b border-glass-border/60">
                          <td className="py-3">{sub.userId?.username || 'Unknown'}</td>
                          <td className="py-3">{sub.challengeId?.title || 'Unknown'}</td>
                          <td className="py-3">{sub.language || '-'}</td>
                          <td className="py-3">{sub.status}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button className="btn-secondary" onClick={() => onGrade(sub._id, 'Accepted')}>
                                Accept
                              </button>
                              <button className="btn-secondary" onClick={() => onGrade(sub._id, 'Rejected')}>
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {submissions.map((sub) => (
                    <div key={sub._id} className="border border-glass-border rounded-xl p-4 space-y-3">
                      <div>
                        <p className="font-semibold">{sub.userId?.username || 'Unknown'}</p>
                        <p className="text-secondary text-sm">{sub.challengeId?.title || 'Unknown challenge'}</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{sub.language || '-'}</span>
                        <span>{sub.status}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => onGrade(sub._id, 'Accepted')}>
                          Accept
                        </button>
                        <button className="btn-secondary" onClick={() => onGrade(sub._id, 'Rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">
                    Page {reviewMeta.page || 1} of {reviewMeta.totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={(reviewMeta.page || 1) <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setReviewFilters((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={(reviewMeta.page || 1) >= (reviewMeta.totalPages || 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'manage' && (
        <Card>
          <h2 className="text-section-title font-bold mb-4">Manage Challenges</h2>

          {challengesQuery.isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (challengesQuery.data || []).length === 0 ? (
            <EmptyState title="No challenges yet" description="Create your first challenge from the New Challenge tab." />
          ) : (
            <div className="space-y-3">
              {(challengesQuery.data || []).map((challenge) => (
                <div key={challenge._id} className="border border-glass-border rounded-xl p-4 flex flex-wrap gap-3 justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{challenge.title}</h3>
                    <p className="text-secondary text-sm">{challenge.difficulty} - {challenge.points} XP - {challenge.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => setEditingChallenge({ ...challenge })}>
                      Edit
                    </button>
                    <button className="btn-secondary" onClick={() => setDeleteTarget(challenge)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete challenge"
        description={`This will permanently remove "${deleteTarget?.title || ''}".`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDeleteChallenge}
      />

      {editingChallenge && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="macos-glass w-full max-w-3xl p-6 space-y-4">
            <h3 className="text-section-title font-bold">Edit Challenge</h3>
            <div>
              <label className="field-label">Title</label>
              <input
                className="field-input"
                value={editingChallenge.title}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                className="field-textarea"
                value={editingChallenge.description}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Original Question Link</label>
              <input
                className="field-input"
                type="url"
                placeholder="https://leetcode.com/problems/..."
                value={editingChallenge.link || ''}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, link: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="field-select"
                value={editingChallenge.difficulty}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, difficulty: e.target.value }))}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <input
                className="field-input"
                type="number"
                value={editingChallenge.points}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, points: Number(e.target.value) }))}
              />
              <input
                className="field-input"
                value={editingChallenge.category}
                onChange={(e) => setEditingChallenge((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditingChallenge(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={onUpdateChallenge}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <Card>
          <div className="space-y-6">
            <h2 className="text-section-title font-bold">Clan Members</h2>

            {/* Add Member Section */}
            <div className="border border-glass-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FiUserPlus size={16} className="text-accent" />
                Add New Member
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    className="field-input pl-9"
                    placeholder="Username or email"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <select
                  className="field-select sm:w-40"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  className="btn-primary flex items-center justify-center gap-2 sm:w-auto"
                  onClick={handleAddMember}
                  disabled={addingMember}
                >
                  <FiUserPlus size={14} />
                  {addingMember ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Members List */}
            {membersQuery.isLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : !membersQuery.data?.length ? (
              <EmptyState
                title="No members yet"
                description="Add members to your clan using the form above."
              />
            ) : (
              <div className="space-y-2">
                {membersQuery.data.map((member) => (
                  <div
                    key={member._id}
                    className="border border-glass-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
                        {member.role === 'admin' ? (
                          <FiShield size={16} className="text-accent" />
                        ) : (
                          <FiUser size={16} className="text-secondary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{member.username || member.email}</p>
                        <p className="text-secondary text-xs">{member.email || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1.5 text-primary focus:border-accent focus:outline-none"
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member._id, e.target.value)}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                        onClick={() => handleRemoveMember(member._id)}
                        title="Remove member"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPanel;

