import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Student, Stream, InstitutionType } from '../../types';
import { Plus, Search, Filter, Edit2, Trash2, X, Save } from 'lucide-react';

interface StudentFormData {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  rollNumber: string;
  enrollmentDate: string;
  // Grade (school) or Semester (college/university) — mutually exclusive per institution type
  grade: string;
  semester: string;
  section: string;
  stream: Stream;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  parentName: string;
  parentPhone: string;
  address: string;
}

const emptyForm = (): StudentFormData => ({
  firstName: '',
  lastName: '',
  admissionNumber: '',
  rollNumber: '',
  enrollmentDate: new Date().toISOString().split('T')[0],
  grade: '',
  semester: '',
  section: '',
  stream: 'none',
  dateOfBirth: '',
  gender: 'male',
  parentName: '',
  parentPhone: '',
  address: '',
});

// Grade labels for schools (Grades 1-12)
const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
// Semester options for colleges/universities
const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => String(i + 1));

function gradeLabel(instType: InstitutionType) {
  return instType === 'school' ? 'Grade' : 'Year/Level';
}

export function StudentsModule() {
  const { db, hasPermission } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Institution type drives which fields are visible
  const [instType, setInstType] = useState<InstitutionType>('school');

  // Load institution settings once
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const s = await invoke<{ institutionType: InstitutionType }>('get_institution_settings');
        setInstType(s.institutionType ?? 'school');
      } catch {
        // default school
      }
    };
    loadSettings();
  }, []);

  const isSchool = instType === 'school';
  const isCollege = instType === 'college' || instType === 'university';

  const loadStudents = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const data = await db.students.getAll(filterGrade ? { classId: filterGrade } : undefined);
      setStudents(data);
    } finally {
      setLoading(false);
    }
  }, [db, filterGrade]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Delete this student? This cannot be undone.')) return;
    await db.students.delete(id);
    loadStudents();
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData(emptyForm());
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber ?? '',
      enrollmentDate: student.enrollmentDate ?? '',
      grade: student.grade ?? student.classId ?? '',
      semester: student.semester ?? '',
      section: student.section ?? '',
      stream: student.stream ?? 'none',
      dateOfBirth: student.dateOfBirth ?? '',
      gender: student.gender ?? 'male',
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      address: student.address ?? '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const validate = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.admissionNumber.trim()) return 'Admission number is required';
    if (!formData.enrollmentDate) return 'Enrollment date is required';
    if (isSchool && !formData.grade) return 'Grade is required';
    if (isCollege && !formData.semester) return 'Semester is required';
    return null;
  };

  const handleSave = async () => {
    if (!db) return;
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSaving(true);

    // classId mirrors grade for DB compatibility
    const classId = isSchool ? formData.grade : formData.semester;

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        admissionNumber: formData.admissionNumber.trim(),
        rollNumber: formData.rollNumber || undefined,
        enrollmentDate: formData.enrollmentDate,
        classId,
        grade: isSchool ? formData.grade : undefined,
        semester: isCollege ? formData.semester : undefined,
        section: formData.section || undefined,
        stream: (isSchool && (formData.grade === '11' || formData.grade === '12'))
          ? formData.stream : 'none' as Stream,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender,
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        address: formData.address.trim(),
      };

      if (editingStudent) {
        await db.students.update(editingStudent.id, payload);
      } else {
        await db.students.create(payload);
      }
      setShowModal(false);
      loadStudents();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save student');
    }
    setSaving(false);
  };

  const filtered = students.filter(s => {
    const search = searchTerm.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.admissionNumber.toLowerCase().includes(search)
    );
  });

  // Unique grade/semester values for the filter dropdown
  const gradeValues = [...new Set(students.map(s => s.grade ?? s.classId).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );

  const showStream = isSchool && (formData.grade === '11' || formData.grade === '12');
  const canEdit = hasPermission('students:edit');
  const canDelete = hasPermission('students:delete');
  const canCreate = hasPermission('students:create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Students</h1>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Student
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or admission number…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="">All {isSchool ? 'Grades' : 'Semesters'}</option>
              {gradeValues.map(g => (
                <option key={g} value={g}>
                  {isSchool ? `Grade ${g}` : `Semester ${g}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Admission #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    {isSchool ? 'Grade' : 'Semester'}
                  </th>
                  {isSchool && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Section</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Enrolled</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Parent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Phone</th>
                  {(canEdit || canDelete) && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{student.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {isSchool
                        ? `Grade ${student.grade ?? student.classId}`
                        : `Sem ${student.semester ?? student.classId}`}
                    </td>
                    {isSchool && (
                      <td className="px-4 py-3 text-sm text-slate-600">{student.section ?? '-'}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {student.enrollmentDate ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.parentName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.parentPhone}</td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <button onClick={() => openEditModal(student)} className="p-2 text-primary-600 hover:bg-primary-50 rounded">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(student.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="First name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Last name" />
                </div>
              </div>

              {/* Admission + Enrollment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.admissionNumber}
                    onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. STU-2024-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Enrollment Date <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={formData.enrollmentDate}
                    onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              {/* Grade/Semester + Section + Roll */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {gradeLabel(instType)} <span className="text-red-500">*</span>
                  </label>
                  {isSchool ? (
                    <select value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select grade</option>
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  ) : (
                    <select value={formData.semester}
                      onChange={e => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select semester</option>
                      {SEMESTER_OPTIONS.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  )}
                </div>
                {isSchool && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                    <input type="text" value={formData.section}
                      onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="A, B, C…" maxLength={3} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                  <input type="text" value={formData.rollNumber}
                    onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional" />
                </div>
              </div>

              {/* Stream — only for Grade 11/12 in school mode */}
              {showStream && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stream</label>
                  <select value={formData.stream}
                    onChange={e => setFormData({ ...formData, stream: e.target.value as Stream })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="none">Not specified</option>
                    <option value="science">Science</option>
                    <option value="commerce">Commerce</option>
                    <option value="arts">Arts</option>
                  </select>
                </div>
              )}

              {/* DOB + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Parent/guardian — header */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  {isCollege ? 'Emergency Contact' : 'Parent / Guardian'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isCollege ? 'Contact Name' : 'Parent Name'}
                  </label>
                  <input type="text" value={formData.parentName}
                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={formData.parentPhone}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Phone number" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Home address" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                <Save size={18} />
                {saving ? 'Saving…' : 'Save Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}