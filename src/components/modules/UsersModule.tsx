import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { User, UserRole } from '../../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface UserFormData {
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
}

const initialFormData: UserFormData = {
  username: '',
  fullName: '',
  role: 'teacher',
  email: ''
};

export function UsersModule() {
  const { db, hasPermission } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

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
    if (!db || !confirm('Are you sure you want to delete this user?')) return;
    await db.users.delete(id);
    loadUsers();
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRole,
      email: user.email || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!db) return;
    if (!formData.username || !formData.fullName) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await db.users.update(editingUser.id, {
          fullName: formData.fullName,
          role: formData.role,
          email: formData.email || undefined
        });
      } else {
        await db.users.create({
          username: formData.username,
          fullName: formData.fullName,
          role: formData.role,
          email: formData.email || undefined
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
    setSaving(false);
  };

  const canManage = hasPermission('users:manage');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        {canManage && (
          <button
            onClick={openAddModal}
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
                  {canManage && (
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
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(user)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter username"
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="admin">Admin - Full System Access</option>
                  <option value="management">Management - School Operations</option>
                  <option value="finance">Finance - Accounting & Payroll Only</option>
                  <option value="teacher">Teacher - Academic & Attendance Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter email address"
                />
              </div>

              {!editingUser && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> The default password for new users is <code className="bg-amber-100 px-1 rounded">password123</code>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}