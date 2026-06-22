import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, setUnauthorizedHandler } from '../lib/api';
import AuthContext from './context';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const getStoredUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback((nextLoading = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(nextLoading);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        clearSession();
        return null;
      }
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      if (me?.role !== 'admin' && me?.role !== 'superAdmin') {
        clearSession();
        return null;
      }
      const normalizedUser = {
        ...me,
        id: me?._id,
        username: me?.username,
        role: me?.role,
        status: me?.status,
        points: me?.points,
        profilePicture: me?.profilePicture,
        isChief: me?.isChief,
        clanId: me?.clanId,
        lastConfirmedAt: me?.lastConfirmedAt,
      };
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return normalizedUser;
    } catch {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  const login = useCallback((payload) => {
    const token = payload?.token || payload?.accessToken;
    const userObj = payload?.user || payload;
    const normalizedUser = {
      ...userObj,
      id: userObj?.id || userObj?._id,
      username: userObj?.username,
      role: userObj?.role,
      status: userObj?.status,
      points: userObj?.points,
      profilePicture: userObj?.profilePicture,
      isChief: userObj?.isChief,
      clanId: userObj?.clanId,
      lastConfirmedAt: userObj?.lastConfirmedAt,
    };

    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);

    // Show daily XP bonus toast if awarded
    if (payload?.dailyXpAwarded) {
      setTimeout(() => {
        toast.success('🔥 +50 XP Daily Login Bonus!', {
          duration: 4000,
          style: {
            background: '#0f1115',
            color: '#fff',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 0 20px rgba(168,85,247,0.2)',
          },
          iconTheme: {
            primary: '#a855f7',
            secondary: '#fff',
          },
        });
      }, 800);
    }
  }, []);

  const logout = useCallback(() => {
    api.post('/api/auth/logout').catch(() => null);
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const confirmSessionIfNeeded = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('Bypassing re-authentication in development mode');
      return;
    }

    const ROLE_CHANGE_WINDOW_MS = 5 * 60 * 1000;
    const lastConfirmedTime = user?.lastConfirmedAt ? new Date(user.lastConfirmedAt).getTime() : 0;
    
    if (Date.now() - lastConfirmedTime > ROLE_CHANGE_WINDOW_MS) {
      if (!window.confirm("For security, this action requires you to re-verify your Google credentials. Click OK to authenticate now.")) {
        throw new Error('User cancelled re-authentication');
      }
      
      toast.loading("Opening Google sign-in...", { id: 'reauth-session' });
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken(true);
      toast.loading("Verifying session...", { id: 'reauth-session' });
      const confirmRes = await api.post('/api/auth/confirm-session', { idToken });
      
      const newConfirmedAt = confirmRes.data?.lastConfirmedAt || new Date().toISOString();
      updateUser({ lastConfirmedAt: newConfirmedAt });
      toast.success("Identity verified!", { id: 'reauth-session' });
    }
  }, [user?.lastConfirmedAt, updateUser]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      refreshMe,
      updateUser,
      confirmSessionIfNeeded,
    }),
    [user, loading, login, logout, refreshMe, updateUser, confirmSessionIfNeeded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
