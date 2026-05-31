import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import LoadingScreen from './LoadingScreen';
import { canAccessChiefPanel } from '../lib/permissions';

const ClanChiefRoute = ({ children }) => {
  const { isAuthenticated, role, loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen label="Verifying command..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!canAccessChiefPanel(user || { role })) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ClanChiefRoute;
