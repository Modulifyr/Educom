import { invoke } from '@tauri-apps/api/core';
import type {
    User, Student, Staff, AttendanceRecord, SalaryRecord,
    FeeRecord, InventoryItem, Course, ExamRecord, LedgerEntry, SyncStatus,
    SyncQueueEntry, ConflictResolutionResult
} from '../types';

// NOTE: Rust structs use #[serde(rename = "camelCase")] on every field.
// Tauri IPC therefore sends and receives camelCase JSON.
// No snake_case translation is needed — the TypeScript types already match.

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

// ─────────────────────────────────────────────────────────────────────────────
// The Rust backend serializes fields with camelCase renames, e.g.:
//   full_name  → fullName
//   created_at → createdAt
//   last_login → lastLogin
// So the JSON response already matches our TypeScript User/Student/Staff types.
// We cast directly; no mapper needed.
// ─────────────────────────────────────────────────────────────────────────────

export function createDatabaseService(): DatabaseService {
    return {
        async initialize() {
            // SQLite DB is initialized by Tauri on app start; nothing to do here.
        },

        // ── Users ──────────────────────────────────────────────────────────────

        users: {
            async getAll(): Promise<User[]> {
                return invoke<User[]>('get_users');
            },

            async getById(id): Promise<User | null> {
                const users = await this.getAll();
                return users.find(u => u.id === id) ?? null;
            },

            async create(userData): Promise<User> {
                return invoke<User>('create_user', {
                    data: {
                        username: userData.username,
                        role: userData.role,
                        fullName: userData.fullName,
                        email: userData.email ?? null,
                        password: userData.password,
                    }
                });
            },

            async update(id, data): Promise<User> {
                return invoke<User>('update_user', {
                    id,
                    fullName: data.fullName,
                    email: data.email,
                    role: data.role,
                    password: data.password,
                });
            },

            async delete(id): Promise<void> {
                await invoke('delete_user', { id });
            },

            async authenticate(username, password): Promise<User | null> {
                return invoke<User | null>('authenticate_user', { username, password });
            }
        },

        // ── Students ───────────────────────────────────────────────────────────

        students: {
            async getAll(filters?): Promise<Student[]> {
                return invoke<Student[]>('get_students', {
                    classId: filters?.classId ?? null,
                });
            },

            async getById(id): Promise<Student | null> {
                const students = await this.getAll();
                return students.find(s => s.id === id) ?? null;
            },

            async create(studentData): Promise<Student> {
                return invoke<Student>('create_student', {
                    data: {
                        admissionNumber: studentData.admissionNumber,
                        rollNumber: studentData.rollNumber ?? null,
                        firstName: studentData.firstName,
                        lastName: studentData.lastName,
                        dateOfBirth: studentData.dateOfBirth,
                        gender: studentData.gender,
                        grade: studentData.grade ?? null,
                        semester: studentData.semester ?? null,
                        stream: studentData.stream ?? null,
                        classId: studentData.classId,
                        section: studentData.section ?? null,
                        parentName: studentData.parentName,
                        parentPhone: studentData.parentPhone,
                        address: studentData.address,
                    }
                });
            },

            async update(id, data): Promise<Student> {
                return invoke<Student>('update_student', {
                    id,
                    data: {
                        admissionNumber: data.admissionNumber ?? '',
                        rollNumber: data.rollNumber ?? null,
                        firstName: data.firstName ?? '',
                        lastName: data.lastName ?? '',
                        dateOfBirth: data.dateOfBirth ?? '',
                        gender: data.gender ?? 'male',
                        grade: data.grade ?? null,
                        semester: data.semester ?? null,
                        stream: data.stream ?? null,
                        classId: data.classId ?? '1',
                        section: data.section ?? null,
                        parentName: data.parentName ?? '',
                        parentPhone: data.parentPhone ?? '',
                        address: data.address ?? '',
                    }
                });
            },

            async delete(id): Promise<void> {
                await invoke('delete_student', { id });
            },

            async bulkImport(records): Promise<number> {
                return invoke<number>('bulk_import_students', {
                    records: records.map(s => ({
                        admissionNumber: s.admissionNumber,
                        rollNumber: s.rollNumber ?? null,
                        firstName: s.firstName,
                        lastName: s.lastName,
                        dateOfBirth: s.dateOfBirth,
                        gender: s.gender,
                        grade: s.grade ?? null,
                        semester: s.semester ?? null,
                        stream: s.stream ?? null,
                        classId: s.classId,
                        section: s.section ?? null,
                        parentName: s.parentName,
                        parentPhone: s.parentPhone,
                        address: s.address,
                    }))
                });
            }
        },

        // ── Staff ──────────────────────────────────────────────────────────────

        staff: {
            async getAll(filters?): Promise<Staff[]> {
                return invoke<Staff[]>('get_staff', {
                    department: filters?.department ?? null,
                    isActive: filters?.isActive ?? null,
                });
            },

            async getById(id): Promise<Staff | null> {
                const staffList = await this.getAll();
                return staffList.find(s => s.id === id) ?? null;
            },

            async create(staffData): Promise<Staff> {
                return invoke<Staff>('create_staff', {
                    data: {
                        employeeId: staffData.employeeId,
                        firstName: staffData.firstName,
                        lastName: staffData.lastName,
                        designation: staffData.designation,
                        department: staffData.department,
                        dateOfJoining: staffData.dateOfJoining,
                        phone: staffData.phone,
                        email: staffData.email ?? null,
                        salary: staffData.salary,
                        isActive: staffData.isActive,
                    }
                });
            },

            async update(id, data): Promise<Staff> {
                return invoke<Staff>('update_staff', {
                    id,
                    data: {
                        employeeId: data.employeeId ?? '',
                        firstName: data.firstName ?? '',
                        lastName: data.lastName ?? '',
                        designation: data.designation ?? '',
                        department: data.department ?? '',
                        dateOfJoining: data.dateOfJoining ?? '',
                        phone: data.phone ?? '',
                        email: data.email ?? null,
                        salary: data.salary ?? 0,
                        isActive: data.isActive ?? true,
                    }
                });
            },

            async delete(id): Promise<void> {
                await invoke('delete_staff', { id });
            },

            async bulkImport(records): Promise<number> {
                let count = 0;
                for (const record of records) {
                    try {
                        await this.create(record);
                        count++;
                    } catch {
                        // Skip duplicates
                    }
                }
                return count;
            }
        },

        // ── Attendance ─────────────────────────────────────────────────────────

        attendance: {
            async getAll(filters?): Promise<AttendanceRecord[]> {
                return invoke<AttendanceRecord[]>('get_attendance', {
                    date: filters?.date ?? null,
                    studentId: filters?.studentId ?? null,
                    staffId: filters?.staffId ?? null,
                });
            },

            async create(recordData): Promise<AttendanceRecord> {
                return invoke<AttendanceRecord>('create_attendance', {
                    data: {
                        studentId: recordData.studentId ?? null,
                        staffId: recordData.staffId ?? null,
                        date: recordData.date,
                        status: recordData.status,
                        remarks: recordData.remarks ?? null,
                        recordedBy: recordData.recordedBy,
                    }
                });
            },

            async bulkCreate(recordsData): Promise<number> {
                return invoke<number>('bulk_create_attendance', {
                    records: recordsData.map(r => ({
                        studentId: r.studentId ?? null,
                        staffId: r.staffId ?? null,
                        date: r.date,
                        status: r.status,
                        remarks: r.remarks ?? null,
                        recordedBy: r.recordedBy,
                    }))
                });
            },

            async getByDateRange(startDate, endDate): Promise<AttendanceRecord[]> {
                return invoke<AttendanceRecord[]>('get_attendance_by_range', { startDate, endDate });
            }
        },

        // ── Salary ─────────────────────────────────────────────────────────────

        salary: {
            async getAll(filters?): Promise<SalaryRecord[]> {
                return invoke<SalaryRecord[]>('get_salary', {
                    staffId: filters?.staffId ?? null,
                    month: filters?.month ?? null,
                    status: filters?.status ?? null,
                });
            },

            async update(id, data): Promise<SalaryRecord> {
                return invoke<SalaryRecord>('update_salary', {
                    id,
                    status: data.status,
                    paymentDate: data.paymentDate ?? null,
                });
            },

            async processBulk(staffIds, month, year, processedBy): Promise<SalaryRecord[]> {
                return invoke<SalaryRecord[]>('process_bulk_salary', {
                    staffIds, month, year, processedBy
                });
            }
        },

        // ── Fees ───────────────────────────────────────────────────────────────

        fees: {
            async getAll(filters?): Promise<FeeRecord[]> {
                return invoke<FeeRecord[]>('get_fees', {
                    studentId: filters?.studentId ?? null,
                    status: filters?.status ?? null,
                    academicYear: filters?.academicYear ?? null,
                });
            },

            async create(recordData): Promise<FeeRecord> {
                return invoke<FeeRecord>('create_fee', {
                    data: {
                        studentId: recordData.studentId,
                        feeType: recordData.feeType,
                        amount: recordData.amount,
                        dueDate: recordData.dueDate,
                        paidAmount: recordData.paidAmount,
                        status: recordData.status,
                        academicYear: recordData.academicYear,
                        remarks: recordData.remarks ?? null,
                    }
                });
            },

            async recordPayment(id, amount): Promise<FeeRecord> {
                return invoke<FeeRecord>('record_fee_payment', { id, amount });
            },

            async bulkImport(recordsData): Promise<number> {
                let count = 0;
                for (const record of recordsData) {
                    try {
                        await this.create(record);
                        count++;
                    } catch {
                        // Skip
                    }
                }
                return count;
            }
        },

        // ── Inventory ──────────────────────────────────────────────────────────

        inventory: {
            async getAll(filters?): Promise<InventoryItem[]> {
                return invoke<InventoryItem[]>('get_inventory', {
                    category: filters?.category ?? null,
                });
            },

            async getById(id): Promise<InventoryItem | null> {
                const items = await this.getAll();
                return items.find(i => i.id === id) ?? null;
            },

            async create(itemData): Promise<InventoryItem> {
                return invoke<InventoryItem>('create_inventory_item', {
                    data: {
                        itemCode: itemData.itemCode,
                        name: itemData.name,
                        category: itemData.category,
                        quantity: itemData.quantity,
                        unit: itemData.unit,
                        unitPrice: itemData.unitPrice,
                        supplier: itemData.supplier ?? null,
                        reorderLevel: itemData.reorderLevel ?? null,
                    }
                });
            },

            async update(id, data): Promise<InventoryItem> {
                return invoke<InventoryItem>('update_inventory_item', {
                    id,
                    data: {
                        itemCode: data.itemCode ?? '',
                        name: data.name ?? '',
                        category: data.category ?? '',
                        quantity: data.quantity ?? 0,
                        unit: data.unit ?? '',
                        unitPrice: data.unitPrice ?? 0,
                        supplier: data.supplier ?? null,
                        reorderLevel: data.reorderLevel ?? null,
                    }
                });
            },

            async delete(id): Promise<void> {
                await invoke('delete_inventory_item', { id });
            },

            async getLowStock(): Promise<InventoryItem[]> {
                return invoke<InventoryItem[]>('get_low_stock');
            },

            async bulkImport(recordsData): Promise<number> {
                let count = 0;
                for (const record of recordsData) {
                    try {
                        await this.create(record);
                        count++;
                    } catch {
                        // Skip duplicates
                    }
                }
                return count;
            }
        },

        // ── Courses ────────────────────────────────────────────────────────────

        courses: {
            async getAll(filters?): Promise<Course[]> {
                return invoke<Course[]>('get_courses', {
                    classId: filters?.classId ?? null,
                    teacherId: filters?.teacherId ?? null,
                });
            },

            async getById(id): Promise<Course | null> {
                const courses = await this.getAll();
                return courses.find(c => c.id === id) ?? null;
            },

            async create(courseData): Promise<Course> {
                return invoke<Course>('create_course', {
                    data: {
                        code: courseData.code,
                        name: courseData.name,
                        description: courseData.description ?? null,
                        credits: courseData.credits,
                        teacherId: courseData.teacherId ?? null,
                        classId: courseData.classId,
                    }
                });
            },

            async update(id, data): Promise<Course> {
                return invoke<Course>('update_course', {
                    id,
                    data: {
                        code: data.code ?? '',
                        name: data.name ?? '',
                        description: data.description ?? null,
                        credits: data.credits ?? 0,
                        teacherId: data.teacherId ?? null,
                        classId: data.classId ?? '',
                    }
                });
            },

            async delete(id): Promise<void> {
                await invoke('delete_course', { id });
            }
        },

        // ── Exams ──────────────────────────────────────────────────────────────

        exams: {
            async getAll(filters?): Promise<ExamRecord[]> {
                return invoke<ExamRecord[]>('get_exams', {
                    studentId: filters?.studentId ?? null,
                    courseId: filters?.courseId ?? null,
                });
            },

            async create(recordData): Promise<ExamRecord> {
                return invoke<ExamRecord>('create_exam', {
                    data: {
                        studentId: recordData.studentId,
                        courseId: recordData.courseId,
                        examType: recordData.examType,
                        marks: recordData.marks,
                        maxMarks: recordData.maxMarks,
                        gradedBy: recordData.gradedBy ?? null,
                        remarks: recordData.remarks ?? null,
                    }
                });
            },

            async update(id, data): Promise<ExamRecord> {
                return invoke<ExamRecord>('update_exam', {
                    id,
                    marks: data.marks,
                    gradedBy: data.gradedBy ?? 'system',
                    remarks: data.remarks ?? null,
                });
            }
        },

        // ── Ledger ─────────────────────────────────────────────────────────────

        ledger: {
            async getAll(filters?): Promise<LedgerEntry[]> {
                return invoke<LedgerEntry[]>('get_ledger', {
                    startDate: filters?.startDate ?? null,
                    endDate: filters?.endDate ?? null,
                    accountCode: filters?.accountCode ?? null,
                });
            },

            async create(entryData): Promise<LedgerEntry> {
                return invoke<LedgerEntry>('create_ledger_entry', {
                    data: {
                        date: entryData.date,
                        accountCode: entryData.accountCode,
                        accountName: entryData.accountName,
                        description: entryData.description,
                        debit: entryData.debit,
                        credit: entryData.credit,
                        balance: entryData.balance,
                        voucherType: entryData.voucherType,
                        voucherNumber: entryData.voucherNumber,
                        createdBy: entryData.createdBy,
                    }
                });
            }
        },

        // ── Sync ───────────────────────────────────────────────────────────────

        sync: {
            async getStatus(): Promise<SyncStatus> {
                return invoke<SyncStatus>('get_sync_status');
            },

            async queueOperation(operation, tableName, recordId, data, userRole): Promise<string> {
                return invoke<string>('queue_sync_operation', {
                    operation, tableName, recordId, data, userRole
                });
            },

            async getPendingOperations(): Promise<SyncQueueEntry[]> {
                return invoke<SyncQueueEntry[]>('get_pending_sync_operations');
            },

            async markSynced(ids): Promise<void> {
                await invoke('mark_operations_synced', { ids });
            },

            async resolveAndApplyRemote(remote): Promise<ConflictResolutionResult> {
                return invoke<ConflictResolutionResult>('resolve_and_apply_remote_change', {
                    remoteOperation: remote.operation,
                    remoteTable: remote.tableName,
                    remoteRecordId: remote.recordId,
                    remoteData: remote.data,
                    remoteUserRole: remote.userRole,
                    remoteTimestamp: remote.timestamp,
                });
            },

            async applySyncedChange(operation, tableName, recordId, data): Promise<void> {
                await invoke('apply_synced_change', { operation, tableName, recordId, data });
            },

            async clearOldOperations(beforeTimestamp): Promise<number> {
                return invoke<number>('clear_synced_operations', { beforeTimestamp });
            }
        }
    };
}