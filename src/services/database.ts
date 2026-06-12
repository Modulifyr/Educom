import { invoke } from '@tauri-apps/api/core';
import type {
    User, Student, Staff, AttendanceRecord, SalaryRecord,
    FeeRecord, InventoryItem, Course, ExamRecord, LedgerEntry, SyncStatus,
    SyncQueueEntry, ConflictResolutionResult
} from '../types';

export interface DatabaseService {
    initialize(): Promise<void>;

    users: {
        getAll(): Promise<User[]>;
        getById(id: string): Promise<User | null>;
        create(user: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<User>;
        update(id: string, data: Partial<User> & { password?: string }): Promise<User>;
        delete(id: string): Promise<void>;
        authenticate(username: string, password: string): Promise<User | null>;
    };

    students: {
        getAll(filters?: { classId?: string }): Promise<Student[]>;
        getById(id: string): Promise<Student | null>;
        create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
        update(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student>;
        delete(id: string): Promise<void>;
        bulkImport(records: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
    };

    staff: {
        getAll(filters?: { department?: string; isActive?: boolean }): Promise<Staff[]>;
        getById(id: string): Promise<Staff | null>;
        create(staff: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff>;
        update(id: string, data: Partial<Omit<Staff, 'id' | 'createdAt'>>): Promise<Staff>;
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
        getAll(filters?: { staffId?: string; month?: string; status?: string }): Promise<SalaryRecord[]>;
        update(id: string, data: { status: string; paymentDate?: string }): Promise<SalaryRecord>;
        processBulk(staffIds: string[], month: string, year: number, processedBy: string): Promise<SalaryRecord[]>;
    };

    fees: {
        getAll(filters?: { studentId?: string; status?: string; academicYear?: string }): Promise<FeeRecord[]>;
        create(record: Omit<FeeRecord, 'id' | 'createdAt' | 'paymentDate'>): Promise<FeeRecord>;
        recordPayment(id: string, amount: number): Promise<FeeRecord>;
        bulkImport(records: Omit<FeeRecord, 'id' | 'createdAt' | 'paymentDate'>[]): Promise<number>;
    };

    inventory: {
        getAll(filters?: { category?: string }): Promise<InventoryItem[]>;
        getById(id: string): Promise<InventoryItem | null>;
        create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem>;
        update(id: string, data: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<InventoryItem>;
        delete(id: string): Promise<void>;
        getLowStock(): Promise<InventoryItem[]>;
        bulkImport(records: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
    };

    courses: {
        getAll(filters?: { classId?: string; teacherId?: string }): Promise<Course[]>;
        getById(id: string): Promise<Course | null>;
        create(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course>;
        update(id: string, data: Partial<Omit<Course, 'id' | 'createdAt'>>): Promise<Course>;
        delete(id: string): Promise<void>;
    };

    exams: {
        getAll(filters?: { studentId?: string; courseId?: string }): Promise<ExamRecord[]>;
        create(record: Omit<ExamRecord, 'id' | 'createdAt' | 'gradedAt' | 'gradedBy'> & { gradedBy?: string }): Promise<ExamRecord>;
        update(id: string, data: { marks: number; maxMarks?: number; examType?: string; gradedBy?: string; gradedAt?: string; remarks?: string }): Promise<ExamRecord>;
    };

    ledger: {
        getAll(filters?: { accountCode?: string; startDate?: string; endDate?: string }): Promise<LedgerEntry[]>;
        create(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry>;
    };

    sync: {
        getStatus(): Promise<SyncStatus>;
        queueOperation(operation: string, tableName: string, recordId: string, data: string, userRole: string): Promise<string>;
        getPendingOperations(): Promise<SyncQueueEntry[]>;
        markSynced(ids: string[]): Promise<void>;
        resolveAndApplyRemote(remote: SyncQueueEntry): Promise<ConflictResolutionResult>;
        applySyncedChange(operation: string, tableName: string, recordId: string, data: string): Promise<void>;
        clearOldOperations(beforeTimestamp: string): Promise<number>;
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

function fromUser(u: Omit<User, 'id' | 'createdAt'> & { password: string }) {
    return {
        username: u.username,
        role: u.role,
        full_name: u.fullName,
        email: u.email ?? null,
        password: u.password,
    };
}

function fromStudent(s: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) {
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

function fromStaff(st: Omit<Staff, 'id' | 'createdAt'>) {
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
                    data: fromUser(userData)
                });
                return toUser(rustUser);
            },

            async update(id, data): Promise<User> {
                const rustUser = await invoke<RustUser>('update_user', {
                    id,
                    full_name: data.fullName,
                    email: data.email,
                    role: data.role,
                    password: data.password
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
                const rustStudents = await invoke<RustStudent[]>('get_students', { classId: filters?.classId });
                return rustStudents.map(toStudent);
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
                    data: fromStudent(data as any)
                });
                return toStudent(rustStudent);
            },

            async delete(id): Promise<void> {
                await invoke('delete_student', { id });
            },

            async bulkImport(records): Promise<number> {
                const count = await invoke<number>('bulk_import_students', { records: records.map(fromStudent) });
                return count;
            }
        },

        staff: {
            async getAll(filters?): Promise<Staff[]> {
                const rustStaff = await invoke<RustStaff[]>('get_staff', { department: filters?.department, isActive: filters?.isActive });
                return rustStaff.map(toStaff);
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
                    data: fromStaff(data as any)
                });
                return toStaff(rustStaff);
            },

            async delete(id): Promise<void> {
                await invoke('delete_staff', { id });
            },

            async bulkImport(records): Promise<number> {
                // Not implemented in Rust, fallback to individual creates
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
                const records = await invoke<AttendanceRecord[]>('get_attendance', {
                    date: filters?.date,
                    studentId: filters?.studentId,
                    staffId: filters?.staffId
                });
                return records;
            },

            async create(recordData): Promise<AttendanceRecord> {
                const record = await invoke<AttendanceRecord>('create_attendance', {
                    data: {
                        student_id: recordData.studentId,
                        staff_id: recordData.staffId,
                        date: recordData.date,
                        status: recordData.status,
                        remarks: recordData.remarks,
                        recorded_by: recordData.recordedBy
                    }
                });
                return record;
            },

            async bulkCreate(recordsData): Promise<number> {
                const count = await invoke<number>('bulk_create_attendance', {
                    records: recordsData.map(r => ({
                        student_id: r.studentId,
                        staff_id: r.staffId,
                        date: r.date,
                        status: r.status,
                        remarks: r.remarks,
                        recorded_by: r.recordedBy
                    }))
                });
                return count;
            },

            async getByDateRange(startDate, endDate): Promise<AttendanceRecord[]> {
                const records = await invoke<AttendanceRecord[]>('get_attendance_by_range', { startDate, endDate });
                return records;
            }
        },

        salary: {
            async getAll(filters?): Promise<SalaryRecord[]> {
                const records = await invoke<SalaryRecord[]>('get_salary', {
                    staffId: filters?.staffId,
                    month: filters?.month,
                    status: filters?.status
                });
                return records;
            },

            async update(id, data): Promise<SalaryRecord> {
                const record = await invoke<SalaryRecord>('update_salary', {
                    id,
                    status: data.status,
                    paymentDate: data.paymentDate
                });
                return record;
            },

            async processBulk(staffIds, month, year, processedBy): Promise<SalaryRecord[]> {
                const records = await invoke<SalaryRecord[]>('process_bulk_salary', { staffIds, month, year, processedBy });
                return records;
            }
        },

        fees: {
            async getAll(filters?): Promise<FeeRecord[]> {
                const records = await invoke<FeeRecord[]>('get_fees', {
                    studentId: filters?.studentId,
                    status: filters?.status,
                    academicYear: filters?.academicYear
                });
                return records;
            },

            async create(recordData): Promise<FeeRecord> {
                const record = await invoke<FeeRecord>('create_fee', {
                    data: {
                        student_id: recordData.studentId,
                        fee_type: recordData.feeType,
                        amount: recordData.amount,
                        due_date: recordData.dueDate,
                        paid_amount: recordData.paidAmount,
                        status: recordData.status,
                        academic_year: recordData.academicYear,
                        remarks: recordData.remarks
                    }
                });
                return record;
            },

            async recordPayment(id, amount): Promise<FeeRecord> {
                const record = await invoke<FeeRecord>('record_fee_payment', { id, amount });
                return record;
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
                const items = await invoke<InventoryItem[]>('get_inventory', { category: filters?.category });
                return items;
            },

            async getById(id): Promise<InventoryItem | null> {
                const items = await this.getAll();
                return items.find(i => i.id === id) || null;
            },

            async create(itemData): Promise<InventoryItem> {
                const item = await invoke<InventoryItem>('create_inventory_item', {
                    data: {
                        item_code: itemData.itemCode,
                        name: itemData.name,
                        category: itemData.category,
                        quantity: itemData.quantity,
                        unit: itemData.unit,
                        unit_price: itemData.unitPrice,
                        supplier: itemData.supplier,
                        reorder_level: itemData.reorderLevel
                    }
                });
                return item;
            },

            async update(id, data): Promise<InventoryItem> {
                const item = await invoke<InventoryItem>('update_inventory_item', {
                    id,
                    data: {
                        item_code: data.itemCode,
                        name: data.name,
                        category: data.category,
                        quantity: data.quantity,
                        unit: data.unit,
                        unit_price: data.unitPrice,
                        supplier: data.supplier,
                        reorder_level: data.reorderLevel
                    }
                });
                return item;
            },

            async delete(id): Promise<void> {
                await invoke('delete_inventory_item', { id });
            },

            async getLowStock(): Promise<InventoryItem[]> {
                const items = await invoke<InventoryItem[]>('get_low_stock');
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
                const courses = await invoke<Course[]>('get_courses', {
                    classId: filters?.classId,
                    teacherId: filters?.teacherId
                });
                return courses;
            },

            async getById(id): Promise<Course | null> {
                const courses = await this.getAll();
                return courses.find(c => c.id === id) || null;
            },

            async create(courseData): Promise<Course> {
                const course = await invoke<Course>('create_course', {
                    data: {
                        code: courseData.code,
                        name: courseData.name,
                        description: courseData.description,
                        credits: courseData.credits,
                        teacher_id: courseData.teacherId,
                        class_id: courseData.classId
                    }
                });
                return course;
            },

            async update(id, data): Promise<Course> {
                const course = await invoke<Course>('update_course', {
                    id,
                    data: {
                        code: data.code,
                        name: data.name,
                        description: data.description,
                        credits: data.credits,
                        teacher_id: data.teacherId,
                        class_id: data.classId
                    }
                });
                return course;
            },

            async delete(id): Promise<void> {
                await invoke('delete_course', { id });
            }
        },

        exams: {
            async getAll(filters?): Promise<ExamRecord[]> {
                const records = await invoke<ExamRecord[]>('get_exams', {
                    studentId: filters?.studentId,
                    courseId: filters?.courseId
                });
                return records;
            },

            async create(recordData): Promise<ExamRecord> {
                const record = await invoke<ExamRecord>('create_exam', {
                    data: {
                        student_id: recordData.studentId,
                        course_id: recordData.courseId,
                        exam_type: recordData.examType,
                        marks: recordData.marks,
                        max_marks: recordData.maxMarks,
                        graded_by: recordData.gradedBy,
                        remarks: recordData.remarks
                    }
                });
                return record;
            },

            async update(id, data): Promise<ExamRecord> {
                const record = await invoke<ExamRecord>('update_exam', {
                    id,
                    marks: data.marks,
                    maxMarks: data.maxMarks,
                    gradedBy: data.gradedBy,
                    remarks: data.remarks,
                    gradedAt: data.gradedAt
                });
                return record;
            }
        },

        ledger: {
            async getAll(filters?): Promise<LedgerEntry[]> {
                const entries = await invoke<LedgerEntry[]>('get_ledger', {
                    startDate: filters?.startDate,
                    endDate: filters?.endDate,
                    accountCode: filters?.accountCode
                });
                return entries;
            },

            async create(entryData): Promise<LedgerEntry> {
                const entry = await invoke<LedgerEntry>('create_ledger_entry', {
                    data: {
                        date: entryData.date,
                        account_code: entryData.accountCode,
                        account_name: entryData.accountName,
                        description: entryData.description,
                        debit: entryData.debit,
                        credit: entryData.credit,
                        balance: entryData.balance,
                        voucher_type: entryData.voucherType,
                        voucher_number: entryData.voucherNumber,
                        created_by: entryData.createdBy
                    }
                });
                return entry;
            }
        },

        sync: {
            async getStatus(): Promise<SyncStatus> {
                const status = await invoke<SyncStatus>('get_sync_status');
                return status;
            },

            async queueOperation(operation: string, tableName: string, recordId: string, data: string, userRole: string): Promise<string> {
                return invoke<string>('queue_sync_operation', { operation, tableName, recordId, data, userRole });
            },

            async getPendingOperations(): Promise<SyncQueueEntry[]> {
                return invoke<SyncQueueEntry[]>('get_pending_sync_operations');
            },

            async markSynced(ids: string[]): Promise<void> {
                return invoke('mark_operations_synced', { ids });
            },

            async resolveAndApplyRemote(remote: SyncQueueEntry): Promise<ConflictResolutionResult> {
                return invoke<ConflictResolutionResult>('resolve_and_apply_remote_change', {
                    remoteOperation: remote.operation,
                    remoteTable: remote.tableName,
                    remoteRecordId: remote.recordId,
                    remoteData: remote.data,
                    remoteUserRole: remote.userRole,
                    remoteTimestamp: remote.timestamp,
                });
            },

            async applySyncedChange(operation: string, tableName: string, recordId: string, data: string): Promise<void> {
                return invoke('apply_synced_change', { operation, tableName, recordId, data });
            },

            async clearOldOperations(beforeTimestamp: string): Promise<number> {
                return invoke<number>('clear_synced_operations', { beforeTimestamp });
            }
        }
    };
}
