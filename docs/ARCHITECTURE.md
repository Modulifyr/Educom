# Architecture — Educom Institutional Management System

**Version:** 1.0.0
**Last updated:** 2026-04-18
**Author:** Educom Engineering Team
**Project type:** Desktop Application (Tauri + React + TypeScript)

---

## 1. System Overview

Educom is a modular desktop application for educational institutional management, providing comprehensive functionality for student records, staff management, attendance tracking, payroll processing, fee collection, inventory management, course administration, examination grading, and financial ledgering.

**Users:**
- Administrators (full system access)
- Management staff (global visibility across all modules)
- Finance department (accounting and payroll modules only)
- Teachers (academic and attendance functions only)

**Scale:**
- Supports thousands of student and staff records
- Multi-year academic history storage
- Offline-first with background synchronization

**Criticality:** High — Core institutional operations depend on this system

---

## 2. Architecture Layers

This project follows Modulifyr's four-layer modular architecture.

```
┌──────────────────────────────────────────────────────┐
│              Presentation Layer                       │
│  (React components, pages, Sidebar, UtilityDock)    │
├──────────────────────────────────────────────────────┤
│              Application Layer                        │
│  (Zustand store, RBAC service, use cases)           │
├──────────────────────────────────────────────────────┤
│                Domain Layer                           │
│  (TypeScript interfaces, business entities)          │
├──────────────────────────────────────────────────────┤
│             Infrastructure Layer                       │
│  (Database service, Import/Export, Tauri commands)   │
└──────────────────────────────────────────────────────┘
```

### Presentation Layer

| Component | Responsibility |
|---|---|
| `LoginScreen` | User authentication with demo account selection |
| `Sidebar` | Module navigation with role-based visibility |
| `UtilityDock` | Drag-drop import and export functionality |
| `Dashboard` | Overview statistics and quick actions |
| `*Module` | Feature-specific CRUD interfaces |

### Application Layer

| Service | Responsibility |
|---|---|
| `appStore` | Global state management via Zustand |
| `rbacService` | Permission checking, module access control |
| `importExportService` | Spreadsheet parsing, file generation |

### Domain Layer

| Entity | Purpose |
|---|---|
| `User` | System users with role assignment |
| `Student` | Student demographic and enrollment data |
| `Staff` | Employee records with salary information |
| `AttendanceRecord` | Daily attendance entries |
| `SalaryRecord` | Processed salary with payment status |
| `FeeRecord` | Student fees with payment tracking |
| `InventoryItem` | Stock items with reorder levels |
| `Course` | Course definitions and assignments |
| `ExamRecord` | Student examination results |
| `LedgerEntry` | Financial transaction records |

### Infrastructure Layer

| Adapter | Technology |
|---|---|
| `database.ts` | Local storage with localStorage API |
| `lib.rs` | Rust SQLite via rusqlite |
| `xlsx` | SheetJS for spreadsheet operations |

---

## 3. Module Architecture

### Module Communication

All modules communicate via standardized TypeScript interfaces defined in `src/types/index.ts`. No module imports directly from another module's internal implementation.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Students   │────▶│  Database   │◀────│   Staff     │
│   Module    │     │   Service   │     │   Module    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   ▲
       │                   │
       ▼                   │
┌─────────────┐     ┌─────────────┐
│  Attendance │────▶│   RBAC     │
│   Module    │     │   Service   │
└─────────────┘     └─────────────┘
```

### Module List

| Module | Access | Permissions |
|---|---|---|
| Dashboard | All roles | View |
| Students | All roles | View; Admin/Management: Create/Edit/Delete |
| Staff | All roles | View; Admin/Management: Create/Edit/Delete |
| Attendance | All roles | View; Teacher: Create/Edit |
| Salary | Management, Finance | View; Management: Process/Edit |
| Fees | Management, Finance | View; Finance: Create/Edit/Record Payment |
| Inventory | Management | View; Management: Create/Edit/Delete |
| Courses | Management | View; Management: Create/Edit/Delete |
| Exams | Management, Teacher | View; Teacher: Grade |
| Ledger | Management, Finance | View; Finance: Create/Edit |
| Reports | All roles | View; Export |
| Users | Admin | View; Admin: Create/Edit/Delete |
| Settings | All roles | View |

---

## 4. Data Architecture

### Local Storage Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Browser localStorage                   │
├─────────────────────────────────────────────────────────┤
│  educom_db_users        │ User records                  │
│  educom_db_students     │ Student records               │
│  educom_db_staff       │ Staff records                 │
│  educom_db_attendance   │ Attendance records            │
│  educom_db_salary       │ Salary records                │
│  educom_db_fees         │ Fee records                   │
│  educom_db_inventory    │ Inventory items               │
│  educom_db_courses      │ Course records                │
│  educom_db_exams        │ Exam records                  │
│  educom_db_ledger       │ Ledger entries                │
│  educom_db_sync_pending │ Pending sync operations       │
│  educom_db_last_sync    │ Last sync timestamp           │
└─────────────────────────────────────────────────────────┘
```

