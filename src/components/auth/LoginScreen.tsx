import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';

export function LoginScreen() {
  const { login, loginError, clearLoginError } = useAppStore();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    clearLoginError();
    setIsSubmitting(true);

    const success = await login(username.trim(), password);

    if (!success) {
      setPassword('');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Educom</h1>
          <p className="text-slate-500 text-sm">Institutional Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {loginError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {loginError}
            </p>
          )}

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

        <p className="mt-6 text-center text-xs text-slate-400">
          Local-first · Encrypted SQLite storage
        </p>
      </div>
    </div>
  );
}