import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';

// Demo credentials are shown in dev mode only.
// In production builds (NODE_ENV=production) this panel is hidden.
const IS_DEV = import.meta.env.DEV;

const DEMO_ACCOUNTS = [
  { username: 'admin',   password: 'admin123',   label: 'System Administrator', role: 'Administrator' },
  { username: 'manager', password: 'manager123', label: 'School Manager',        role: 'Management' },
  { username: 'finance', password: 'finance123', label: 'Finance Officer',        role: 'Finance' },
  { username: 'teacher', password: 'teacher123', label: 'John Teacher',           role: 'Teacher' },
];

export function LoginScreen() {
  const { login } = useAppStore();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    setIsSubmitting(true);

    const success = await login(username.trim(), password);

    if (!success) {
      setError('Invalid username or password.');
      setPassword('');
    }

    setIsSubmitting(false);
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setError('');
    setIsSubmitting(true);
    const success = await login(u, p);
    if (!success) {
      setError('Quick login failed. Has the database been seeded?');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Educom</h1>
          <p className="text-slate-500 text-sm">Institutional Management System</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                disabled={isSubmitting}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                           hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium
                       hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Dev-only quick login panel */}
        {IS_DEV && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-xs text-amber-600 font-medium text-center mb-3 uppercase tracking-wide">
              Dev — Quick Login
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.username}
                  onClick={() => handleQuickLogin(account.username, account.password)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between px-4 py-2.5
                             bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors
                             disabled:opacity-50 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{account.label}</p>
                    <p className="text-xs text-slate-500">@{account.username}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Local-first · Encrypted SQLite storage
        </p>
      </div>
    </div>
  );
}