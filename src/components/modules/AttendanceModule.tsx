import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { AttendanceRecord } from '../../types';
import { format } from 'date-fns';
import { Users, UserCheck, UserX, Calendar } from 'lucide-react';

export function AttendanceModule() {
  const { db } = useAppStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'student' | 'staff'>('student');

  const loadRecords = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = await db.attendance.getAll({ date: selectedDate });
    setRecords(data);
    setLoading(false);
  }, [db, selectedDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const stats = {
    present: records.filter(r => r.status === 'present' || r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    total: records.length
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <div className="flex gap-3">
          <div className="flex bg-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('student')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'student' ? 'bg-white shadow text-primary-600' : 'text-slate-600'
              }`}
            >
              <Users size={16} />
              Student
            </button>
            <button
              onClick={() => setViewMode('staff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'staff' ? 'bg-white shadow text-primary-600' : 'text-slate-600'
              }`}
            >
              <UserCheck size={16} />
              Staff
            </button>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Present</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-600">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Attendance for {selectedDate}</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No attendance records for this date
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Remarks</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {viewMode === 'student' ? record.studentId : record.staffId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {viewMode === 'student' ? 'Student' : 'Staff'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === 'present' ? 'bg-green-100 text-green-700' :
                        record.status === 'absent' ? 'bg-red-100 text-red-700' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.remarks || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.recordedBy}</td>
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
