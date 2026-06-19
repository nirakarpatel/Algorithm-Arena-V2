import React, { useState, useEffect } from 'react';
import { FiUser, FiMapPin, FiGithub, FiTwitter, FiGlobe, FiSave, FiCpu, FiBookOpen, FiLayers, FiGrid, FiAward, FiCalendar, FiLink, FiZap, FiEdit2, FiLinkedin, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';


const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop',
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = React.useRef(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    branch: '',
    year: '',
    section: '',
    location: '',
    github: '',
    twitter: '',
    linkedin: '',
    website: '',
    profilePicture: '',
    preferredLanguage: 'javascript',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync form with user data when user loads
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
        linkedin: user.linkedin || '',
        website: user.website || '',
        profilePicture: user.profilePicture || '',
        preferredLanguage: user.preferredLanguage || 'javascript',
      });
    }
  }, [user, user?.bio, user?.branch, user?.year, user?.section, user?.location, user?.github, user?.twitter, user?.linkedin, user?.website, user?.profilePicture, user?.preferredLanguage]);

  /**
   * Extract just the username when a user pastes a full profile URL.
   * e.g. "https://github.com/nirakarpatel" → "nirakarpatel"
   *      "https://www.linkedin.com/in/john-doe/" → "john-doe"
   *      "https://twitter.com/elonmusk" → "elonmusk"
   */
  const extractUsername = (field, rawValue) => {
    const value = rawValue.trim();
    const isUrl = /https?:\/\/|www\.|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/|localhost:/i.test(value);

    if (field === 'github') {
      const match = value.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?/);
      if (match) return match[1];
      if (isUrl) return '';
      return value.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    if (field === 'linkedin') {
      const match = value.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/);
      if (match) return match[1];
      if (isUrl) return '';
      return value.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    if (field === 'twitter') {
      const match = value.match(/(?:(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/|@)([a-zA-Z0-9_]+)\/?/);
      if (match) return match[1];
      if (isUrl) return '';
      return value.replace(/[^a-zA-Z0-9_]/g, '');
    }

    return value;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const socialFields = ['github', 'linkedin', 'twitter'];
    const finalValue = socialFields.includes(name) ? extractUsername(name, value) : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleAvatarSelect = (url) => {
    setFormData((prev) => ({ ...prev, profilePicture: url }));
    setShowAvatarPicker(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, profilePicture: reader.result }));
      setShowAvatarPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.put('/api/auth/update-me', formData);
      updateUser(res.data.data);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Preview data merges current user (for stats/avatar) with live form data
  const preview = { ...user, ...formData };

  return (
    <>
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <PageHeader
        title="Rewrite Profile Card"
        subtitle="Craft your digital identity in the arena. Preview updates in real-time."
        showBack={true}
        actions={
          <button
            className="btn-secondary text-sm flex items-center gap-2"
            onClick={() => setShowAvatarPicker(true)}
          >
            <FiZap className="text-accent" /> Change Avatar
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Form Section ─────────────────────────────── */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Card Essentials */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-glass-border">
              <div className="p-2 rounded-lg bg-accent/10 text-accent"><FiUser size={20} /></div>
              <div>
                <h3 className="text-lg font-bold">Card Essentials</h3>
                <p className="text-xs text-secondary">Basic information shown on your primary card</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="field-label flex items-center gap-2"><FiBookOpen className="text-accent" size={14} /> Profile Bio / Headline</label>
                <input name="bio" className="field-input" placeholder="e.g. Expert Algorithmist" value={formData.bio} onChange={handleChange} />
                <p className="text-[10px] text-tertiary">A short, punchy description of your coding persona</p>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiCpu className="text-accent" size={14} /> Branch / Course</label>
                <select name="branch" className="field-select" value={formData.branch} onChange={handleChange}>
                  <option value="">Select Branch</option>
                  <option value="B.Tech CSE">B.Tech CSE</option>
                  <option value="B.Tech ECE">B.Tech ECE</option>
                  <option value="B.Tech EEE">B.Tech EEE</option>
                  <option value="MCA">MCA</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiGrid className="text-accent" size={14} /> Section / Group</label>
                <input
                  name="section"
                  className="field-input font-mono"
                  placeholder="e.g. 24E1B3"
                  value={formData.section}
                  onChange={(e) => {
                    const val = e.target.value.trim().toUpperCase();
                    setFormData(prev => ({ ...prev, section: val }));
                  }}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiLayers className="text-accent" size={14} /> Year of Study</label>
                <select name="year" className="field-select" value={formData.year} onChange={handleChange}>
                  <option value="">Select Year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiMapPin className="text-accent" size={14} /> Location</label>
                <input name="location" className="field-input" placeholder="e.g. Bhubaneswar, India" value={formData.location} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiCpu className="text-accent" size={14} /> Preferred Code Language</label>
                <select name="preferredLanguage" className="field-select" value={formData.preferredLanguage} onChange={handleChange}>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
                <p className="text-[10px] text-tertiary">Default language pre-selected in the code editor</p>
              </div>
            </div>
          </Card>

          {/* Social Presence */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-glass-border">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><FiGlobe size={20} /></div>
              <div>
                <h3 className="text-lg font-bold">Social Presence</h3>
                <p className="text-xs text-secondary">Connect your external developer profiles — icons will become clickable links</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiGithub className="text-primary" size={14} /> GitHub Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-xs">github.com/</span>
                  <input name="github" className="field-input pl-[85px]" placeholder="username" value={formData.github} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiTwitter className="text-blue-400" size={14} /> Twitter / X Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-xs">@</span>
                  <input name="twitter" className="field-input pl-8" placeholder="username" value={formData.twitter} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiLinkedin className="text-blue-500" size={14} /> LinkedIn Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-xs">linkedin.com/in/</span>
                  <input name="linkedin" className="field-input pl-[118px]" placeholder="username" value={formData.linkedin} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label flex items-center gap-2"><FiLink className="text-green-400" size={14} /> Personal Website</label>
                <input name="website" className="field-input" placeholder="https://yourwebsite.com" value={formData.website} onChange={handleChange} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary px-8" onClick={() => window.history.back()}>Cancel</button>
            <button type="submit" className="btn-primary px-10 flex items-center gap-2 shadow-accent-glow" disabled={isLoading}>
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <FiSave />
              }
              Save Changes
            </button>
          </div>
        </form>

        {/* ── Live Preview ──────────────────────────────── */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent">Live Card Preview</h3>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(16px)" }}>
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.7), transparent)" }} />

            {/* Avatar section */}
            <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center">
              <div className="group relative mb-4 inline-block cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
                <div className="h-24 w-24 rounded-2xl p-0.5 shadow-xl"
                  style={{ background: "linear-gradient(135deg, rgba(var(--accent-rgb),1), rgba(168,85,247,0.9))", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.3)" }}>
                  {preview.profilePicture ? (
                    <img src={preview.profilePicture} alt="Profile" referrerPolicy="no-referrer" className="h-full w-full rounded-[14px] object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#1a1a1c] text-3xl font-black uppercase text-white">
                      {preview.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#0f0f14] bg-green-500 shadow-lg" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiEdit2 className="text-white" size={20} />
                </div>
              </div>

              <h2 className="text-xl font-black text-primary">{preview.username || 'Operative'}</h2>
              <p className="text-sm text-secondary mt-0.5">
                {preview.branch || 'B.Tech CSE'}
                {preview.section ? ` · ${preview.section}` : ''}
              </p>
            </div>

            {/* Details section */}
            <div className="mx-6 mb-4 space-y-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 text-left">
              {preview.bio && (
                <div className="flex items-center gap-2.5 text-sm text-secondary">
                  <FiAward className="text-accent flex-shrink-0" size={13} />
                  <span className="italic">{preview.bio}</span>
                </div>
              )}
              {/* Year of study — now properly shown */}
              {preview.year && (
                <div className="flex items-center gap-2.5 text-sm text-secondary">
                  <FiLayers className="text-accent flex-shrink-0" size={13} />
                  <span>{preview.year}</span>
                </div>
              )}
              {preview.location && (
                <div className="flex items-center gap-2.5 text-sm text-secondary">
                  <FiMapPin className="text-accent flex-shrink-0" size={13} />
                  <span>{preview.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-secondary">
                <FiCalendar className="text-accent flex-shrink-0" size={13} />
                <span>
                  Member since {preview.createdAt
                    ? new Date(preview.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : 'April 2026'}
                </span>
              </div>
              {preview.website && (
                <div className="flex items-center gap-2.5 text-sm">
                  <FiLink className="text-accent flex-shrink-0" size={13} />
                  <a href={preview.website} target="_blank" rel="noopener noreferrer"
                    className="text-accent font-medium hover:underline truncate">
                    {preview.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Social links — all clickable */}
            <div className="mx-6 mb-6 flex items-center gap-2 flex-wrap">
              {preview.github ? (
                <a href={`https://github.com/${preview.github}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-primary hover:border-white/20 transition-all">
                  <FiGithub size={12} /> {preview.github}
                </a>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-tertiary">
                  <FiGithub size={12} /> GitHub
                </span>
              )}
              {preview.twitter ? (
                <a href={`https://twitter.com/${preview.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 text-xs text-blue-400 hover:border-blue-400/40 transition-all">
                  <FiTwitter size={12} /> @{preview.twitter}
                </a>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-tertiary">
                  <FiTwitter size={12} /> Twitter
                </span>
              )}
              {preview.linkedin ? (
                <a href={`https://linkedin.com/in/${preview.linkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/[0.08] border border-blue-700/20 text-xs text-blue-500 hover:border-blue-500/40 transition-all">
                  <FiLinkedin size={12} /> LinkedIn
                </a>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-tertiary">
                  <FiLinkedin size={12} /> LinkedIn
                </span>
              )}
            </div>

            {/* GDG footer strip */}
            <div className="border-t border-white/[0.05] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo variant="gdg" size="w-5 h-5" imgClassName="opacity-70" />
                <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest">GDG · SOA ITER</span>
              </div>
              <span className="text-[9px] text-tertiary font-mono opacity-50">PROFILE CARD</span>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <div className="flex gap-3">
              <FiZap className="text-blue-400 shrink-0 mt-0.5" size={14} />
              <p className="text-[11px] text-secondary leading-relaxed">
                <strong>Pro Tip:</strong> Your profile card is your digital resume. Add your GitHub and LinkedIn to stand out to Clan Chiefs and recruiters. Social icons become clickable links once saved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Avatar Picker Modal */}
    <AnimatePresence>
      {showAvatarPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="macos-glass w-full max-w-md p-8"
          >
            <h3 className="mb-6 text-xl font-bold text-primary">Choose an Avatar</h3>

            <div
              className="group relative mb-8 cursor-pointer rounded-2xl border-2 border-dashed border-glass-border p-6 transition-colors hover:border-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent"><FiZap /></div>
                <p className="text-sm font-bold text-primary">Upload from device</p>
                <p className="text-[10px] text-tertiary">PNG or JPG up to 2MB</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>

            <div className="mb-8 grid grid-cols-3 gap-4">
              {PRESET_AVATARS.map((url, index) => (
                <button key={index} type="button"
                  className="aspect-square overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-accent"
                  onClick={() => handleAvatarSelect(url)}>
                  <img src={url} alt={`Avatar ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowAvatarPicker(false)}>Cancel</button>
              <button className="btn-secondary flex-1 text-red-400" onClick={() => handleAvatarSelect(null)}>Clear</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};

export default Settings;
