import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiUserPlus, FiTrash2, FiSearch, FiShield, FiUser, FiX } from 'react-icons/fi';
import { clsx } from 'clsx';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { api } from '../lib/api';
import { USE_MOCK, mockChallenges, filterSubmissions, mockUsers } from '../lib/mockData';

const defaultClanForm = { name: '', tag: '', description: '' };

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

  // --- Clan state ---
  const [clanForm, setClanForm] = useState(defaultClanForm);
  const [editingClan, setEditingClan] = useState(null);
  const [deleteClanTarget, setDeleteClanTarget] = useState(null);
  const [clanSearch, setClanSearch] = useState('');

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
      try {
        const res = await api.get('/api/challenges?page=1&limit=100&sortBy=createdAt&sortDir=desc');
        const data = res.data.data || [];
        return data.length > 0 ? data : mockChallenges;
      } catch {
        return mockChallenges;
      }
    },
  });

  const mockAdminClans = [
    {
      _id: 'clan_01', name: 'Alpha Coders', tag: 'AC', description: 'The elite squad of algorithm masters.',
      chief: { _id: 'u_001', username: 'Nirakar' },
      members: [
        { _id: 'u_001', username: 'Nirakar' },
        { _id: 'u_002', username: 'Ashutosh' },
        { _id: 'u_004', username: 'Priyanka' },
        { _id: 'u_006', username: 'recursionKing' },
      ],
    },
    {
      _id: 'clan_02', name: 'Byte Knights', tag: 'BK', description: 'Honour. Code. Conquer.',
      chief: { _id: 'u_003', username: 'binaryBoss' },
      members: [
        { _id: 'u_003', username: 'binaryBoss' },
        { _id: 'u_005', username: 'stackOverflow_fan' },
        { _id: 'u_007', username: 'dpWizard' },
      ],
    },
    {
      _id: 'clan_03', name: 'Stack Overlords', tag: 'SO', description: 'We overflow — with solutions.',
      chief: { _id: 'u_008', username: 'Soumya' },
      members: [
        { _id: 'u_008', username: 'Soumya' },
        { _id: 'u_009', username: 'bitManipulator' },
        { _id: 'u_010', username: 'heapHero' },
      ],
    },
  ];

  const clansQuery = useQuery({
    queryKey: ['admin-clans'],
    enabled: activeTab === 'clans',
    queryFn: async () => {
      try {
        const res = await api.get('/api/clans');
        const data = res.data.data || [];
        return data.length > 0 ? data : mockAdminClans;
      } catch {
        return mockAdminClans;
      }
    },
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    enabled: activeTab === 'permissions',
    queryFn: async () => {
      try {
        const res = await api.get('/api/users');
        const data = res.data.data || [];
        return data.length > 0 ? data : mockUsers;
      } catch {
        return mockUsers;
      }
    },
  });

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

  // --- Clan handlers ---
  const onCreateClan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/clans', clanForm);
      toast.success('Clan created');
      setClanForm(defaultClanForm);
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create clan');
    }
  };

  const onUpdateClan = async () => {
    if (!editingClan) return;
    try {
      await api.put(`/api/clans/${editingClan._id}`, {
        name: editingClan.name,
        tag: editingClan.tag,
        description: editingClan.description,
        chiefId: editingClan.chief?._id || editingClan.chief, // Handle both object and ID
      });
      toast.success('Clan updated');
      setEditingClan(null);
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update clan');
    }
  };

  const onDeleteClan = async () => {
    if (!deleteClanTarget) return;
    try {
      await api.delete(`/api/clans/${deleteClanTarget._id}`);
      toast.success('Clan deleted');
      setDeleteClanTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete clan');
    }
  };

  const onAssignChief = async (clanId, userId) => {
    try {
      await api.put(`/api/clans/${clanId}/chief`, { userId });
      toast.success('Chief assigned');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign chief');
    }
  };

  const onRemoveMember = async (clanId, userId) => {
    try {
      await api.delete(`/api/clans/${clanId}/members/${userId}`);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['admin-clans'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const onUpdateUserRole = async (userId, newRole) => {
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole });
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
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
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'permissions' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('permissions')}>
          Permissions
        </button>
        <button className={`px-4 py-2 rounded-lg ${activeTab === 'clans' ? 'bg-accent text-white' : ''}`} onClick={() => setActiveTab('clans')}>
          Manage Clans
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

      {activeTab === 'clans' && (
        <div className="space-y-6">
          <Card>
            <form onSubmit={onCreateClan} className="space-y-4 max-w-2xl">
              <h2 className="text-section-title font-bold">Create Clan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Clan Name</label>
                  <input className="field-input" value={clanForm.name} onChange={(e) => setClanForm((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label">Tag (2-5 chars)</label>
                  <input className="field-input" value={clanForm.tag} maxLength={5} onChange={(e) => setClanForm((p) => ({ ...p, tag: e.target.value.toUpperCase() }))} required />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input className="field-input" value={clanForm.description} onChange={(e) => setClanForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <button className="btn-primary" type="submit">Create Clan</button>
            </form>
          </Card>

          <Card>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-section-title font-bold">Manage Clans</h2>
              <div className="relative w-full md:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  className="field-input pl-10 py-2"
                  placeholder="Search clans or tags..."
                  value={clanSearch}
                  onChange={(e) => setClanSearch(e.target.value)}
                />
              </div>
            </div>

            {clansQuery.isLoading ? (
              <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
            ) : (clansQuery.data || []).filter(c => 
              c.name.toLowerCase().includes(clanSearch.toLowerCase()) || 
              c.tag.toLowerCase().includes(clanSearch.toLowerCase())
            ).length === 0 ? (
              <EmptyState title="No clans found" description={clanSearch ? "No clans match your search." : "Create your first clan above."} />
            ) : (
              <div className="space-y-4">
                {(clansQuery.data || []).filter(c => 
                  c.name.toLowerCase().includes(clanSearch.toLowerCase()) || 
                  c.tag.toLowerCase().includes(clanSearch.toLowerCase())
                ).map((clan) => (
                  <div key={clan._id} className="border border-glass-border rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap gap-3 justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{clan.name} <span className="text-accent text-sm font-mono">[{clan.tag}]</span></h3>
                        <p className="text-secondary text-sm">{clan.description || 'No description'}</p>
                        <p className="text-xs text-tertiary mt-1">Chief: {clan.chief?.username || 'None'} · {clan.members?.length || 0} members</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => setEditingClan({ ...clan })}>Edit</button>
                        <button className="btn-secondary" onClick={() => setDeleteClanTarget(clan)}>Delete</button>
                      </div>
                    </div>
                    {clan.members && clan.members.length > 0 && (
                      <div className="border-t border-glass-border/40 pt-3">
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Roster</p>
                        <div className="flex flex-wrap gap-2">
                          {clan.members.map((member) => (
                            <div key={member._id} className="flex items-center gap-2 bg-glass-surface px-3 py-1.5 rounded-lg text-sm border border-glass-border/30">
                              <span className="font-medium">{member.username}</span>
                              {clan.chief?._id === member._id && (
                                <span className="text-[10px] bg-accent/20 text-accent px-1.5 rounded font-bold">CHIEF</span>
                              )}
                              <button className="text-[10px] text-red-400 hover:text-red-500 transition-colors ml-1" onClick={() => onRemoveMember(clan._id, member._id)} title="Remove member">×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'permissions' && (
        <Card>
          <div className="space-y-6">
            <h2 className="text-section-title font-bold mb-4">Manage Permissions</h2>
            {usersQuery.isLoading ? (
              <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
            ) : (usersQuery.data || []).length === 0 ? (
              <EmptyState title="No users found" description="There are no users registered." />
            ) : (
              <div className="space-y-4">
                {(usersQuery.data || []).map((user) => (
                  <div key={user._id} className="border border-glass-border rounded-xl p-4 flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <FiUser size={18} className="text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">{user.username}</h3>
                        <p className="text-secondary text-xs">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        className="field-select text-sm py-2 min-w-[140px]"
                        value={user.role}
                        onChange={(e) => onUpdateUserRole(user._id, e.target.value)}
                      >
                        <option value="user">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        <option value="super-admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      <ConfirmDialog
        open={Boolean(deleteClanTarget)}
        title="Delete clan"
        description={`This will permanently remove clan "${deleteClanTarget?.name || ''}". All members will be unassigned.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteClanTarget(null)}
        onConfirm={onDeleteClan}
      />

      {editingChallenge && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="macos-glass w-full max-w-3xl p-6 space-y-4">
            <h3 className="text-section-title font-bold">Edit Challenge</h3>
            <div>
              <label className="field-label">Title</label>
              <input className="field-input" value={editingChallenge.title} onChange={(e) => setEditingChallenge((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea className="field-textarea" value={editingChallenge.description} onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))} />
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
              <select className="field-select" value={editingChallenge.difficulty} onChange={(e) => setEditingChallenge((p) => ({ ...p, difficulty: e.target.value }))}>
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
              <input className="field-input" type="number" value={editingChallenge.points} onChange={(e) => setEditingChallenge((p) => ({ ...p, points: Number(e.target.value) }))} />
              <input className="field-input" value={editingChallenge.category} onChange={(e) => setEditingChallenge((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditingChallenge(null)}>Cancel</button>
              <button className="btn-primary" onClick={onUpdateChallenge}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {editingClan && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="macos-glass w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-glass-border/30 flex justify-between items-center bg-accent/5">
              <h3 className="text-xl font-bold">Edit Clan Details</h3>
              <button onClick={() => setEditingClan(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="field-label text-xs uppercase tracking-wider opacity-70">Clan Name</label>
                  <input 
                    className="field-input bg-white/5 border-glass-border/40 focus:border-accent/50" 
                    value={editingClan.name} 
                    onChange={(e) => setEditingClan((p) => ({ ...p, name: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="field-label text-xs uppercase tracking-wider opacity-70">Tag (Identifier)</label>
                  <input 
                    className="field-input bg-white/5 border-glass-border/40 focus:border-accent/50 font-mono" 
                    value={editingClan.tag} 
                    maxLength={5} 
                    onChange={(e) => setEditingClan((p) => ({ ...p, tag: e.target.value.toUpperCase() }))} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label text-xs uppercase tracking-wider opacity-70">Description</label>
                <textarea 
                  className="field-textarea bg-white/5 border-glass-border/40 focus:border-accent/50 h-24" 
                  value={editingClan.description || ''} 
                  onChange={(e) => setEditingClan((p) => ({ ...p, description: e.target.value }))} 
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-glass-border/20">
                <label className="field-label text-xs uppercase tracking-wider opacity-70 flex items-center gap-2">
                  <FiShield className="text-accent" /> Assign Clan Chief
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editingClan.members?.map((member) => (
                    <button
                      key={member._id}
                      onClick={() => setEditingClan(p => ({ ...p, chief: member }))}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-sm",
                        (editingClan.chief?._id === member._id || editingClan.chief === member._id)
                          ? "bg-accent/10 border-accent/50 text-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]"
                          : "bg-white/5 border-glass-border/30 hover:border-glass-border text-secondary"
                      )}
                    >
                      <span className="font-medium">{member.username}</span>
                      {(editingClan.chief?._id === member._id || editingClan.chief === member._id) && (
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      )}
                    </button>
                  ))}
                  {(!editingClan.members || editingClan.members.length === 0) && (
                    <p className="text-xs text-tertiary italic col-span-2 py-2">No members available to promote.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-glass-border/30 bg-black/10 flex justify-end gap-3">
              <button 
                className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-glass-border hover:bg-white/5 transition-all" 
                onClick={() => setEditingClan(null)}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 shadow-lg shadow-accent/20 transition-all active:scale-95" 
                onClick={onUpdateClan}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AdminPanel;

