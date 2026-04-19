import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { ExamRecord, Student, Course } from '../../types';
import { FileText, Plus, Edit2 } from 'lucide-react';

export function ExamsModule() {
  const { db, hasPermission } = useAppStore();
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const [examData, studentData, courseData] = await Promise.all([
      db.exams.getAll(filterCourse ? { courseId: filterCourse } : undefined),
      db.students.getAll(),
      db.courses.getAll()
    ]);
    setRecords(examData);
    setStudents(studentData);
    setCourses(courseData);
    setLoading(false);
  }, [db, filterCourse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const averageScore = records.length > 0
    ? records.reduce((sum, r) => sum + (r.marks / r.maxMarks * 100), 0) / records.length
    : 0;

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Examination and Grading</h1>
        {hasPermission('exams:create') && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Exam Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="text-2xl font-bold text-slate-800">{records.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Class Average</p>
              <p className="text-2xl font-bold text-primary-600">{averageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pass Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {records.length > 0
                  ? ((records.filter(r => (r.marks / r.maxMarks * 100) >= 50).length / records.length) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No exam records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Marks</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Percentage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Grade</th>
                  {hasPermission('exams:grade') && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map(record => {
                  const student = students.find(s => s.id === record.studentId);
                  const course = courses.find(c => c.id === record.courseId);
                  const percentage = (record.marks / record.maxMarks) * 100;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {student ? `${student.firstName} ${student.lastName}` : record.studentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{course?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 capitalize">{record.examType}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{record.marks}/{record.maxMarks}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{percentage.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          percentage >= 60 ? 'bg-green-100 text-green-700' :
                          percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getGrade(percentage)}
                        </span>
                      </td>
                      {hasPermission('exams:grade') && (
                        <td className="px-4 py-3 text-right">
                          <button className="p-2 text-primary-600 hover:bg-primary-50 rounded">
                            <Edit2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
