import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { User } from '../../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function UsersModule() {
  const { db, hasPermission } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = await db.users.getAll();
    setUsers(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Are you sure?')) return;
    await db.users.delete(id);
    loadUsers();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        {hasPermission('users:manage') && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Full Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Last Login</th>
                  {hasPermission('users:manage') && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.fullName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'management' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'finance' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.createdAt.split('T')[0]}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.lastLogin || '-'}</td>
                    {hasPermission('users:manage') && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {}}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
