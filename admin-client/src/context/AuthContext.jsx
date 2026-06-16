import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, setUnauthorizedHandler } from '../lib/api';
import AuthContext from './context';

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
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      if (me?.role !== 'admin') {
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
    const normalizedUser = {
      ...payload,
      id: payload?._id,
      username: payload?.username,
      role: payload?.role,
      status: payload?.status,
      points: payload?.points,
      profilePicture: payload?.profilePicture,
      isChief: payload?.isChief,
      clanId: payload?.clanId,
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
    }),
    [user, loading, login, logout, refreshMe, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
