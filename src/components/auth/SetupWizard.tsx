import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CheckCircle, AlertCircle, User, Lock } from 'lucide-react';

export function SetupWizard() {
  const { checkHasUsers } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      await invoke('create_user', {
        data: {
          username: username.trim(),
          password: password,
          full_name: fullName.trim(),
          role: 'admin',
          email: null,
        }
      });

      setSuccess(true);

      await checkHasUsers();

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Failed to create admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to create admin account');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Account Created!</h2>
            <p className="text-slate-600 mb-6">Redirecting to login...</p>
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Welcome to Educom</h1>
          <p className="text-slate-500">Create your administrator account to get started</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
                disabled={isLoading}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                autoComplete="username"
                disabled={isLoading}
                placeholder="Choose a username"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                placeholder="Create a password (min 8 characters)"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !fullName.trim() || !username.trim() || !password || !confirmPassword}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium
                       hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          This account will have full administrative privileges.
        </p>
      </div>
    </div>
  );
}