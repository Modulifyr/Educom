import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Staff, SalaryOverride } from '../../types';
import { DollarSign, Clock, CheckCircle, Play, X, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface SalaryRow {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  department: string;
  month: string;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentDate?: string;
  status: 'pending' | 'paid' | 'failed';
  processedBy: string;
  createdAt: string;
}

interface OverrideForm {
  allowances: string;
  deductions: string;
  note: string;
}

export function SalaryModule() {
  const { db, currentUser, hasPermission } = useAppStore();
  const [records, setRecords] = useState<SalaryRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Per-staff overrides in the process modal
  const [overrides, setOverrides] = useState<Record<string, OverrideForm>>({});
  const [expandedOverrides, setExpandedOverrides] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const { invoke } = await import('@tauri-apps/api/core');
      const [salaryData, staffData] = await Promise.all([
        invoke<SalaryRow[]>('get_salary_with_staff', {
          month,
          year: parseInt(year),
          status: null,
        }),
        db.staff.getAll({ isActive: true }),
      ]);
      setRecords(salaryData);
      setStaff(staffData);
    } finally {
      setLoading(false);
    }
  }, [db, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset overrides when modal opens
  const openProcessModal = () => {
    const init: Record<string, OverrideForm> = {};
    staff.forEach(s => {
      init[s.id] = { allowances: '0', deductions: '0', note: '' };
    });
    setOverrides(init);
    setExpandedOverrides(false);
    setShowProcessModal(true);
  };

  // ── Process salary ──────────────────────────────────────────────────────
  const handleProcessSalary = async () => {
    if (!currentUser) return;
    setProcessing(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [year, month] = selectedMonth.split('-');

      const overrideList: SalaryOverride[] = staff.map(s => ({
        staffId: s.id,
        allowances: parseFloat(overrides[s.id]?.allowances ?? '0') || 0,
        deductions: parseFloat(overrides[s.id]?.deductions ?? '0') || 0,
        note: overrides[s.id]?.note || undefined,
      }));

      await invoke('process_bulk_salary', {
        staffIds: staff.map(s => s.id),
        month,
        year: parseInt(year),
        processedBy: currentUser.id,
        overrides: overrideList,
      });

      setShowProcessModal(false);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process salary');
    }
    setProcessing(false);
  };

  // ── Mark paid ───────────────────────────────────────────────────────────
  const handleMarkPaid = async (id: string) => {
    if (!db || !confirm('Mark this salary as paid?')) return;
    await db.salary.update(id, {
      status: 'paid',
      paymentDate: new Date().toISOString().split('T')[0],
    });
    loadData();
  };

  // ── Mark all paid ────────────────────────────────────────────────────────
  const handleMarkAllPaid = async () => {
    if (!db) return;
    const pending = records.filter(r => r.status === 'pending');
    if (pending.length === 0) return;
    if (!confirm(`Mark all ${pending.length} pending salaries as paid?`)) return;
    for (const r of pending) {
      await db.salary.update(r.id, {
        status: 'paid',
        paymentDate: new Date().toISOString().split('T')[0],
      });
    }
    loadData();
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const paidCount = records.filter(r => r.status === 'paid').length;
  const alreadyProcessed = records.length > 0;

  const canProcess = hasPermission('salary:process');
  const canEdit = hasPermission('salary:edit');

  const totalOverrides = (id: string) => {
    const ov = overrides[id];
    if (!ov) return 0;
    return (parseFloat(ov.allowances) || 0) - (parseFloat(ov.deductions) || 0);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Salary Processing</h1>
        <div className="flex gap-3">
          {canEdit && paidCount === 0 && records.length > 0 && (
            <button
              onClick={handleMarkAllPaid}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Mark All Paid
            </button>
          )}
          {canProcess && (
            <button
              onClick={openProcessModal}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Play size={18} />
              {alreadyProcessed ? 'Re-Process' : 'Process Salary'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payroll', value: `NPR ${totalNet.toLocaleString()}`, color: 'bg-slate-500', Icon: DollarSign },
          { label: 'Pending', value: pendingCount, color: 'bg-amber-500', Icon: Clock },
          { label: 'Paid', value: paidCount, color: 'bg-green-500', Icon: CheckCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
              </div>
            </div>
          </div>
        ))}
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
            No salary records for {selectedMonth}.
            {canProcess && (
              <span> Click <strong>Process Salary</strong> to generate them.</span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Staff Member</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Department</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Base</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Allowances</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Deductions</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Net</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{record.staffName}</p>
                      <p className="text-xs text-slate-500">{record.designation}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.department}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {record.baseSalary.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {record.allowances > 0 ? `+${record.allowances.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {record.deductions > 0 ? `-${record.deductions.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                      {record.netSalary.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === 'paid'    ? 'bg-green-100 text-green-700' :
                        record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-red-100 text-red-700'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        {record.paymentDate && ` · ${record.paymentDate}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && record.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPaid(record.id)}
                          className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Total ({records.length} staff)
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-700">
                    {records.reduce((s, r) => s + r.baseSalary, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                    +{records.reduce((s, r) => s + r.allowances, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                    -{records.reduce((s, r) => s + r.deductions, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">
                    {totalNet.toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Process modal ──────────────────────────────────────────────────── */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Process Salary</h2>
                <p className="text-sm text-slate-500 mt-0.5">{selectedMonth} · {staff.length} active staff</p>
              </div>
              <button onClick={() => setShowProcessModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {alreadyProcessed && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Salary records for {selectedMonth} already exist. Running again will skip any already-processed staff.
                </div>
              )}

              {/* Allowances/Deductions toggle */}
              <button
                onClick={() => setExpandedOverrides(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 mb-4"
              >
                {expandedOverrides ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expandedOverrides ? 'Hide' : 'Set'} per-staff allowances and deductions
              </button>

              {expandedOverrides && (
                <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Staff</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Base Salary</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Allowances (+)</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Deductions (−)</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.map(s => {
                        const ov = overrides[s.id] ?? { allowances: '0', deductions: '0', note: '' };
                        const net = s.salary + (parseFloat(ov.allowances) || 0) - (parseFloat(ov.deductions) || 0);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                              <p className="text-xs text-slate-500">{s.designation}</p>
                            </td>
                            <td className="px-4 py-2 text-slate-600">{s.salary.toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number" min="0"
                                value={ov.allowances}
                                onChange={e => setOverrides(prev => ({
                                  ...prev,
                                  [s.id]: { ...ov, allowances: e.target.value }
                                }))}
                                className="w-24 px-2 py-1 border border-slate-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number" min="0"
                                value={ov.deductions}
                                onChange={e => setOverrides(prev => ({
                                  ...prev,
                                  [s.id]: { ...ov, deductions: e.target.value }
                                }))}
                                className="w-24 px-2 py-1 border border-slate-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${net < s.salary ? 'text-red-600' : net > s.salary ? 'text-green-600' : 'text-slate-800'}`}>
                              {net.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowProcessModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
                <button
                  onClick={handleProcessSalary}
                  disabled={processing}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {processing ? 'Processing…' : `Process ${staff.length} Staff`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}