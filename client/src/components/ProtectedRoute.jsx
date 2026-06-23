import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import LoadingScreen from "./LoadingScreen";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  if (role === 'admin' || role === 'superAdmin') {
    return <Navigate to="/login" />;
  }

  if (user && user.usernameSet === false && location.pathname !== '/claim-username') {
    return <Navigate to="/claim-username" replace />;
  }

  return children;
};

export default ProtectedRoute;
