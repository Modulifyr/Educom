import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Staff } from '../../types';
import { Plus, Search, Filter, Edit2, Trash2, X, Save } from 'lucide-react';

interface StaffFormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  phone: string;
  email: string;
  salary: string;
  isActive: boolean;
}

const initialFormData: StaffFormData = {
  employeeId: '',
  firstName: '',
  lastName: '',
  designation: '',
  department: '',
  dateOfJoining: '',
  phone: '',
  email: '',
  salary: '',
  isActive: true
};

export function StaffModule() {
  const { db, hasPermission } = useAppStore();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = await db.staff.getAll(
      filterDepartment ? { department: filterDepartment } : undefined
    );
    setStaff(data);
    setLoading(false);
  }, [db, filterDepartment]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Are you sure you want to delete this staff member?')) return;
    await db.staff.delete(id);
    loadStaff();
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      employeeId: member.employeeId,
      firstName: member.firstName,
      lastName: member.lastName,
      designation: member.designation,
      department: member.department,
      dateOfJoining: member.dateOfJoining || '',
      phone: member.phone,
      email: member.email || '',
      salary: String(member.salary),
      isActive: member.isActive
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!db) return;
    if (!formData.firstName || !formData.lastName || !formData.employeeId || !formData.designation || !formData.department) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingStaff) {
        await db.staff.update(editingStaff.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          designation: formData.designation,
          department: formData.department,
          dateOfJoining: formData.dateOfJoining,
          phone: formData.phone,
          email: formData.email || undefined,
          salary: Number(formData.salary),
          isActive: formData.isActive
        });
      } else {
        await db.staff.create({
          employeeId: formData.employeeId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          designation: formData.designation,
          department: formData.department,
          dateOfJoining: formData.dateOfJoining,
          phone: formData.phone,
          email: formData.email || undefined,
          salary: Number(formData.salary),
          isActive: formData.isActive
        });
      }
      setShowModal(false);
      loadStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    }
    setSaving(false);
  };

  const filtered = staff.filter(s => {
    const search = searchTerm.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.employeeId.toLowerCase().includes(search)
    );
  });

  const departments = [...new Set(staff.map(s => s.department))];
  const canEdit = hasPermission('staff:edit');
  const canDelete = hasPermission('staff:delete');
  const canCreate = hasPermission('staff:create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Staff
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No staff found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Employee ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  {(canEdit || canDelete) && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{member.employeeId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.designation}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.department}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.phone}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">${member.salary.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        member.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingStaff ? 'Edit Staff' : 'Add New Staff'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., EMP-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Mathematics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Teacher, Principal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter phone number"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter monthly salary"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Active Staff</span>
                  </label>
                </div>
              </div>
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
                {saving ? 'Saving...' : 'Save Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}