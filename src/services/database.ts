import { invoke } from '@tauri-apps/api';
import type {
  User, Student, Staff, AttendanceRecord, SalaryRecord,
  FeeRecord, InventoryItem, Course, ExamRecord, LedgerEntry, SyncStatus
} from '../types';

export interface DatabaseService {
  initialize(): Promise<void>;
  
  users: {
    getAll(): Promise<User[]>;
    getById(id: string): Promise<User | null>;
    create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User>;
    delete(id: string): Promise<void>;
    authenticate(username: string, password: string): Promise<User | null>;
  };
  
  students: {
    getAll(filters?: { classId?: string; academicYear?: string }): Promise<Student[]>;
    getById(id: string): Promise<Student | null>;
    create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
    update(id: string, data: Partial<Student>): Promise<Student>;
    delete(id: string): Promise<void>;
    bulkImport(records: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
  };
  
  staff: {
    getAll(filters?: { department?: string; isActive?: boolean }): Promise<Staff[]>;
    getById(id: string): Promise<Staff | null>;
    create(staff: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff>;
    update(id: string, data: Partial<Staff>): Promise<Staff>;
    delete(id: string): Promise<void>;
    bulkImport(records: Omit<Staff, 'id' | 'createdAt'>[]): Promise<number>;
  };
  
  attendance: {
    getAll(filters?: { date?: string; studentId?: string; staffId?: string }): Promise<AttendanceRecord[]>;
    create(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord>;
    bulkCreate(records: Omit<AttendanceRecord, 'id' | 'createdAt'>[]): Promise<number>;
    getByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  };
  
  salary: {
    getAll(filters?: { staffId?: string; month?: string; year?: number; status?: string }): Promise<SalaryRecord[]>;
    create(record: Omit<SalaryRecord, 'id' | 'createdAt'>): Promise<SalaryRecord>;
    update(id: string, data: Partial<SalaryRecord>): Promise<SalaryRecord>;
    processBulk(staffIds: string[], month: string, year: number): Promise<SalaryRecord[]>;
  };
  
  fees: {
    getAll(filters?: { studentId?: string; status?: string; academicYear?: string }): Promise<FeeRecord[]>;
    create(record: Omit<FeeRecord, 'id' | 'createdAt'>): Promise<FeeRecord>;
    update(id: string, data: Partial<FeeRecord>): Promise<FeeRecord>;
    recordPayment(id: string, amount: number): Promise<FeeRecord>;
    getStudentBalance(studentId: string, academicYear: string): Promise<number>;
    bulkImport(records: Omit<FeeRecord, 'id' | 'createdAt'>[]): Promise<number>;
  };
  
  inventory: {
    getAll(filters?: { category?: string }): Promise<InventoryItem[]>;
    getById(id: string): Promise<InventoryItem | null>;
    create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem>;
    update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem>;
    delete(id: string): Promise<void>;
    updateQuantity(id: string, quantity: number): Promise<InventoryItem>;
    getLowStock(): Promise<InventoryItem[]>;
    bulkImport(records: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
  };
  
  courses: {
    getAll(filters?: { classId?: string; teacherId?: string }): Promise<Course[]>;
    getById(id: string): Promise<Course | null>;
    create(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course>;
    update(id: string, data: Partial<Course>): Promise<Course>;
    delete(id: string): Promise<void>;
  };
  
  exams: {
    getAll(filters?: { studentId?: string; courseId?: string }): Promise<ExamRecord[]>;
    create(record: Omit<ExamRecord, 'id' | 'createdAt'>): Promise<ExamRecord>;
    update(id: string, data: Partial<ExamRecord>): Promise<ExamRecord>;
    getStudentResults(studentId: string): Promise<ExamRecord[]>;
    getCourseAverage(courseId: string): Promise<number>;
  };
  
  ledger: {
    getAll(filters?: { accountCode?: string; startDate?: string; endDate?: string }): Promise<LedgerEntry[]>;
    create(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry>;
    getAccountBalance(accountCode: string): Promise<number>;
    getTrialBalance(): Promise<{ accountCode: string; accountName: string; debit: number; credit: number }[]>;
    generateFinancialReport(startDate: string, endDate: string): Promise<LedgerEntry[]>;
  };
  
  sync: {
    getStatus(): Promise<SyncStatus>;
    sync(): Promise<void>;
    addPendingChange(operation: string, table: string, recordId: string, data: unknown): void;
  };
}

interface RustUser {
  id: string;
  username: string;
  role: string;
  full_name: string;
  email: string | null;
  created_at: string;
  last_login: string | null;
}

interface RustStudent {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  class_id: string;
  section: string | null;
  parent_name: string;
  parent_phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

interface RustStaff {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  date_of_joining: string;
  phone: string;
  email: string | null;
  salary: number;
  is_active: boolean;
  created_at: string;
}

function toUser(r: RustUser): User {
  return {
    id: r.id,
    username: r.username,
    role: r.role as User['role'],
    fullName: r.full_name,
    email: r.email ?? undefined,
    createdAt: r.created_at,
    lastLogin: r.last_login ?? undefined,
  };
}

function toStudent(r: RustStudent): Student {
  return {
    id: r.id,
    admissionNumber: r.admission_number,
    firstName: r.first_name,
    lastName: r.last_name,
    dateOfBirth: r.date_of_birth,
    gender: r.gender as Student['gender'],
    classId: r.class_id,
    section: r.section ?? undefined,
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
    address: r.address,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toStaff(r: RustStaff): Staff {
  return {
    id: r.id,
    employeeId: r.employee_id,
    firstName: r.first_name,
    lastName: r.last_name,
    designation: r.designation,
    department: r.department,
    dateOfJoining: r.date_of_joining,
    phone: r.phone,
    email: r.email ?? undefined,
    salary: r.salary,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

function fromUser(u: User): Partial<RustUser> {
  return {
    username: u.username,
    role: u.role,
    full_name: u.fullName,
    email: u.email ?? null,
  };
}

function fromStudent(s: Student): Omit<RustStudent, 'id' | 'created_at' | 'updated_at'> {
  return {
    admission_number: s.admissionNumber,
    first_name: s.firstName,
    last_name: s.lastName,
    date_of_birth: s.dateOfBirth,
    gender: s.gender,
    class_id: s.classId,
    section: s.section ?? null,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    address: s.address,
  };
}

function fromStaff(st: Staff): Omit<RustStaff, 'id' | 'created_at'> {
  return {
    employee_id: st.employeeId,
    first_name: st.firstName,
    last_name: st.lastName,
    designation: st.designation,
    department: st.department,
    date_of_joining: st.dateOfJoining,
    phone: st.phone,
    email: st.email ?? null,
    salary: st.salary,
    is_active: st.isActive,
  };
}

export function createDatabaseService(): DatabaseService {
  return {
    async initialize() {
      // Tauri backend initializes the SQLite DB on app start
    },
    
    users: {
      async getAll(): Promise<User[]> {
        const rustUsers = await invoke<RustUser[]>('get_users');
        return rustUsers.map(toUser);
      },
      
      async getById(id: string): Promise<User | null> {
        const users = await this.getAll();
        return users.find(u => u.id === id) || null;
      },
      
      async create(userData): Promise<User> {
        const rustUser = await invoke<RustUser>('create_user', { 
          username: userData.username,
          role: userData.role,
          fullName: userData.fullName,
          email: userData.email 
        });
        return toUser(rustUser);
      },
      
      async update(id, data): Promise<User> {
        const rustUser = await invoke<RustUser>('update_user', { 
          id, 
          username: data.username,
          role: data.role,
          fullName: data.fullName,
          email: data.email 
        });
        return toUser(rustUser);
      },
      
      async delete(id): Promise<void> {
        await invoke('delete_user', { id });
      },
      
      async authenticate(username, password): Promise<User | null> {
        const rustUser = await invoke<RustUser | null>('authenticate_user', { username, password });
        return rustUser ? toUser(rustUser) : null;
      }
    },
    
    students: {
      async getAll(filters?): Promise<Student[]> {
        const rustStudents = await invoke<RustStudent[]>('get_students');
        let students = rustStudents.map(toStudent);
        if (filters?.classId) students = students.filter(s => s.classId === filters.classId);
        return students;
      },
      
      async getById(id): Promise<Student | null> {
        const students = await this.getAll();
        return students.find(s => s.id === id) || null;
      },
      
      async create(studentData): Promise<Student> {
        const rustStudent = await invoke<RustStudent>('create_student', { 
          data: fromStudent(studentData) 
        });
        return toStudent(rustStudent);
      },
      
      async update(id, data): Promise<Student> {
        const rustStudent = await invoke<RustStudent>('update_student', { 
          id, 
          data: fromStudent(data) 
        });
        return toStudent(rustStudent);
      },
      
      async delete(id): Promise<void> {
        await invoke('delete_student', { id });
      },
      
      async bulkImport(records): Promise<number> {
        let count = 0;
        for (const record of records) {
          await this.create(record);
          count++;
        }
        return count;
      }
    },
    
    staff: {
      async getAll(filters?): Promise<Staff[]> {
        const rustStaff = await invoke<RustStaff[]>('get_staff');
        let staffMembers = rustStaff.map(toStaff);
        if (filters?.department) staffMembers = staffMembers.filter(s => s.department === filters.department);
        if (filters?.isActive !== undefined) staffMembers = staffMembers.filter(s => s.isActive === filters.isActive);
        return staffMembers;
      },
      
      async getById(id): Promise<Staff | null> {
        const staffMembers = await this.getAll();
        return staffMembers.find(s => s.id === id) || null;
      },
      
      async create(staffData): Promise<Staff> {
        const rustStaff = await invoke<RustStaff>('create_staff', { 
          data: fromStaff(staffData) 
        });
        return toStaff(rustStaff);
      },
      
      async update(id, data): Promise<Staff> {
        const rustStaff = await invoke<RustStaff>('update_staff', { 
          id, 
          data: fromStaff(data) 
        });
        return toStaff(rustStaff);
      },
      
      async delete(id): Promise<void> {
        await invoke('delete_staff', { id });
      },
      
      async bulkImport(records): Promise<number> {
        let count = 0;
        for (const record of records) {
          await this.create(record);
          count++;
        }
        return count;
      }
    },
    
    attendance: {
      async getAll(filters?): Promise<AttendanceRecord[]> {
        const records = await invoke<AttendanceRecord[]>('get_attendance', { filters });
        return records;
      },
      
      async create(recordData): Promise<AttendanceRecord> {
        const record = await invoke<AttendanceRecord>('create_attendance', { data: recordData });
        return record;
      },
      
      async bulkCreate(recordsData): Promise<number> {
        let count = 0;
        for (const record of recordsData) {
          await this.create(record);
          count++;
        }
        return count;
      },
      
      async getByDateRange(startDate, endDate): Promise<AttendanceRecord[]> {
        const records = await invoke<AttendanceRecord[]>('get_attendance_by_date_range', { startDate, endDate });
        return records;
      }
    },
    
    salary: {
      async getAll(filters?): Promise<SalaryRecord[]> {
        const records = await invoke<SalaryRecord[]>('get_salary_records', { filters });
        return records;
      },
      
      async create(recordData): Promise<SalaryRecord> {
        const record = await invoke<SalaryRecord>('create_salary_record', { data: recordData });
        return record;
      },
      
      async update(id, data): Promise<SalaryRecord> {
        const record = await invoke<SalaryRecord>('update_salary_record', { id, data });
        return record;
      },
      
      async processBulk(staffIds, month, year): Promise<SalaryRecord[]> {
        const records = await invoke<SalaryRecord[]>('process_bulk_salary', { staffIds, month, year });
        return records;
      }
    },
    
    fees: {
      async getAll(filters?): Promise<FeeRecord[]> {
        const records = await invoke<FeeRecord[]>('get_fee_records', { filters });
        return records;
      },
      
      async create(recordData): Promise<FeeRecord> {
        const record = await invoke<FeeRecord>('create_fee_record', { data: recordData });
        return record;
      },
      
      async update(id, data): Promise<FeeRecord> {
        const record = await invoke<FeeRecord>('update_fee_record', { id, data });
        return record;
      },
      
      async recordPayment(id, amount): Promise<FeeRecord> {
        const record = await invoke<FeeRecord>('record_fee_payment', { id, amount });
        return record;
      },
      
      async getStudentBalance(studentId, academicYear): Promise<number> {
        const balance = await invoke<number>('get_student_balance', { studentId, academicYear });
        return balance;
      },
      
      async bulkImport(recordsData): Promise<number> {
        let count = 0;
        for (const record of recordsData) {
          await this.create(record);
          count++;
        }
        return count;
      }
    },
    
    inventory: {
      async getAll(filters?): Promise<InventoryItem[]> {
        const items = await invoke<InventoryItem[]>('get_inventory_items', { filters });
        return items;
      },
      
      async getById(id): Promise<InventoryItem | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
      },
      
      async create(itemData): Promise<InventoryItem> {
        const item = await invoke<InventoryItem>('create_inventory_item', { data: itemData });
        return item;
      },
      
      async update(id, data): Promise<InventoryItem> {
        const item = await invoke<InventoryItem>('update_inventory_item', { id, data });
        return item;
      },
      
      async delete(id): Promise<void> {
        await invoke('delete_inventory_item', { id });
      },
      
      async updateQuantity(id, quantity): Promise<InventoryItem> {
        const item = await invoke<InventoryItem>('update_inventory_quantity', { id, quantity });
        return item;
      },
      
      async getLowStock(): Promise<InventoryItem[]> {
        const items = await invoke<InventoryItem[]>('get_low_stock_items');
        return items;
      },
      
      async bulkImport(recordsData): Promise<number> {
        let count = 0;
        for (const record of recordsData) {
          await this.create(record);
          count++;
        }
        return count;
      }
    },
    
    courses: {
      async getAll(filters?): Promise<Course[]> {
        const courses = await invoke<Course[]>('get_courses', { filters });
        return courses;
      },
      
      async getById(id): Promise<Course | null> {
        const courses = await this.getAll();
        return courses.find(c => c.id === id) || null;
      },
      
      async create(courseData): Promise<Course> {
        const course = await invoke<Course>('create_course', { data: courseData });
        return course;
      },
      
      async update(id, data): Promise<Course> {
        const course = await invoke<Course>('update_course', { id, data });
        return course;
      },
      
      async delete(id): Promise<void> {
        await invoke('delete_course', { id });
      }
    },
    
    exams: {
      async getAll(filters?): Promise<ExamRecord[]> {
        const records = await invoke<ExamRecord[]>('get_exam_records', { filters });
        return records;
      },
      
      async create(recordData): Promise<ExamRecord> {
        const record = await invoke<ExamRecord>('create_exam_record', { data: recordData });
        return record;
      },
      
      async update(id, data): Promise<ExamRecord> {
        const record = await invoke<ExamRecord>('update_exam_record', { id, data });
        return record;
      },
      
      async getStudentResults(studentId): Promise<ExamRecord[]> {
        const records = await invoke<ExamRecord[]>('get_student_results', { studentId });
        return records;
      },
      
      async getCourseAverage(courseId): Promise<number> {
        const avg = await invoke<number>('get_course_average', { courseId });
        return avg;
      }
    },
    
    ledger: {
      async getAll(filters?): Promise<LedgerEntry[]> {
        const entries = await invoke<LedgerEntry[]>('get_ledger_entries', { filters });
        return entries;
      },
      
      async create(entryData): Promise<LedgerEntry> {
        const entry = await invoke<LedgerEntry>('create_ledger_entry', { data: entryData });
        return entry;
      },
      
      async getAccountBalance(accountCode): Promise<number> {
        const balance = await invoke<number>('get_account_balance', { accountCode });
        return balance;
      },
      
      async getTrialBalance(): Promise<{ accountCode: string; accountName: string; debit: number; credit: number }[]> {
        const trialBalance = await invoke<{ accountCode: string; accountName: string; debit: number; credit: number }[]>('get_trial_balance');
        return trialBalance;
      },
      
      async generateFinancialReport(startDate, endDate): Promise<LedgerEntry[]> {
        const entries = await invoke<LedgerEntry[]>('generate_financial_report', { startDate, endDate });
        return entries;
      }
    },
    
    sync: {
      async getStatus(): Promise<SyncStatus> {
        const status = await invoke<SyncStatus>('get_sync_status');
        return status;
      },
      
      async sync(): Promise<void> {
        await invoke('sync_data');
      },
      
      addPendingChange(operation, table, recordId, data): void {
        // No-op: Tauri backend handles persistence directly
      }
    }
  };
}