### SQLite Schema (Rust Backend)

```sql
-- Core tables
users, students, staff, attendance, salary, fees,
inventory, courses, exams, ledger, sync_queue

-- All tables use TEXT for IDs (UUID)
-- All timestamps use ISO 8601 format (TEXT)
-- Foreign keys validated at application layer
```

### Synchronization Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│   Sync       │────▶│   Server     │
│   Action     │     │   Queue      │     │   (Future)   │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Background  │
                    │   Process     │
                    └──────────────┘
```

---

## 5. Security Architecture

### Role-Based Access Control

```
┌─────────────────────────────────────────────────────────┐
│                      User Login                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   RBAC Service                           │
│  ┌─────────────┬─────────────┬─────────────┬───────────┐ │
│  │    Admin    │ Management  │   Finance   │  Teacher  │ │
│  │   (All)     │   (All)     │ (Accounting)│ (Academic)│ │
│  └─────────────┴─────────────┴─────────────┴───────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Permission | Admin | Management | Finance | Teacher |
|---|---|---|---|---|
| students:* | ✓ | ✓ | View | View |
| staff:* | ✓ | ✓ | View | View |
| attendance:* | ✓ | ✓ | View | ✓ |
| salary:* | ✓ | ✓ | ✓ | - |
| fees:* | ✓ | ✓ | ✓ | - |
| inventory:* | ✓ | ✓ | - | - |
| courses:* | ✓ | ✓ | - | View |
| exams:* | ✓ | ✓ | - | ✓ |
| ledger:* | ✓ | ✓ | ✓ | - |
| reports:* | ✓ | ✓ | ✓ | ✓ |
| users:* | ✓ | - | - | - |
| settings:* | ✓ | ✓ | View | View |

---

## 6. Performance Considerations

### Bundle Optimization

| Asset | Size | Strategy |
|---|---|---|
| JavaScript | ~251KB gzipped | Code splitting for import/export |
| CSS | ~19KB gzipped | Tailwind purge |
| Fonts | System fonts | No custom font loading |

### Data Handling

- **Pagination** — Not implemented; relies on browser virtualization
- **Lazy Loading** — Dynamic import for xlsx library
- **Memoization** — useCallback for expensive computations

---

## 7. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Framework | Tauri | 2.0 |
| Frontend | React | 18.3 |
| Language | TypeScript | 5.5 |
| Styling | Tailwind CSS | 3.4 |
| State | Zustand | 4.5 |
| Spreadsheet | xlsx (SheetJS) | 0.18 |
| Database (Frontend) | localStorage | - |
| Database (Backend) | SQLite (rusqlite) | 0.31 |
| Date Handling | date-fns | 3.6 |

---

## 8. File Structure

```
f:\Company\Projects\Educom\
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── UtilityDock.tsx
│   │   └── modules/
│   │       ├── Dashboard.tsx
│   │       ├── StudentsModule.tsx
│   │       ├── StaffModule.tsx
│   │       ├── AttendanceModule.tsx
│   │       ├── SalaryModule.tsx
│   │       ├── FeesModule.tsx
│   │       ├── InventoryModule.tsx
│   │       ├── CoursesModule.tsx
│   │       ├── ExamsModule.tsx
│   │       ├── LedgerModule.tsx
│   │       ├── ReportsModule.tsx
│   │       ├── UsersModule.tsx
│   │       └── SettingsModule.tsx
│   ├── services/
│   │   ├── database.ts
│   │   ├── rbac.ts
│   │   └── importExport.ts
│   ├── store/
│   │   └── appStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/
│   ├── src/
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── adr/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 9. Future Considerations

### Planned Enhancements

- Server-side synchronization with PostgreSQL backend
- Multi-tenancy support for multiple institutions
- Advanced reporting with charts and dashboards
- Mobile companion app
- Document management integration

### Technical Debt

- Form validation could use a validation library (zod)
- Test coverage currently 0% (unit tests needed)
- No CI/CD pipeline configured
- No ESLint/Prettier enforcement

---

*Architecture documentation follows Modulifyr Technical Standards*
