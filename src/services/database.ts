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
    authenticate(username: string): Promise<User | null>;
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

export function createDatabaseService(): DatabaseService {
  const storageKey = 'educom_db';
  
  const getStorage = <T>(key: string): T[] => {
    const data = localStorage.getItem(`${storageKey}_${key}`);
    return data ? JSON.parse(data) : [];
  };
  
  const setStorage = <T>(key: string, data: T): void => {
    localStorage.setItem(`${storageKey}_${key}`, JSON.stringify(data));
  };
  
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  const now = (): string => new Date().toISOString();
  
  return {
    async initialize() {
      if (!localStorage.getItem(`${storageKey}_initialized`)) {
        setStorage('users', []);
        setStorage('students', []);
        setStorage('staff', []);
        setStorage('attendance', []);
        setStorage('salary', []);
        setStorage('fees', []);
        setStorage('inventory', []);
        setStorage('courses', []);
        setStorage('exams', []);
        setStorage('ledger', []);
        setStorage('sync_pending', []);
        localStorage.setItem(`${storageKey}_initialized`, 'true');
      }
    },
    
    users: {
      async getAll(): Promise<User[]> {
        return getStorage<User>('users');
      },
      
      async getById(id: string): Promise<User | null> {
        const users = getStorage<User>('users');
        return users.find(u => u.id === id) || null;
      },
      
      async create(userData): Promise<User> {
        const users = getStorage<User>('users');
        const user: User = {
          ...userData,
          id: generateId(),
          createdAt: now()
        };
        users.push(user);
        setStorage('users', users);
        return user;
      },
      
      async update(id, data): Promise<User> {
        const users = getStorage<User>('users');
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');
        users[index] = { ...users[index], ...data };
        setStorage('users', users);
        return users[index];
      },
      
      async delete(id): Promise<void> {
        const users = getStorage<User>('users');
        setStorage('users', users.filter(u => u.id !== id));
      },
      
      async authenticate(username): Promise<User | null> {
        const users = getStorage<User>('users');
        return users.find(u => u.username === username) || null;
      }
    },
    
    students: {
      async getAll(filters?): Promise<Student[]> {
        let students = getStorage<Student>('students');
        if (filters?.classId) students = students.filter(s => s.classId === filters.classId);
        return students;
      },
      
      async getById(id): Promise<Student | null> {
        const students = getStorage<Student>('students');
        return students.find(s => s.id === id) || null;
      },
      
      async create(studentData): Promise<Student> {
        const students = getStorage<Student>('students');
        const student: Student = {
          ...studentData,
          id: generateId(),
          createdAt: now(),
          updatedAt: now()
        };
        students.push(student);
        setStorage('students', students);
        return student;
      },
      
      async update(id, data): Promise<Student> {
        const students = getStorage<Student>('students');
        const index = students.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Student not found');
        students[index] = { ...students[index], ...data, updatedAt: now() };
        setStorage('students', students);
        return students[index];
      },
      
      async delete(id): Promise<void> {
        const students = getStorage<Student>('students');
        setStorage('students', students.filter(s => s.id !== id));
      },
      
      async bulkImport(records): Promise<number> {
        const students = getStorage<Student>('students');
        const newStudents = records.map(r => ({
          ...r,
          id: generateId(),
          createdAt: now(),
          updatedAt: now()
        }));
        setStorage('students', [...students, ...newStudents]);
        return newStudents.length;
      }
    },
    
    staff: {
      async getAll(filters?): Promise<Staff[]> {
        let staff = getStorage<Staff>('staff');
        if (filters?.department) staff = staff.filter(s => s.department === filters.department);
        if (filters?.isActive !== undefined) staff = staff.filter(s => s.isActive === filters.isActive);
        return staff;
      },
      
      async getById(id): Promise<Staff | null> {
        const staff = getStorage<Staff>('staff');
        return staff.find(s => s.id === id) || null;
      },
      
      async create(staffData): Promise<Staff> {
        const staff = getStorage<Staff>('staff');
        const newStaff: Staff = {
          ...staffData,
          id: generateId(),
          createdAt: now()
        };
        staff.push(newStaff);
        setStorage('staff', staff);
        return newStaff;
      },
      
      async update(id, data): Promise<Staff> {
        const staff = getStorage<Staff>('staff');
        const index = staff.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Staff not found');
        staff[index] = { ...staff[index], ...data };
        setStorage('staff', staff);
        return staff[index];
      },
      
      async delete(id): Promise<void> {
        const staff = getStorage<Staff>('staff');
        setStorage('staff', staff.filter(s => s.id !== id));
      },
      
      async bulkImport(records): Promise<number> {
        const staff = getStorage<Staff>('staff');
        const newStaff = records.map(r => ({
          ...r,
          id: generateId(),
          createdAt: now()
        }));
        setStorage('staff', [...staff, ...newStaff]);
        return newStaff.length;
      }
    },
    
    attendance: {
      async getAll(filters?): Promise<AttendanceRecord[]> {
        let records = getStorage<AttendanceRecord>('attendance');
        if (filters?.date) records = records.filter(r => r.date === filters.date);
        if (filters?.studentId) records = records.filter(r => r.studentId === filters.studentId);
        if (filters?.staffId) records = records.filter(r => r.staffId === filters.staffId);
        return records;
      },
      
      async create(recordData): Promise<AttendanceRecord> {
        const records = getStorage<AttendanceRecord>('attendance');
        const record: AttendanceRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now()
        };
        records.push(record);
        setStorage('attendance', records);
        return record;
      },
      
      async bulkCreate(recordsData): Promise<number> {
        const records = getStorage<AttendanceRecord>('attendance');
        const newRecords = recordsData.map(r => ({
          ...r,
          id: generateId(),
          createdAt: now()
        }));
        setStorage('attendance', [...records, ...newRecords]);
        return newRecords.length;
      },
      
      async getByDateRange(startDate, endDate): Promise<AttendanceRecord[]> {
        const records = getStorage<AttendanceRecord>('attendance');
        return records.filter(r => r.date >= startDate && r.date <= endDate);
      }
    },
    
    salary: {
      async getAll(filters?): Promise<SalaryRecord[]> {
        let records = getStorage<SalaryRecord>('salary');
        if (filters?.staffId) records = records.filter(r => r.staffId === filters.staffId);
        if (filters?.month) records = records.filter(r => r.month === filters.month);
        if (filters?.year) records = records.filter(r => r.year === filters.year);
        if (filters?.status) records = records.filter(r => r.status === filters.status);
        return records;
      },
      
      async create(recordData): Promise<SalaryRecord> {
        const records = getStorage<SalaryRecord>('salary');
        const record: SalaryRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now()
        };
        records.push(record);
        setStorage('salary', records);
        return record;
      },
      
      async update(id, data): Promise<SalaryRecord> {
        const records = getStorage<SalaryRecord>('salary');
        const index = records.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Salary record not found');
        records[index] = { ...records[index], ...data };
        setStorage('salary', records);
        return records[index];
      },
      
      async processBulk(staffIds, month, year): Promise<SalaryRecord[]> {
        const staff = getStorage<Staff>('staff');
        const records = getStorage<SalaryRecord>('salary');
        const newRecords: SalaryRecord[] = [];
        
        for (const staffId of staffIds) {
          const staffMember = staff.find(s => s.id === staffId);
          if (staffMember) {
            const record: SalaryRecord = {
              id: generateId(),
              staffId,
              month,
              year,
              baseSalary: staffMember.salary,
              allowances: 0,
              deductions: 0,
              netSalary: staffMember.salary,
              status: 'pending',
              processedBy: 'system',
              createdAt: now()
            };
            newRecords.push(record);
          }
        }
        
        setStorage('salary', [...records, ...newRecords]);
        return newRecords;
      }
    },
    
    fees: {
      async getAll(filters?): Promise<FeeRecord[]> {
        let records = getStorage<FeeRecord>('fees');
        if (filters?.studentId) records = records.filter(r => r.studentId === filters.studentId);
        if (filters?.status) records = records.filter(r => r.status === filters.status);
        if (filters?.academicYear) records = records.filter(r => r.academicYear === filters.academicYear);
        return records;
      },
      
      async create(recordData): Promise<FeeRecord> {
        const records = getStorage<FeeRecord>('fees');
        const record: FeeRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now()
        };
        records.push(record);
        setStorage('fees', records);
        return record;
      },
      
      async update(id, data): Promise<FeeRecord> {
        const records = getStorage<FeeRecord>('fees');
        const index = records.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Fee record not found');
        records[index] = { ...records[index], ...data };
        setStorage('fees', records);
        return records[index];
      },
      
      async recordPayment(id, amount): Promise<FeeRecord> {
        const records = getStorage<FeeRecord>('fees');
        const index = records.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Fee record not found');
        const record = records[index];
        record.paidAmount += amount;
        record.paymentDate = now();
        if (record.paidAmount >= record.amount) {
          record.status = 'paid';
        } else if (record.paidAmount > 0) {
          record.status = 'partial';
        }
        setStorage('fees', records);
        return record;
      },
      
      async getStudentBalance(studentId, academicYear): Promise<number> {
        const records = await this.getAll({ studentId, academicYear });
        return records.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);
      },
      
      async bulkImport(recordsData): Promise<number> {
        const records = getStorage<FeeRecord>('fees');
        const newRecords = recordsData.map(r => ({
          ...r,
          id: generateId(),
          createdAt: now()
        }));
        setStorage('fees', [...records, ...newRecords]);
        return newRecords.length;
      }
    },
    
    inventory: {
      async getAll(filters?): Promise<InventoryItem[]> {
        let items = getStorage<InventoryItem>('inventory');
        if (filters?.category) items = items.filter(i => i.category === filters.category);
        return items;
      },
      
      async getById(id): Promise<InventoryItem | null> {
        const items = getStorage<InventoryItem>('inventory');
        return items.find(i => i.id === id) || null;
      },
      
      async create(itemData): Promise<InventoryItem> {
        const items = getStorage<InventoryItem>('inventory');
        const item: InventoryItem = {
          ...itemData,
          id: generateId(),
          createdAt: now(),
          updatedAt: now()
        };
        items.push(item);
        setStorage('inventory', items);
        return item;
      },
      
      async update(id, data): Promise<InventoryItem> {
        const items = getStorage<InventoryItem>('inventory');
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Inventory item not found');
        items[index] = { ...items[index], ...data, updatedAt: now() };
        setStorage('inventory', items);
        return items[index];
      },
      
      async delete(id): Promise<void> {
        const items = getStorage<InventoryItem>('inventory');
        setStorage('inventory', items.filter(i => i.id !== id));
      },
      
      async updateQuantity(id, quantity): Promise<InventoryItem> {
        const items = getStorage<InventoryItem>('inventory');
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Inventory item not found');
        items[index].quantity = quantity;
        items[index].updatedAt = now();
        setStorage('inventory', items);
        return items[index];
      },
      
      async getLowStock(): Promise<InventoryItem[]> {
        const items = getStorage<InventoryItem>('inventory');
        return items.filter(i => i.reorderLevel && i.quantity <= i.reorderLevel);
      },
      
      async bulkImport(recordsData): Promise<number> {
        const items = getStorage<InventoryItem>('inventory');
        const newItems = recordsData.map(r => ({
          ...r,
          id: generateId(),
          createdAt: now(),
          updatedAt: now()
        }));
        setStorage('inventory', [...items, ...newItems]);
        return newItems.length;
      }
    },
    
    courses: {
      async getAll(filters?): Promise<Course[]> {
        let courses = getStorage<Course>('courses');
        if (filters?.classId) courses = courses.filter(c => c.classId === filters.classId);
        if (filters?.teacherId) courses = courses.filter(c => c.teacherId === filters.teacherId);
        return courses;
      },
      
      async getById(id): Promise<Course | null> {
        const courses = getStorage<Course>('courses');
        return courses.find(c => c.id === id) || null;
      },
      
      async create(courseData): Promise<Course> {
        const courses = getStorage<Course>('courses');
        const course: Course = {
          ...courseData,
          id: generateId(),
          createdAt: now()
        };
        courses.push(course);
        setStorage('courses', courses);
        return course;
      },
      
      async update(id, data): Promise<Course> {
        const courses = getStorage<Course>('courses');
        const index = courses.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Course not found');
        courses[index] = { ...courses[index], ...data };
        setStorage('courses', courses);
        return courses[index];
      },
      
      async delete(id): Promise<void> {
        const courses = getStorage<Course>('courses');
        setStorage('courses', courses.filter(c => c.id !== id));
      }
    },
    
    exams: {
      async getAll(filters?): Promise<ExamRecord[]> {
        let records = getStorage<ExamRecord>('exams');
        if (filters?.studentId) records = records.filter(r => r.studentId === filters.studentId);
        if (filters?.courseId) records = records.filter(r => r.courseId === filters.courseId);
        return records;
      },
      
      async create(recordData): Promise<ExamRecord> {
        const records = getStorage<ExamRecord>('exams');
        const record: ExamRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now()
        };
        records.push(record);
        setStorage('exams', records);
        return record;
      },
      
      async update(id, data): Promise<ExamRecord> {
        const records = getStorage<ExamRecord>('exams');
        const index = records.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Exam record not found');
        records[index] = { ...records[index], ...data, gradedAt: now() };
        setStorage('exams', records);
        return records[index];
      },
      
      async getStudentResults(studentId): Promise<ExamRecord[]> {
        return this.getAll({ studentId });
      },
      
      async getCourseAverage(courseId): Promise<number> {
        const records = await this.getAll({ courseId });
        if (records.length === 0) return 0;
        const sum = records.reduce((acc, r) => acc + (r.marks / r.maxMarks * 100), 0);
        return sum / records.length;
      }
    },
    
    ledger: {
      async getAll(filters?): Promise<LedgerEntry[]> {
        let entries = getStorage<LedgerEntry>('ledger');
        if (filters?.accountCode) entries = entries.filter(e => e.accountCode === filters.accountCode);
        if (filters?.startDate) entries = entries.filter(e => e.date >= filters.startDate!);
        if (filters?.endDate) entries = entries.filter(e => e.date <= filters.endDate!);
        return entries;
      },
      
      async create(entryData): Promise<LedgerEntry> {
        const entries = getStorage<LedgerEntry>('ledger');
        const entry: LedgerEntry = {
          ...entryData,
          id: generateId(),
          createdAt: now()
        };
        entries.push(entry);
        setStorage('ledger', entries);
        return entry;
      },
      
      async getAccountBalance(accountCode): Promise<number> {
        const entries = await this.getAll({ accountCode });
        const lastEntry = entries.sort((a, b) => b.date.localeCompare(a.date))[0];
        return lastEntry?.balance || 0;
      },
      
      async getTrialBalance(): Promise<{ accountCode: string; accountName: string; debit: number; credit: number }[]> {
        const entries = getStorage<LedgerEntry>('ledger');
        const accountMap = new Map<string, { accountCode: string; accountName: string; debit: number; credit: number }>();
        
        for (const entry of entries) {
          const existing = accountMap.get(entry.accountCode) || {
            accountCode: entry.accountCode,
            accountName: entry.accountName,
            debit: 0,
            credit: 0
          };
          existing.debit += entry.debit;
          existing.credit += entry.credit;
          accountMap.set(entry.accountCode, existing);
        }
        
        return Array.from(accountMap.values());
      },
      
      async generateFinancialReport(startDate, endDate): Promise<LedgerEntry[]> {
        return this.getAll({ startDate, endDate });
      }
    },
    
    sync: {
      async getStatus(): Promise<SyncStatus> {
        const pendingChanges = getStorage<{ timestamp: string }>('sync_pending');
        return {
          lastSyncTime: localStorage.getItem(`${storageKey}_last_sync`) || now(),
          pendingChanges: pendingChanges.length,
          syncState: 'idle'
        };
      },
      
      async sync(): Promise<void> {
        getStorage<unknown>('sync_pending');
        localStorage.setItem(`${storageKey}_last_sync`, now());
        setStorage('sync_pending', []);
      },
      
      addPendingChange(operation, table, recordId, data): void {
        const pending = getStorage<unknown>('sync_pending');
        pending.push({ operation, table, recordId, data, timestamp: now() });
        setStorage('sync_pending', pending);
      }
    }
  };
}
