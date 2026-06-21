import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import Card from '../components/Card';
import PixelBlast from '../components/PixelBlast';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import Logo from '../components/Logo';

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Firebase Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // 2. Send Firebase ID token to our server
      const res = await api.post('/api/auth/google', { idToken });
      const payload = res.data?.data;

      // Block Admins / Super Admins from logging in on the participant site
      const userRole = payload?.user?.role || payload?.role;
      if (userRole === 'admin' || userRole === 'superAdmin') {
        toast.error('Admins must log in through the Admin Command Center.');
        setError('Admins are not allowed to log in on the participant website.');
        api.post('/api/auth/logout').catch(() => null);
        setLoading(false);
        return;
      }

      // 3. Store session
      login(payload);

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
      }

      // 4. Route based on whether username is set
      const isNewUser = payload?.isNewUser || payload?.user?.isNewUser;
      const usernameSet = payload?.user?.usernameSet ?? payload?.usernameSet;

      if (isNewUser || !usernameSet) {
        toast.success('Welcome! Let\'s pick a username.');
        navigate('/claim-username');
      } else {
        toast.success('Welcome back');
        navigate('/dashboard');
      }
    } catch (err) {
      // Don't show error if user just closed the popup
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }

      const message = err.userMessage || err?.response?.data?.message || 'Sign in failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden">

      <div className="absolute inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="circle"
          pixelSize={4}
          color={theme === 'dark' ? '#4f46e5' : '#4f46e5'}
          patternScale={4}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.5}
          edgeFade={0.25}
          transparent
        />
      </div>

      <div className="w-full max-w-md relative z-10 my-auto py-8">
        <Card className="shadow-2xl shadow-black/10 dark:shadow-black/50">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center justify-center gap-2 group mb-3">
              <Logo variant="arena" size="sm" showText={true} />
            </Link>
            <p className="text-xs text-tertiary uppercase tracking-widest font-bold">Competitor Login</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 border border-glass-border text-primary font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <p className="text-center text-xs text-tertiary leading-relaxed">
              New or returning — <span className="text-accent font-medium">one click gets you in.</span>
              <br />
              Your Google profile is used to create your account.
            </p>
          </div>


        </Card>
      </div>

      {/* Footer */}
      <p className="text-sm text-secondary">
        Copyright 2026 Algorithm Arena. Built for{" "}
        <span className="text-primary font-semibold">
          GDG On Campus - SOA ITER
        </span>
        .
      </p>
    </div>
  );
};

export default Login;
