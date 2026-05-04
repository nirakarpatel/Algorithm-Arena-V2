import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import LoadingScreen from './LoadingScreen';

const ClanChiefRoute = ({ children }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Verifying command..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Chief can be a clan-chief, admin, super-admin, or have the isChief flag
  const isChief = role === 'clan-chief' || role === 'admin' || role === 'super-admin' || user?.isChief;
  if (!isChief) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ClanChiefRoute;
