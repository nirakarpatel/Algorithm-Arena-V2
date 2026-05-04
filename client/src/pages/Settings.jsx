import React, { useState, useEffect } from 'react';
import { FiUser, FiMapPin, FiGithub, FiTwitter, FiGlobe, FiSave, FiCpu, FiBookOpen, FiLayers, FiGrid, FiAward, FiCalendar, FiLink, FiZap } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    bio: user?.bio || '',
    branch: user?.branch || '',
    year: user?.year || '',
    section: user?.section || '',
    location: user?.location || '',
    github: user?.github || '',
    twitter: user?.twitter || '',
    website: user?.website || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        branch: user.branch || '',
        year: user.year || '',
        section: user.section || '',
        location: user.location || '',
        github: user.github || '',
        twitter: user.twitter || '',
        website: user.website || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.put('/api/auth/update-me', formData);
      updateUser(res.data.data);
      toast.success('Profile card updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Preview data merging current user stats with form data
  const previewData = {
    ...user,
    ...formData
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <PageHeader 
        title="Rewrite Profile Card" 
        subtitle="Craft your digital identity in the arena. Changes update in real-time below."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-glass-border">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <FiUser size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Card Essentials</h3>
                <p className="text-xs text-secondary">Basic information shown on your primary card</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="field-label flex items-center gap-2">
                  <FiBookOpen className="text-accent" size={14} /> Profile Bio / Headline
                </label>
                <input
                  name="bio"
                  className="field-input"
                  placeholder="e.g. Expert Algorithmist"
                  value={formData.bio}
                  onChange={handleChange}
                />
                <p className="text-[10px] text-tertiary">A short, punchy description of your coding persona</p>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiCpu className="text-accent" size={14} /> Branch / Course
                </label>
                <input
                  name="branch"
                  className="field-input"
                  placeholder="e.g. B.Tech CSE"
                  value={formData.branch}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiGrid className="text-accent" size={14} /> Section / Group
                </label>
                <input
                  name="section"
                  className="field-input"
                  placeholder="e.g. Section A"
                  value={formData.section}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiLayers className="text-accent" size={14} /> Year of Study
                </label>
                <select
                  name="year"
                  className="field-select"
                  value={formData.year}
                  onChange={handleChange}
                >
                  <option value="">Select Year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiMapPin className="text-accent" size={14} /> Location
                </label>
                <input
                  name="location"
                  className="field-input"
                  placeholder="e.g. Bhubaneswar, India"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-glass-border">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <FiGlobe size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Social Presence</h3>
                <p className="text-xs text-secondary">Connect your external developer profiles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiGithub className="text-primary" size={14} /> GitHub Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-xs">github.com/</span>
                  <input
                    name="github"
                    className="field-input pl-[85px]"
                    placeholder="username"
                    value={formData.github}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2">
                  <FiTwitter className="text-blue-400" size={14} /> Twitter Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-xs">@</span>
                  <input
                    name="twitter"
                    className="field-input pl-8"
                    placeholder="username"
                    value={formData.twitter}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="field-label flex items-center gap-2">
                  <FiLink className="text-green-400" size={14} /> Personal Website
                </label>
                <input
                  name="website"
                  className="field-input"
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary px-8"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary px-10 flex items-center gap-2 shadow-accent-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSave />
              )}
              Update Profile Card
            </button>
          </div>
        </form>

        {/* Preview Section */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent">Live Card Preview</h3>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>
          
          <Card className="pt-8 text-center relative overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent border-white/10 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
            
            <div className="mb-6 inline-block">
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-accent to-purple-600 p-0.5 shadow-xl shadow-accent/20">
                {previewData.profilePicture ? (
                  <img src={previewData.profilePicture} alt="Profile" className="h-full w-full rounded-[14px] object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#1a1a1c] text-4xl font-black uppercase text-white">
                    {previewData.username?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 border-bg-app bg-green-500 shadow-lg" />
            </div>

            <h2 className="text-2xl font-black text-primary tracking-tight">{previewData.username || 'User'}</h2>
            <p className="mb-6 mt-1 text-sm font-medium text-secondary">
              {previewData.branch || 'B.Tech CSE'} {previewData.section ? `| ${previewData.section}` : ''}
            </p>

            <div className="space-y-3.5 text-left bg-white/[0.02] p-6 rounded-2xl border border-white/5 mx-4">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiAward className="text-accent" />
                <span className="italic">{previewData.bio || 'Expert Algorithmist'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiMapPin className="text-accent" />
                <span>{previewData.location || 'Third Year Student'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <FiCalendar className="text-accent" />
                <span>Member since {previewData.createdAt ? new Date(previewData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2026'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary pt-2 border-t border-white/5">
                <FiLink className="text-accent" />
                <span className="truncate text-accent font-medium">
                  {previewData.website ? previewData.website.replace(/^https?:\/\//, '') : `arena.dev/${previewData.username}`}
                </span>
              </div>
            </div>
            
            <div className="flex justify-center gap-6 border-t border-glass-border pt-6 mt-8 mb-4">
              <FiGithub className={clsx("transition-colors", previewData.github ? "text-primary" : "text-tertiary")} size={20} />
              <FiTwitter className={clsx("transition-colors", previewData.twitter ? "text-blue-400" : "text-tertiary")} size={20} />
            </div>
          </Card>

          <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <div className="flex gap-3">
              <FiZap className="text-blue-400 shrink-0 mt-1" />
              <p className="text-[11px] text-secondary leading-relaxed">
                <strong>Pro Tip:</strong> Your profile card is your digital resume in the Algorithm Arena. Use a professional bio and link your GitHub to stand out to clan chiefs and recruiters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
