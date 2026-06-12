import type { UserRole } from '../types';

export type Permission =
  | 'students:view' | 'students:create' | 'students:edit' | 'students:delete'
  | 'staff:view' | 'staff:create' | 'staff:edit' | 'staff:delete'
  | 'attendance:view' | 'attendance:create' | 'attendance:edit' | 'attendance:delete'
  | 'salary:view' | 'salary:create' | 'salary:edit' | 'salary:process'
  | 'fees:view' | 'fees:create' | 'fees:edit' | 'fees:record_payment'
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:delete'
  | 'courses:view' | 'courses:create' | 'courses:edit' | 'courses:delete'
  | 'exams:view' | 'exams:create' | 'exams:grade'
  | 'ledger:view' | 'ledger:create' | 'ledger:edit'
  | 'reports:view' | 'reports:export'
  | 'users:view' | 'users:manage'
  | 'settings:view' | 'settings:edit';

// Role hierarchy for sync conflict resolution (higher index = higher authority)
export const ROLE_HIERARCHY: UserRole[] = ['teacher', 'finance', 'management', 'admin'];

export function compareRoleAuthority(roleA: UserRole, roleB: UserRole): number {
  const idxA = ROLE_HIERARCHY.indexOf(roleA);
  const idxB = ROLE_HIERARCHY.indexOf(roleB);
  return idxA - idxB;
}

// Returns true if roleA has higher or equal authority than roleB
export function roleHasHigherOrEqualAuthority(roleA: UserRole, roleB: UserRole): boolean {
  return compareRoleAuthority(roleA, roleB) >= 0;
}

const rolePermissions: Record<UserRole, Permission[]> = {
  management: [
    'students:view', 'students:create', 'students:edit', 'students:delete',
    'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
    'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete',
    'salary:view', 'salary:create', 'salary:edit', 'salary:process',
    'fees:view', 'fees:create', 'fees:edit', 'fees:record_payment',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'courses:view', 'courses:create', 'courses:edit', 'courses:delete',
    'exams:view', 'exams:create', 'exams:grade',
    'ledger:view', 'ledger:create', 'ledger:edit',
    'reports:view', 'reports:export',
    'users:view', 'users:manage',
    'settings:view', 'settings:edit'
  ],
  finance: [
    'students:view',
    'staff:view',
    'attendance:view',
    'salary:view', 'salary:create', 'salary:edit', 'salary:process',
    'fees:view', 'fees:create', 'fees:edit', 'fees:record_payment',
    'inventory:view',
    'ledger:view', 'ledger:create', 'ledger:edit',
    'reports:view', 'reports:export',
    'settings:view'
  ],
  teacher: [
    'students:view',
    'staff:view',
    'attendance:view', 'attendance:create', 'attendance:edit',
    'courses:view',
    'exams:view', 'exams:create', 'exams:grade',
    'reports:view'
  ],
  admin: [
    'students:view', 'students:create', 'students:edit', 'students:delete',
    'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
    'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete',
    'salary:view', 'salary:create', 'salary:edit', 'salary:process',
    'fees:view', 'fees:create', 'fees:edit', 'fees:record_payment',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'courses:view', 'courses:create', 'courses:edit', 'courses:delete',
    'exams:view', 'exams:create', 'exams:grade',
    'ledger:view', 'ledger:create', 'ledger:edit',
    'reports:view', 'reports:export',
    'users:view', 'users:manage',
    'settings:view', 'settings:edit'
  ]
};

export const rbacService = {
  hasPermission(role: UserRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
  },

  hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(role, p));
  },

  hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(role, p));
  },

  getPermissions(role: UserRole): Permission[] {
    return rolePermissions[role] || [];
  },

  canAccessModule(role: UserRole, module: string): boolean {
    const modulePermissions: Record<string, Permission[]> = {
      attendance: ['attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete'],
      salary: ['salary:view', 'salary:create', 'salary:edit', 'salary:process'],
      fees: ['fees:view', 'fees:create', 'fees:edit', 'fees:record_payment'],
      inventory: ['inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete'],
      courses: ['courses:view', 'courses:create', 'courses:edit', 'courses:delete'],
      exams: ['exams:view', 'exams:create', 'exams:grade'],
      ledger: ['ledger:view', 'ledger:create', 'ledger:edit'],
      students: ['students:view', 'students:create', 'students:edit', 'students:delete'],
      staff: ['staff:view', 'staff:create', 'staff:edit', 'staff:delete'],
      reports: ['reports:view', 'reports:export'],
      users: ['users:view', 'users:manage'],
      settings: ['settings:view', 'settings:edit']
    };
    
    const required = modulePermissions[module];
    if (!required) return false;
    return this.hasAnyPermission(role, required);
  },

  getAccessibleModules(role: UserRole): string[] {
    const modules = ['attendance', 'salary', 'fees', 'inventory', 'courses', 'exams', 'ledger', 'students', 'staff', 'reports', 'users', 'settings'];
    return modules.filter(m => this.canAccessModule(role, m));
  },

  getRoleDisplayName(role: UserRole): string {
    const names: Record<UserRole, string> = {
      management: 'Management',
      finance: 'Finance Department',
      teacher: 'Teacher',
      admin: 'Administrator'
    };
    return names[role] || role;
  }
};
