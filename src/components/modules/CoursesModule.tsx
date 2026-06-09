import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Course, Staff } from '../../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface CourseFormData {
  code: string;
  name: string;
  description: string;
  credits: string;
  classId: string;
  teacherId: string;
}

const initialFormData: CourseFormData = {
  code: '',
  name: '',
  description: '',
  credits: '',
  classId: '1',
  teacherId: ''
};

export function CoursesModule() {
  const { db, hasPermission } = useAppStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

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
    if (!db || !confirm('Are you sure you want to delete this course?')) return;
    await db.courses.delete(id);
    loadData();
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      credits: String(course.credits),
      classId: course.classId,
      teacherId: course.teacherId || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!db) return;
    if (!formData.code || !formData.name || !formData.credits) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        await db.courses.update(editingCourse.id, {
          name: formData.name,
          description: formData.description || undefined,
          credits: Number(formData.credits),
          classId: formData.classId,
          teacherId: formData.teacherId || undefined
        });
      } else {
        await db.courses.create({
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          credits: Number(formData.credits),
          classId: formData.classId,
          teacherId: formData.teacherId || undefined
        });
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    }
    setSaving(false);
  };

  const canEdit = hasPermission('courses:edit');
  const canDelete = hasPermission('courses:delete');
  const canCreate = hasPermission('courses:create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Course Management</h1>
        {canCreate && (
          <button
            onClick={openAddModal}
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
                  {(canEdit || canDelete) && (
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
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(course)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
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
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., MATH101"
                    disabled={!!editingCourse}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credits <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={e => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="1">Class 1</option>
                    <option value="2">Class 2</option>
                    <option value="3">Class 3</option>
                    <option value="4">Class 4</option>
                    <option value="5">Class 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Teacher</label>
                  <select
                    value={formData.teacherId}
                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Teacher</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter course description"
                />
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
                {saving ? 'Saving...' : 'Save Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}