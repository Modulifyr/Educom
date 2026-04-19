import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { LedgerEntry } from '../../types';
import { Receipt, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export function LedgerModule() {
  const { db, hasPermission } = useAppStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Financial Ledger</h1>
        {hasPermission('ledger:create') && (
          <button
            onClick={() => {}}
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Voucher</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Debit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Credit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="font-medium">{entry.accountCode}</span>
                      <br />
                      <span className="text-slate-500">{entry.accountName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.voucherType}-{entry.voucherNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-800">
                      ${entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">Totals:</td>
                  <td className="px-4 py-3 text-right text-red-600">${totalDebit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">${totalCredit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-800">${(totalCredit - totalDebit).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
