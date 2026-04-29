import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingScreen from './components/LoadingScreen';
import ThemeToggle from './components/ThemeToggle';
import { useAuth } from './context/useAuth';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ChallengeDetails = lazy(() => import('./pages/ChallengeDetails'));
const SubmissionDetails = lazy(() => import('./pages/SubmissionDetails'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Clans = lazy(() => import('./pages/Clans'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLoginSuccess = () => {};

  const handleLogout = () => {
    navigate('/', { replace: true });
    logout();
  };

  return (
    <div className="app-container">
      <div className="fixed bottom-6 right-6 z-[60]">
        <ThemeToggle />
      </div>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout onLogout={handleLogout} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/clans" element={<Clans />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/challenge/:id" element={<ChallengeDetails />} />
            <Route path="/submission/:id" element={<SubmissionDetails />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;

