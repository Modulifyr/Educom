import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { LedgerEntry } from '../../types';
import { Receipt, Plus, ArrowDownCircle, ArrowUpCircle, X, Save } from 'lucide-react';

interface LedgerFormData {
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  voucherType: string;
  voucherNumber: string;
  debit: string;
  credit: string;
}

const initialFormData: LedgerFormData = {
  date: new Date().toISOString().split('T')[0],
  accountCode: '',
  accountName: '',
  description: '',
  voucherType: 'receipt',
  voucherNumber: '',
  debit: '',
  credit: ''
};

export function LedgerModule() {
  const { db, hasPermission, currentUser } = useAppStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<LedgerFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = await db.ledger.generateFinancialReport(startDate, endDate);
    setEntries(data);
    setLoading(false);
  }, [db, startDate, endDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSave = async () => {
    if (!db) return;
    if (!formData.accountCode || !formData.accountName || (!formData.debit && !formData.credit)) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const balance = Number(formData.credit) - Number(formData.debit);
      await db.ledger.create({
        date: formData.date,
        accountCode: formData.accountCode,
        accountName: formData.accountName,
        description: formData.description,
        voucherType: formData.voucherType,
        voucherNumber: formData.voucherNumber || `V-${Date.now()}`,
        debit: Number(formData.debit) || 0,
        credit: Number(formData.credit) || 0,
        balance,
        createdBy: currentUser?.username || 'system'
      });
      setShowModal(false);
      setFormData(initialFormData);
      loadEntries();
    } catch (error) {
      console.error('Error saving ledger entry:', error);
      alert('Failed to save ledger entry');
    }
    setSaving(false);
  };

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const canCreate = hasPermission('ledger:create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Financial Ledger</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Entry
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Debit</p>
              <p className="text-2xl font-bold text-red-600">${totalDebit.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Credit</p>
              <p className="text-2xl font-bold text-green-600">${totalCredit.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-2xl font-bold text-slate-800">${(totalCredit - totalDebit).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="self-center text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={loadEntries}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Filter
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No ledger entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Account</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Debit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Credit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{entry.date}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-slate-800">{entry.accountName}</div>
                      <div className="text-xs text-slate-500">{entry.accountCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">
                      ${entry.balance.toLocaleString()}
                    </td>
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
              <h2 className="text-xl font-semibold text-slate-800">Add Ledger Entry</h2>
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
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Account Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., CA-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Cash, Bank, Fees Received"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter transaction description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voucher Type</label>
                  <select
                    value={formData.voucherType}
                    onChange={e => setFormData({ ...formData, voucherType: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="receipt">Receipt</option>
                    <option value="payment">Payment</option>
                    <option value="journal">Journal</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voucher Number</label>
                  <input
                    type="text"
                    value={formData.voucherNumber}
                    onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Debit Amount</label>
                  <input
                    type="number"
                    value={formData.debit}
                    onChange={e => setFormData({ ...formData, debit: e.target.value, credit: e.target.value ? '' : formData.credit })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Credit Amount</label>
                  <input
                    type="number"
                    value={formData.credit}
                    onChange={e => setFormData({ ...formData, credit: e.target.value, debit: e.target.value ? '' : formData.debit })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
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
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}