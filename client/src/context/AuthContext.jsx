import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Track whether we've shown the session-expired toast to avoid spamming
  const sessionExpiredToastShown = useRef(false);

  const clearSession = useCallback((nextLoading = false, showToast = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(nextLoading);
    if (showToast && !sessionExpiredToastShown.current) {
      sessionExpiredToastShown.current = true;
      toast.error('Your session expired. Please sign in again.', {
        duration: 5000,
        id: 'session-expired',
      });
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        clearSession();
        return null;
      }
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      if (me?.role === 'admin') {
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
        usernameSet: me?.usernameSet ?? true,
      };
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      sessionExpiredToastShown.current = false; // reset on successful refresh

      if (me?.dailyXpAwarded) {
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

      return normalizedUser;
      
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        clearSession(false, false); // /me failed with auth error — clear session
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Proactive token refresh every 45 minutes so the user is never logged out
  // while they are actively using the app (token TTL is 60m).
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes
    const interval = setInterval(() => {
      if (localStorage.getItem('token')) {
        api.post('/api/auth/refresh')
          .then(res => {
            const token = res.data?.data?.token;
            if (token) localStorage.setItem('token', token);
          })
          .catch(() => {
            // If proactive refresh fails, the next API call will trigger the
          });
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession(false, true); // show toast when forcibly logged out
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
      usernameSet: userObj?.usernameSet ?? true,
    };

    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    sessionExpiredToastShown.current = false;
    
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
