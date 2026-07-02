import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiCheck, FiX, FiArrowRight, FiLoader, FiFileText, FiHash, FiBookOpen, FiClock, FiGrid } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Card from '../components/Card';
import PixelBlast from '../components/PixelBlast';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import Logo from '../components/Logo';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../components/ui/select';
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const REGNO_REGEX = /^[a-zA-Z0-9]{6,20}$/;

const ClaimUsername = () => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');

  const [availability, setAvailability] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // If username is already set, redirect to dashboard
  useEffect(() => {
    if (user?.usernameSet) {
      navigate('/dashboard', { replace: true });
    }
  }, [user?.usernameSet, navigate]);

  // Validation
  const usernameError = useMemo(() => {
    if (!username) return null;
    if (username.length < 3) return 'At least 3 characters';
    if (username.length > 30) return 'Max 30 characters';
    if (!USERNAME_REGEX.test(username)) return 'Letters, numbers, and underscores only';
    return null;
  }, [username]);

  const regNoError = useMemo(() => {
    if (!regNo) return null;
    if (regNo.length < 6 || regNo.length > 20) return '6 to 20 characters';
    if (!REGNO_REGEX.test(regNo)) return 'Alphanumeric characters only';
    return null;
  }, [regNo]);

  // Debounced availability check
  useEffect(() => {
    if (!username || username.length < 3 || usernameError) {
      setAvailability(null);
      return;
    }

    setAvailability('checking');

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/auth/check-username/${encodeURIComponent(username)}`);
        setAvailability(res.data?.available ? 'available' : 'taken');
      } catch {
        setAvailability('invalid');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, usernameError]);

  const isFormValid = useMemo(() => {
    return (
      username.length >= 3 &&
      !usernameError &&
      availability === 'available' &&
      name.trim().length > 0 &&
      regNo.length >= 6 &&
      !regNoError &&
      branch.trim().length > 0 &&
      year.length > 0 &&
      section.trim().length > 0 &&
      !loading
    );
  }, [username, usernameError, availability, name, regNo, regNoError, branch, year, section, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/claim-username', {
        username,
        name: name.trim(),
        regNo: regNo.trim(),
        branch: branch.trim(),
        year,
        section: section.trim(),
      });

      updateUser({
        username,
        name: name.trim(),
        regNo: regNo.trim(),
        branch: branch.trim(),
        year,
        section: section.trim(),
        usernameSet: true,
      });

      toast.success(`Welcome, Pilot ${username}! 🚀`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      let message = err.userMessage || err?.response?.data?.message || 'Failed to complete onboarding';
      
      if (err?.response?.data?.errors?.length > 0) {
        message = err.response.data.errors.map(e => e.message).join(' • ');
      }

      setError(message);
      toast.error(message);
      if (err?.response?.status === 409 && message.toLowerCase().includes('username')) {
        setAvailability('taken');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = () => {
    switch (availability) {
      case 'checking':
        return <FiLoader className="animate-spin text-secondary" size={18} />;
      case 'available':
        return <FiCheck className="text-green-500" size={18} />;
      case 'taken':
        return <FiX className="text-red-500" size={18} />;
      default:
        return null;
    }
  };

  const usernameStatusMessage = () => {
    if (usernameError) return <span className="text-red-600 text-xs">{usernameError}</span>;
    switch (availability) {
      case 'checking':
        return <span className="text-secondary text-xs">Checking availability...</span>;
      case 'available':
        return <span className="text-green-500 text-xs">Username is available! ✓</span>;
      case 'taken':
        return <span className="text-red-500 text-xs">Username is already taken</span>;
      default:
        return <span className="text-tertiary text-xs">Letters, numbers, and underscores only</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color={theme === 'dark' ? '#4f46e5' : '#4f46e5'}
          patternScale={2}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          speed={0.5}
          edgeFade={0.25}
          transparent
        />
      </div>

      <div className="w-full max-w-2xl relative z-10 my-auto py-8">
        <Card className="shadow-2xl shadow-black/10 dark:shadow-black/50" hover={false} variant="glass">
          {/* Header */}
          <div className="text-center justify-center mb-7">
<Logo className="justify-center mx-auto" variant="arena" size="sm" showText="true" />
            <h2 className="text-2xl my-4 font-black text-primary tracking-tight">Complete Your Profile</h2>
            <p className="text-sm text-secondary mt-1">This information is used for academic tracking and rankings.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="field-label">Username</label>
                <div className="relative group">
                  <FiUser className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-12 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-tertiary"
                    placeholder="e.g. Neo_42"
                    maxLength={30}
                  />
                  <div className="absolute right-4 top-3.5">
                    {statusIcon()}
                  </div>
                </div>
                <div className="min-h-[1.25rem] pl-1 mt-0.5">
                  {usernameStatusMessage()}
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="field-label">Full Name</label>
                <div className="relative group">
                  <FiFileText className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-tertiary"
                    placeholder="e.g. John Doe"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div className="space-y-1.5">
                <label className="field-label">Registration Number</label>
                <div className="relative group">
                  <FiHash className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.trim().toUpperCase())}
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-tertiary font-mono"
                    placeholder="e.g. 231010XXXX"
                    maxLength={20}
                  />
                </div>
                <div className="h-4 pl-1">
                  {regNoError && <span className="text-red-600 text-xs">{regNoError}</span>}
                </div>
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="field-label">Branch</label>
                <div className="relative group">
                  <FiBookOpen className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors z-10" />
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className="w-full h-[50px] bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
                      <SelectValue placeholder="Select Branch/Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Engineering & Technology</SelectLabel>
                        <SelectItem value="B.Tech CSE">B.Tech CSE</SelectItem>
                        <SelectItem value="B.Tech CSIT">B.Tech CSIT</SelectItem>
                        <SelectItem value="B.Tech IT">B.Tech IT</SelectItem>
                        <SelectItem value="B.Tech ECE">B.Tech ECE</SelectItem>
                        <SelectItem value="B.Tech EE">B.Tech EE</SelectItem>
                        <SelectItem value="B.Tech EEE">B.Tech EEE</SelectItem>
                        <SelectItem value="B.Tech Mechanical">B.Tech Mechanical</SelectItem>
                        <SelectItem value="B.Tech Civil">B.Tech Civil</SelectItem>
                        <SelectItem value="M.Tech">M.Tech</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Computer Applications</SelectLabel>
                        <SelectItem value="BCA">BCA</SelectItem>
                        <SelectItem value="MCA">MCA</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Medical & Health Sciences</SelectLabel>
                        <SelectItem value="MBBS">MBBS</SelectItem>
                        <SelectItem value="BDS (Dental)">BDS (Dental)</SelectItem>
                        <SelectItem value="B.Pharm (Pharmacy)">B.Pharm (Pharmacy)</SelectItem>
                        <SelectItem value="B.Sc Nursing">B.Sc Nursing</SelectItem>
                        <SelectItem value="MD / MS">MD / MS</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Law</SelectLabel>
                        <SelectItem value="BA LLB / BBA LLB">BA LLB / BBA LLB</SelectItem>
                        <SelectItem value="LLB">LLB</SelectItem>
                        <SelectItem value="LLM">LLM</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Management & Commerce</SelectLabel>
                        <SelectItem value="BBA">BBA</SelectItem>
                        <SelectItem value="MBA">MBA</SelectItem>
                        <SelectItem value="B.Com">B.Com</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Agriculture & Sciences</SelectLabel>
                        <SelectItem value="B.Sc Agriculture">B.Sc Agriculture</SelectItem>
                        <SelectItem value="B.Sc Biotech">B.Sc Biotech</SelectItem>
                        <SelectItem value="B.Sc (Hons)">B.Sc (Hons)</SelectItem>
                        <SelectItem value="M.Sc">M.Sc</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Other Domains</SelectLabel>
                        <SelectItem value="BHMCT (Hotel Management)">BHMCT (Hotel Management)</SelectItem>
                        <SelectItem value="BA (Hons)">BA (Hons)</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <label className="field-label">Academic Year</label>
                <div className="relative group">
                  <FiClock className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors z-10" />
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-full h-[50px] bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Year">First Year</SelectItem>
                      <SelectItem value="Second Year">Second Year</SelectItem>
                      <SelectItem value="Third Year">Third Year</SelectItem>
                      <SelectItem value="Fourth Year">Fourth Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="field-label">Section</label>
                <div className="relative group">
                  <FiGrid className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value.trim().toUpperCase())}
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-tertiary font-mono"
                    placeholder="e.g. 24E1B3"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full py-3.5 mt-2 rounded-xl bg-accent hover:bg-accent-glow text-white font-bold transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Enter the Arena <FiArrowRight />
                </>
              )}
            </button>
          </form>
        </Card>
      </div>


    </div>
  );
};

export default ClaimUsername;
