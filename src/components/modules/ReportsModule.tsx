import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { invoke } from '@tauri-apps/api/core';
import { Download, BarChart3, Users, DollarSign, FileText } from 'lucide-react';

type ReportType = 'attendance' | 'fees' | 'salary' | 'exams';

interface AttendanceRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  grade: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
}

interface FeeRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  grade: string;
  feeType: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
}

interface SalaryRow {
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
  status: string;
}

interface ExamRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  grade: string;
  courseName: string;
  courseCode: string;
  examType: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  gradeLetter: string;
}

export function ReportsModule() {
  const { db } = useAppStore();
  const [activeReport, setActiveReport] = useState<ReportType>('attendance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attendance filters
  const [attStartDate, setAttStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [attEndDate, setAttEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [attGrade, setAttGrade] = useState('');
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);

  // Fee filters
  const [feeYear, setFeeYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [feeGrade, setFeeGrade] = useState('');
  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);

  // Salary filters
  const [salMonth, setSalMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salRows, setSalRows] = useState<SalaryRow[]>([]);

  // Exam filters
  const [examType, setExamType] = useState('');
  const [examRows, setExamRows] = useState<ExamRow[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchAttendance = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await invoke<AttendanceRow[]>('get_attendance_report', {
        startDate: attStartDate,
        endDate: attEndDate,
        grade: attGrade || null,
      });
      setAttRows(rows);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [attStartDate, attEndDate, attGrade]);

  const fetchFees = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await invoke<FeeRow[]>('get_fee_report', {
        academicYear: feeYear,
        grade: feeGrade || null,
      });
      setFeeRows(rows);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [feeYear, feeGrade]);

  const fetchSalary = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [year, month] = salMonth.split('-');
      const rows = await invoke<SalaryRow[]>('get_salary_with_staff', {
        month,
        year: parseInt(year),
        status: null,
      });
      setSalRows(rows);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [salMonth]);

  const fetchExams = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await invoke<ExamRow[]>('get_exam_report', {
        courseId: null,
        examType: examType || null,
      });
      setExamRows(rows);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [examType]);

  // ── CSV Export ─────────────────────────────────────────────────────────

  const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAttendanceCSV = () => exportCSV(
    `attendance_${attStartDate}_${attEndDate}.csv`,
    ['Admission#', 'Student Name', 'Grade', 'Total Days', 'Present', 'Absent', 'Late', 'Attendance%'],
    attRows.map(r => [
      r.admissionNumber, r.studentName, r.grade,
      String(r.totalDays), String(r.presentDays),
      String(r.absentDays), String(r.lateDays),
      String(r.attendancePercent),
    ])
  );

  const exportFeeCSV = () => exportCSV(
    `fees_${feeYear}.csv`,
    ['Admission#', 'Student Name', 'Grade', 'Fee Type', 'Total', 'Paid', 'Pending', 'Status'],
    feeRows.map(r => [
      r.admissionNo, r.studentName, r.grade, r.feeType,
      String(r.totalAmount), String(r.paidAmount),
      String(r.pendingAmount), r.status,
    ])
  );

  const exportSalaryCSV = () => exportCSV(
    `salary_${salMonth}.csv`,
    ['Staff Name', 'Designation', 'Department', 'Base', 'Allowances', 'Deductions', 'Net', 'Status'],
    salRows.map(r => [
      r.staffName, r.designation, r.department,
      String(r.baseSalary), String(r.allowances),
      String(r.deductions), String(r.netSalary), r.status,
    ])
  );

  const exportExamCSV = () => exportCSV(
    `exams_${examType || 'all'}.csv`,
    ['Admission#', 'Student Name', 'Grade', 'Course', 'Exam Type', 'Marks', 'Max', 'Percentage', 'Grade'],
    examRows.map(r => [
      r.admissionNumber, r.studentName, r.grade,
      r.courseName, r.examType,
      String(r.marks), String(r.maxMarks),
      String(r.percentage), r.gradeLetter,
    ])
  );

  // ── Summary helpers ────────────────────────────────────────────────────

  const attBelow75 = attRows.filter(r => r.attendancePercent < 75).length;
  const feeTotalPending = feeRows.reduce((s, r) => s + r.pendingAmount, 0);
  const feeTotalPaid = feeRows.reduce((s, r) => s + r.paidAmount, 0);
  const salTotalNet = salRows.reduce((s, r) => s + r.netSalary, 0);
  const examPassRate = examRows.length
    ? ((examRows.filter(r => r.percentage >= 40).length / examRows.length) * 100).toFixed(1)
    : null;
  const examAvgPct = examRows.length
    ? (examRows.reduce((s, r) => s + r.percentage, 0) / examRows.length).toFixed(1)
    : null;

  const tabs: { id: ReportType; label: string; icon: typeof BarChart3 }[] = [
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'fees',       label: 'Fee Collection', icon: DollarSign },
    { id: 'salary',     label: 'Payroll', icon: BarChart3 },
    { id: 'exams',      label: 'Examinations', icon: FileText },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveReport(id); setError(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeReport === id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Attendance Report ────────────────────────────────────────────── */}
      {activeReport === 'attendance' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={attStartDate}
                onChange={e => setAttStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={attEndDate}
                onChange={e => setAttEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Grade / Semester</label>
              <input type="text" value={attGrade} placeholder="All"
                onChange={e => setAttGrade(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={fetchAttendance} disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Loading…' : 'Generate'}
            </button>
            {attRows.length > 0 && (
              <button onClick={exportAttendanceCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
            )}
          </div>

          {attRows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Stat label="Students Reported" value={String(attRows.length)} />
                <Stat label="Below 75% Attendance" value={String(attBelow75)} highlight={attBelow75 > 0 ? 'red' : undefined} />
                <Stat label="Avg Attendance"
                  value={`${(attRows.reduce((s, r) => s + r.attendancePercent, 0) / attRows.length).toFixed(1)}%`} />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Adm#', 'Name', 'Grade', 'Total Days', 'Present', 'Absent', 'Late', 'Attendance%'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attRows.map(r => (
                      <tr key={r.studentId} className={r.attendancePercent < 75 ? 'bg-red-50' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2 text-slate-500">{r.admissionNumber}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{r.studentName}</td>
                        <td className="px-4 py-2 text-slate-600">{r.grade}</td>
                        <td className="px-4 py-2 text-slate-600">{r.totalDays}</td>
                        <td className="px-4 py-2 text-green-700">{r.presentDays}</td>
                        <td className="px-4 py-2 text-red-600">{r.absentDays}</td>
                        <td className="px-4 py-2 text-amber-600">{r.lateDays}</td>
                        <td className="px-4 py-2">
                          <span className={`font-semibold ${
                            r.attendancePercent >= 75 ? 'text-green-700' : 'text-red-600'
                          }`}>
                            {r.attendancePercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Fee Report ───────────────────────────────────────────────────── */}
      {activeReport === 'fees' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Academic Year</label>
              <input type="text" value={feeYear}
                onChange={e => setFeeYear(e.target.value)}
                placeholder="2024-2025"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Grade / Semester</label>
              <input type="text" value={feeGrade} placeholder="All"
                onChange={e => setFeeGrade(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={fetchFees} disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Loading…' : 'Generate'}
            </button>
            {feeRows.length > 0 && (
              <button onClick={exportFeeCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
            )}
          </div>

          {feeRows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Stat label="Total Billed" value={`NPR ${(feeTotalPaid + feeTotalPending).toLocaleString()}`} />
                <Stat label="Collected" value={`NPR ${feeTotalPaid.toLocaleString()}`} highlight="green" />
                <Stat label="Pending" value={`NPR ${feeTotalPending.toLocaleString()}`} highlight={feeTotalPending > 0 ? 'red' : undefined} />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Adm#', 'Name', 'Grade', 'Fee Type', 'Total', 'Paid', 'Pending', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500">{r.admissionNo}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{r.studentName}</td>
                        <td className="px-4 py-2 text-slate-600">{r.grade}</td>
                        <td className="px-4 py-2 text-slate-600">{r.feeType}</td>
                        <td className="px-4 py-2 text-slate-700">{r.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-green-700">{r.paidAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-red-600">{r.pendingAmount.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === 'paid'    ? 'bg-green-100 text-green-700' :
                            r.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                                     'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Salary Report ────────────────────────────────────────────────── */}
      {activeReport === 'salary' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
              <input type="month" value={salMonth}
                onChange={e => setSalMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={fetchSalary} disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Loading…' : 'Generate'}
            </button>
            {salRows.length > 0 && (
              <button onClick={exportSalaryCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
            )}
          </div>

          {salRows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Stat label="Total Payroll" value={`NPR ${salTotalNet.toLocaleString()}`} />
                <Stat label="Staff Count" value={String(salRows.length)} />
                <Stat label="Pending Payment" value={String(salRows.filter(r => r.status === 'pending').length)}
                  highlight={salRows.some(r => r.status === 'pending') ? 'red' : undefined} />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Name', 'Designation', 'Dept', 'Base', 'Allowances', 'Deductions', 'Net', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salRows.map(r => (
                      <tr key={r.staffId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{r.staffName}</td>
                        <td className="px-4 py-2 text-slate-600">{r.designation}</td>
                        <td className="px-4 py-2 text-slate-600">{r.department}</td>
                        <td className="px-4 py-2 text-slate-700">{r.baseSalary.toLocaleString()}</td>
                        <td className="px-4 py-2 text-green-700">+{r.allowances.toLocaleString()}</td>
                        <td className="px-4 py-2 text-red-600">-{r.deductions.toLocaleString()}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{r.netSalary.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-semibold text-slate-700">Total</td>
                      <td className="px-4 py-3 font-semibold">{salRows.reduce((s, r) => s + r.baseSalary, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">+{salRows.reduce((s, r) => s + r.allowances, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">-{salRows.reduce((s, r) => s + r.deductions, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{salTotalNet.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Exam Report ──────────────────────────────────────────────────── */}
      {activeReport === 'exams' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Exam Type</label>
              <select value={examType} onChange={e => setExamType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All types</option>
                <option value="quiz">Quiz</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
            <button onClick={fetchExams} disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Loading…' : 'Generate'}
            </button>
            {examRows.length > 0 && (
              <button onClick={exportExamCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
            )}
          </div>

          {examRows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Stat label="Total Records" value={String(examRows.length)} />
                <Stat label="Pass Rate (≥40%)" value={examPassRate ? `${examPassRate}%` : '-'}
                  highlight={parseFloat(examPassRate ?? '100') < 60 ? 'red' : 'green'} />
                <Stat label="Class Average" value={examAvgPct ? `${examAvgPct}%` : '-'} />
              </div>

              {/* Grade distribution bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Grade Distribution</p>
                <div className="flex gap-2 flex-wrap">
                  {(['A+','A','B+','B','C','D','F'] as const).map(g => {
                    const count = examRows.filter(r => r.gradeLetter === g).length;
                    const pct = examRows.length ? (count / examRows.length * 100).toFixed(0) : 0;
                    const color = g === 'F' ? 'bg-red-500' : g.startsWith('A') ? 'bg-green-500' : g.startsWith('B') ? 'bg-blue-500' : g === 'C' ? 'bg-amber-400' : 'bg-orange-400';
                    return (
                      <div key={g} className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                        <div className={`w-8 ${color} rounded`} style={{ height: `${Math.max(4, Number(pct))}px` }} />
                        <span className="text-xs font-bold text-slate-700">{g}</span>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Adm#', 'Name', 'Grade', 'Course', 'Type', 'Marks', 'Max', '%', 'Letter'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examRows.map((r, i) => (
                      <tr key={i} className={r.percentage < 40 ? 'bg-red-50' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2 text-slate-500">{r.admissionNumber}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{r.studentName}</td>
                        <td className="px-4 py-2 text-slate-600">{r.grade}</td>
                        <td className="px-4 py-2 text-slate-600">{r.courseCode} {r.courseName}</td>
                        <td className="px-4 py-2 text-slate-600 capitalize">{r.examType}</td>
                        <td className="px-4 py-2 text-slate-700">{r.marks}</td>
                        <td className="px-4 py-2 text-slate-500">{r.maxMarks}</td>
                        <td className="px-4 py-2">
                          <span className={`font-semibold ${r.percentage >= 75 ? 'text-green-700' : r.percentage >= 40 ? 'text-slate-700' : 'text-red-600'}`}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800">{r.gradeLetter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: 'red' | 'green';
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${
        highlight === 'red' ? 'text-red-600' :
        highlight === 'green' ? 'text-green-600' :
        'text-slate-800'
      }`}>
        {value}
      </p>
    </div>
  );
}