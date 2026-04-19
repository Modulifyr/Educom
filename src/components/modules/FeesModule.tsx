import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { FeeRecord, Student } from '../../types';
import { CreditCard, DollarSign, Plus } from 'lucide-react';

export function FeesModule() {
  const { db, hasPermission } = useAppStore();
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('2024-2025');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const filters: { status?: string; academicYear?: string } = { academicYear: filterAcademicYear };
    if (filterStatus) filters.status = filterStatus;
    const [feeData, studentData] = await Promise.all([
      db.fees.getAll(filters),
      db.students.getAll()
    ]);
    setRecords(feeData);
    setStudents(studentData);
    setLoading(false);
  }, [db, filterStatus, filterAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordPayment = async (amount: number) => {
    if (!db || !selectedRecord) return;
    await db.fees.recordPayment(selectedRecord.id, amount);
    setShowPaymentModal(false);
    setSelectedRecord(null);
    loadData();
  };

  const totalPending = records.filter(r => r.status === 'pending' || r.status === 'overdue').reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);
  const totalCollected = records.filter(r => r.status === 'paid' || r.status === 'partial').reduce((sum, r) => sum + r.paidAmount, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Fee Collection</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Pending</p>
              <p className="text-2xl font-bold text-red-600">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">${totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="text-2xl font-bold text-slate-600">{records.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <select
            value={filterAcademicYear}
            onChange={e => setFilterAcademicYear(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No fee records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Fee Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map(record => {
                  const student = students.find(s => s.id === record.studentId);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {student ? `${student.firstName} ${student.lastName}` : record.studentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.feeType}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">${record.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-green-600">${record.paidAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'paid' ? 'bg-green-100 text-green-700' :
                          record.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                          record.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPermission('fees:record_payment') && record.status !== 'paid' && (
                          <button
                            onClick={() => { setSelectedRecord(record); setShowPaymentModal(true); }}
                            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                          >
                            Record Payment
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

      {showPaymentModal && selectedRecord && (
        <PaymentModal
          record={selectedRecord}
          onClose={() => { setShowPaymentModal(false); setSelectedRecord(null); }}
          onSubmit={handleRecordPayment}
        />
      )}
    </div>
  );
}

function PaymentModal({ record, onClose, onSubmit }: {
  record: FeeRecord;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(record.amount - record.paidAmount);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
        <p className="text-slate-600 mb-4">
          Remaining balance: ${(record.amount - record.paidAmount).toLocaleString()}
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, Math.min(parseFloat(e.target.value) || 0, record.amount - record.paidAmount)))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
            Cancel
          </button>
          <button onClick={() => onSubmit(amount)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
