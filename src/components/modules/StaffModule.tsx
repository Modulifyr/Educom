import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Staff } from '../../types';
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react';

export function StaffModule() {
  const { db, hasPermission } = useAppStore();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!db || !confirm('Are you sure?')) return;
    await db.staff.delete(id);
    loadStaff();
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
        {hasPermission('staff:create') && (
          <button
            onClick={() => {}}
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
                  {(hasPermission('staff:edit') || hasPermission('staff:delete')) && (
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
                    {(hasPermission('staff:edit') || hasPermission('staff:delete')) && (
                      <td className="px-4 py-3 text-right">
                        {hasPermission('staff:edit') && (
                          <button
                            onClick={() => {}}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('staff:delete') && (
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
    </div>
  );
}
