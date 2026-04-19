import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Course, Staff } from '../../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function CoursesModule() {
  const { db, hasPermission } = useAppStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const [courseData, staffData] = await Promise.all([
      db.courses.getAll(filterClass ? { classId: filterClass } : undefined),
      db.staff.getAll({ department: 'Academic' })
    ]);
    setCourses(courseData);
    setStaff(staffData);
    setLoading(false);
  }, [db, filterClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Are you sure?')) return;
    await db.courses.delete(id);
    loadData();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Course Management</h1>
        {hasPermission('courses:create') && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Course
          </button>
        )}
      </div>

      <div className="mb-4">
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Classes</option>
          <option value="1">Class 1</option>
          <option value="2">Class 2</option>
          <option value="3">Class 3</option>
          <option value="4">Class 4</option>
          <option value="5">Class 5</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No courses found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Credits</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Teacher</th>
                  {(hasPermission('courses:edit') || hasPermission('courses:delete')) && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {courses.map(course => {
                  const teacher = staff.find(s => s.id === course.teacherId);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{course.code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{course.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">Class {course.classId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{course.credits}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {teacher ? `${teacher.firstName} ${teacher.lastName}` : '-'}
                      </td>
                      {(hasPermission('courses:edit') || hasPermission('courses:delete')) && (
                        <td className="px-4 py-3 text-right">
                          {hasPermission('courses:edit') && (
                            <button
                              onClick={() => {}}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {hasPermission('courses:delete') && (
                            <button
                              onClick={() => handleDelete(course.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
