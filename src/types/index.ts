export type UserRole = 'management' | 'finance' | 'teacher' | 'admin';

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
  gender: 'male' | 'female' | 'other';
  grade?: string;
  semester?: string;
  stream?: Stream;
  classId: string;
  section?: string;
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
