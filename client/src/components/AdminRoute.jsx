import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import LoadingScreen from './LoadingScreen';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const isAdmin = role === 'admin' || role === 'super-admin';
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default AdminRoute;

