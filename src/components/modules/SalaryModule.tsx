import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { SalaryRecord, Staff } from '../../types';
import { DollarSign, Clock, CheckCircle, Play } from 'lucide-react';

export function SalaryModule() {
  const { db, currentUser, hasPermission } = useAppStore();
  const [records, setRecords]           = useState<SalaryRecord[]>([]);
  const [staff, setStaff]               = useState<Staff[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processing, setProcessing]     = useState(false);

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const [salaryData, staffData] = await Promise.all([
      db.salary.getAll({ month: selectedMonth }),
      db.staff.getAll({ isActive: true }),
    ]);
    setRecords(salaryData);
    setStaff(staffData);
    setLoading(false);
  }, [db, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProcessSalary = async () => {
    if (!db || !currentUser) return;
    setProcessing(true);
    const staffIds = staff.map(s => s.id);
    const [year, month] = selectedMonth.split('-');
    await db.salary.processBulk(staffIds, month, parseInt(year), currentUser.id);
    await loadData();
    setShowProcessModal(false);
    setProcessing(false);
  };

  const handleMarkPaid = async (id: string) => {
    if (!db || !confirm('Mark this salary as paid?')) return;
    await db.salary.update(id, {
      status: 'paid',
      paymentDate: new Date().toISOString(),
    });
    loadData();
  };

  const totalNetSalary  = records.reduce((sum, r) => sum + r.netSalary, 0);
  const pendingCount    = records.filter(r => r.status === 'pending').length;
  const paidCount       = records.filter(r => r.status === 'paid').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Salary Processing</h1>
        {hasPermission('salary:process') && (
          <button
            onClick={() => setShowProcessModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Play size={18} />
            Process Salary
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Net Salary</p>
              <p className="text-2xl font-bold text-slate-800">${totalNetSalary.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Month filter */}
      <div className="mb-4">
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No salary records for this month. Click "Process Salary" to generate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Staff Member</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Base Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Allowances</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Deductions</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Net Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map(record => {
                  const member = staff.find(s => s.id === record.staffId);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {member ? `${member.firstName} ${member.lastName}` : record.staffId}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">${record.baseSalary.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">${record.allowances.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">${record.deductions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">${record.netSalary.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'paid'    ? 'bg-green-100 text-green-700' :
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                        }`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPermission('salary:edit') && record.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(record.id)}
                            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Process Salary</h2>
            <p className="text-slate-600 mb-4">
              This will generate salary records for all {staff.length} active staff members
              for <strong>{selectedMonth}</strong>. Records that already exist will be skipped.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSalary}
                disabled={processing}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {processing ? 'Processing…' : 'Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}