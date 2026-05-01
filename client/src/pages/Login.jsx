import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCpu, FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Card from '../components/Card';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const isValid = useMemo(() => {
    return formData.email.trim().length > 0 && formData.password.length > 0;
  }, [formData]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    if (!formData.password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await api.post('/api/auth/login', formData);
      const payload = res.data?.data;

      login(payload);

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
      }

      toast.success('Welcome back');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.userMessage || 'Invalid credentials');
      setErrors({ form: err.userMessage || 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="cosmos-background absolute inset-0 z-0">
        <div className="orb orb-1 opacity-50"></div>
        <div className="orb orb-2 opacity-50"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
              <FiCpu className="text-white text-xl" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-primary">AlgoArena</span>
          </Link>
          <h2 className="text-xl font-medium text-secondary">Welcome back, Pilot.</h2>
        </div>

        <Card className="shadow-2xl shadow-black/5 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.form && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {errors.form}
              </div>
            )}

            <div className="space-y-2">
              <label className="field-label">Email Address</label>
              <div className="relative group">
                <FiMail className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/50 dark:bg-black/20 border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-400"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="field-label">Password</label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-3.5 text-secondary group-focus-within:text-accent transition-colors" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white/50 dark:bg-black/20 border border-glass-border rounded-xl py-3 pl-11 pr-4 text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-400"
                  placeholder="********"
                  aria-invalid={Boolean(errors.password)}
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-glow text-white font-bold transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Enter Arena <FiArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-glass-border">
            <p className="text-sm text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full z-10 border-t border-glass-border/40 py-6 text-center bg-black/5">
        <p className="text-sm text-secondary">
          Copyright 2026 Algorithm Arena. Built for{" "}
          <span className="text-primary font-semibold">
            GDG On Campus - SOA ITER
          </span>
          .
        </p>
      </footer>
    </div>
  );
};

export default Login;

