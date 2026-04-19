import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { rbacService } from '../../services/rbac';
import { LogIn, User, Lock } from 'lucide-react';

const DEFAULT_USERS = [
  { username: 'admin', fullName: 'System Administrator', role: 'admin' },
  { username: 'manager', fullName: 'School Manager', role: 'management' },
  { username: 'finance', fullName: 'Finance Officer', role: 'finance' },
  { username: 'teacher', fullName: 'John Teacher', role: 'teacher' }
];

export function LoginScreen() {
  const { login, db, isLoading } = useAppStore();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState(DEFAULT_USERS);

  useEffect(() => {
    const loadUsers = async () => {
      if (db) {
        const allUsers = await db.users.getAll();
        if (allUsers.length > 0) {
          setUsers(allUsers.map(u => ({ username: u.username, fullName: u.fullName, role: u.role })));
        }
      }
    };
    if (!isLoading) {
      loadUsers();
    }
  }, [db, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(username);
    if (!success) {
      setError('Invalid username. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleQuickLogin = async (username: string) => {
    setError('');
    setIsSubmitting(true);
    const success = await login(username);
    if (!success) {
      setError('Login failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Educom</h1>
          <p className="text-slate-500">Institutional Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your username"
                disabled={isSubmitting}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <Lock size={14} />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !username}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500 text-center mb-4">Quick Login (Demo Accounts)</p>
          <div className="space-y-2">
            {users.map(user => (
              <button
                key={user.username}
                onClick={() => handleQuickLogin(user.username)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-slate-800">{user.fullName}</p>
                  <p className="text-sm text-slate-500">@{user.username}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'management' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'finance' ? 'bg-green-100 text-green-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {rbacService.getRoleDisplayName(user.role as any)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Local-first architecture | Encrypted storage
          </p>
        </div>
      </div>
    </div>
  );
}
