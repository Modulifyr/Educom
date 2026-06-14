export type UserRole = 'management' | 'finance' | 'teacher' | 'admin';
export type InstitutionType = 'school' | 'college' | 'university';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  email?: string;
  createdAt: string;
  lastLogin?: string;
}

export type Stream = 'science' | 'commerce' | 'arts' | 'none';

export interface Student {
  id: string;
  admissionNumber: string;
  rollNumber?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  enrollmentDate: string;       // when the student joined — required for fee proration
  gender: 'male' | 'female' | 'other';
  // School mode: grade filled, semester blank
  // College/university mode: semester filled, grade blank
  grade?: string;               // "1"–"12" for schools
  semester?: string;            // "1"–"8" for colleges
  stream?: Stream;              // only relevant for grade 11-12
  classId: string;              // kept for DB compatibility, mirrors grade value
  section?: string;             // A/B/C section within a grade
  parentName: string;
  parentPhone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  phone: string;
  email?: string;
  salary: number;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  recordedBy: string;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  month: string;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentDate?: string;
  status: 'pending' | 'paid' | 'failed';
  processedBy: string;
  createdAt: string;
}

export interface SalaryOverride {
  staffId: string;
  allowances: number;
  deductions: number;
  note?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  feeType: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  paymentDate?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  academicYear: string;
  term?: string;                // term/semester the fee applies to
  remarks?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier?: string;
  reorderLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  teacherId?: string;
  classId: string;
  createdAt: string;
}

export interface ExamRecord {
  id: string;
  studentId: string;
  courseId: string;
  examType: 'quiz' | 'midterm' | 'final' | 'assignment';
  marks: number;
  maxMarks: number;
  gradedBy?: string;
  gradedAt?: string;
  remarks?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  voucherType: string;
  voucherNumber: string;
  createdBy: string;
  createdAt: string;
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingChanges: number;
  syncState: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface SyncQueueEntry {
  id: string;
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data: string;
  userRole: string;
  timestamp: string;
  synced: boolean;
}

export interface ConflictResolutionResult {
  resolution: 'local' | 'remote' | 'merged';
  winningData?: string;
  conflictType: 'none' | 'update_update' | 'update_delete' | 'delete_delete' | 'append_only' | 'immutable' | 'additive';
}

export interface SyncOperation {
  id?: string;
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data: Record<string, unknown>;
  userRole: string;
  timestamp?: string;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export interface Invite {
  id: string;
  inviteCode: string;
  fullName: string;
  role: UserRole;
  username: string;
  passwordHash: string;
  status: 'pending' | 'accepted' | 'expired';
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
}

export interface InviteCreateInput {
  fullName: string;
  role: UserRole;
  username: string;
  password: string;
}

// ── Institution settings ───────────────────────────────────────────────────

export interface InstitutionSettings {
  institutionName: string;
  institutionType: InstitutionType;  // drives which student fields are shown
  academicYear: string;              // e.g. "2024-2025"
  currency: string;                  // e.g. "NPR", "USD"
  githubRepo: string;                // "owner/repo" for update checking
  address?: string;
  phone?: string;
  email?: string;
}

// ── Update checking ────────────────────────────────────────────────────────

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
}

// ── Report types ───────────────────────────────────────────────────────────

export interface AttendanceReportRow {
  studentId: string;
  studentName: string;
  grade: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
}

export interface FeeReportRow {
  studentId: string;
  studentName: string;
  grade: string;
  feeType: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
}

export interface SalaryReportRow {
  staffId: string;
  staffName: string;
  department: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export interface ExamReportRow {
  studentId: string;
  studentName: string;
  grade: string;
  courseName: string;
  examType: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  grade_letter: string;
}