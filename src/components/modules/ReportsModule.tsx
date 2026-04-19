import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  ClipboardCheck,
  CreditCard,
  DollarSign,
  Package,
  FileText,
  BarChart3,
  Download,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import type { UserRole } from '../../types';

export function ReportsModule() {
  const { db, currentUser, hasPermission } = useAppStore();
  const [reportType, setReportType] = useState('attendance');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);

  const reportTypes: { id: string; label: string; icon: typeof ClipboardCheck; permission: string; allowedRoles: UserRole[] }[] = [
    { 
      id: 'attendance', 
      label: 'Attendance Summary', 
      icon: ClipboardCheck,
      permission: 'attendance:view',
      allowedRoles: ['admin', 'management', 'teacher']
    },
    { 
      id: 'fees', 
      label: 'Fee Collection Report', 
      icon: CreditCard,
      permission: 'fees:view',
      allowedRoles: ['admin', 'management', 'finance']
    },
    { 
      id: 'salary', 
      label: 'Salary Report', 
      icon: DollarSign,
      permission: 'salary:view',
      allowedRoles: ['admin', 'management', 'finance']
    },
    { 
      id: 'inventory', 
      label: 'Inventory Report', 
      icon: Package,
      permission: 'inventory:view',
      allowedRoles: ['admin', 'management', 'finance']
    },
    { 
      id: 'exam', 
      label: 'Examination Results', 
      icon: FileText,
      permission: 'exams:view',
      allowedRoles: ['admin', 'management', 'teacher']
    },
    { 
      id: 'financial', 
      label: 'Financial Summary', 
      icon: BarChart3,
      permission: 'ledger:view',
      allowedRoles: ['admin', 'management', 'finance']
    }
  ];

  const accessibleReports = reportTypes.filter(r => r.allowedRoles.includes(currentUser?.role as UserRole));

  if (accessibleReports.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Reports and Analytics</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Access Restricted</h2>
          <p className="text-slate-500">Your role does not have permission to view any reports.</p>
        </div>
      </div>
    );
  }

  const canExport = hasPermission('reports:export');

  const handleGenerate = async (format: 'csv' | 'xlsx') => {
    if (!db) return;
    setGenerating(true);

    try {
      let data: unknown[] = [];
      
      switch (reportType) {
        case 'attendance':
          data = await db.attendance.getByDateRange(startDate, endDate);
          break;
        case 'fees':
          data = await db.fees.getAll({ academicYear: '2024-2025' });
          break;
        case 'salary':
          data = await db.salary.getAll();
          break;
        case 'inventory':
          data = await db.inventory.getAll();
          break;
        case 'exam':
          data = await db.exams.getAll();
          break;
        case 'financial':
          data = await db.ledger.generateFinancialReport(startDate, endDate);
          break;
      }

      const { importExportService } = await import('../../services/importExport');
      await importExportService.exportData(data, {
        format,
        filename: `${reportType}_report_${endDate}`,
        sheetName: reportType.charAt(0).toUpperCase() + reportType.slice(1)
      });
    } catch (error) {
      console.error('Report generation error:', error);
    }

    setGenerating(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports and Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {accessibleReports.map(type => {
              const Icon = type.icon;
              const isSelected = reportType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary-600' : 'text-slate-500'}`} />
                  <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Options</h2>
          
          {(reportType === 'attendance' || reportType === 'financial') && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Export Format</label>
            {!canExport ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Lock size={16} />
                You do not have permission to export reports
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleGenerate('csv')}
                  disabled={generating}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  CSV
                </button>
                <button
                  onClick={() => handleGenerate('xlsx')}
                  disabled={generating}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  XLSX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Statistics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="text-2xl font-bold text-slate-800">-</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">This Month</p>
            <p className="text-2xl font-bold text-slate-800">-</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Growth</p>
            <p className="text-2xl font-bold text-green-600">-</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Last Updated</p>
            <p className="text-2xl font-bold text-slate-800">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}
