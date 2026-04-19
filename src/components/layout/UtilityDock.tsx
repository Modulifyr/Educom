import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/appStore';
import {
  Upload,
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import type { Student, Staff, AttendanceRecord, InventoryItem, FeeRecord } from '../../types';

export function UtilityDock() {
  const { db, activeModule, syncStatus, triggerSync } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [lastImportResult, setLastImportResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (!file) return;
    
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setImportProgress('Invalid file type. Please use XLSX, XLS, or CSV files.');
      setTimeout(() => setImportProgress(null), 3000);
      return;
    }
    
    setImportProgress('Parsing file...');
    
    try {
      const { importExportService } = await import('../../services/importExport');
      const { headers, data } = await importExportService.parseSpreadsheet(file);
      const moduleKey = activeModule as 'students' | 'staff' | 'attendance' | 'inventory' | 'fees';
      const mappings = importExportService.autoMapColumns(headers, moduleKey);
      const transformed = importExportService.transformData(data, mappings);
      
      setImportProgress('Importing records...');
      
      let count = 0;
      if (db) {
        switch (moduleKey) {
          case 'students':
            count = await db.students.bulkImport(transformed as Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]);
            break;
          case 'staff':
            count = await db.staff.bulkImport(transformed as Omit<Staff, 'id' | 'createdAt'>[]);
            break;
          case 'attendance':
            count = await db.attendance.bulkCreate(transformed as Omit<AttendanceRecord, 'id' | 'createdAt'>[]);
            break;
          case 'inventory':
            count = await db.inventory.bulkImport(transformed as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]);
            break;
          case 'fees':
            count = await db.fees.bulkImport(transformed as Omit<FeeRecord, 'id' | 'createdAt'>[]);
            break;
        }
      }
      
      setImportProgress(null);
      setLastImportResult({ success: true, count });
      setTimeout(() => setLastImportResult(null), 5000);
    } catch {
      setImportProgress(null);
      setLastImportResult({ success: false, count: 0 });
    }
  }, [db, activeModule]);

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'json') => {
    if (!db) return;
    
    setExportProgress('Preparing export...');
    
    try {
      let data: unknown[] = [];
      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (activeModule) {
        case 'students':
          data = await db.students.getAll();
          break;
        case 'staff':
          data = await db.staff.getAll();
          break;
        case 'attendance':
          data = await db.attendance.getAll();
          break;
        case 'salary':
          data = await db.salary.getAll();
          break;
        case 'fees':
          data = await db.fees.getAll();
          break;
        case 'inventory':
          data = await db.inventory.getAll();
          break;
        case 'courses':
          data = await db.courses.getAll();
          break;
        case 'exams':
          data = await db.exams.getAll();
          break;
        case 'ledger':
          data = await db.ledger.getAll();
          break;
        default:
          data = [];
      }
      
      const { importExportService } = await import('../../services/importExport');
      await importExportService.exportData(data, {
        format,
        filename: `${activeModule}_export_${timestamp}`,
        sheetName: activeModule.charAt(0).toUpperCase() + activeModule.slice(1)
      });
      setExportProgress(null);
    } catch {
      setExportProgress(null);
    }
  }, [db, activeModule]);

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between gap-6">
        <div
          className={clsx(
            'flex-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
            isDragging ? 'border-primary-400 bg-primary-400/10' : 'border-slate-600 hover:border-slate-500'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-center gap-3">
            <Upload className={clsx('w-6 h-6', isDragging ? 'text-primary-400' : 'text-slate-400')} />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">
                {isDragging ? 'Drop file to import' : 'Drag and drop spreadsheet here'}
              </p>
              <p className="text-xs text-slate-400">Supports XLSX, XLS, CSV formats</p>
            </div>
          </div>
          {importProgress && (
            <p className="mt-2 text-sm text-primary-400 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {importProgress}
            </p>
          )}
          {lastImportResult && (
            <p className={clsx('mt-2 text-sm flex items-center gap-2', lastImportResult.success ? 'text-green-400' : 'text-red-400')}>
              {lastImportResult.success ? (
                <><CheckCircle className="w-4 h-4" /> Imported {lastImportResult.count} records</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Import failed</>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Export:</span>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            XLSX
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-600 pl-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">Sync Status</p>
            <p className={clsx(
              'text-sm font-medium flex items-center gap-1',
              syncStatus.syncState === 'idle' ? 'text-green-400' :
              syncStatus.syncState === 'syncing' ? 'text-yellow-400' : 'text-red-400'
            )}>
              {syncStatus.syncState === 'idle' && <><CheckCircle className="w-4 h-4" /> Synced</>}
              {syncStatus.syncState === 'syncing' && <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>}
              {syncStatus.syncState === 'error' && <><AlertCircle className="w-4 h-4" /> Error</>}
            </p>
            {syncStatus.pendingChanges > 0 && (
              <p className="text-xs text-slate-500">{syncStatus.pendingChanges} pending</p>
            )}
          </div>
          <button
            onClick={triggerSync}
            disabled={syncStatus.syncState === 'syncing'}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Now
          </button>
        </div>
      </div>
      {exportProgress && (
        <div className="mt-2 text-sm text-center text-slate-400 flex items-center justify-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          {exportProgress}
        </div>
      )}
    </div>
  );
}
