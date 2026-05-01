import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api';
import { USE_MOCK, mockCurrentUser } from '../lib/mockData';
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
    if (USE_MOCK) {
      localStorage.setItem('user', JSON.stringify(mockCurrentUser));
      setUser(mockCurrentUser);
      setLoading(false);
      return mockCurrentUser;
    }
    try {
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      const normalizedUser = {
        id: me?._id,
        username: me?.username,
        role: me?.role,
        profilePicture: me?.profilePicture,
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
      id: payload?._id,
      username: payload?.username,
      role: payload?.role,
      profilePicture: payload?.profilePicture,
    };

    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
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
