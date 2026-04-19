# Educom - Institutional Management System

**Version:** 1.0.0
**Type:** Desktop Application (Tauri + React + TypeScript)
**Architecture:** Modular Monolith with Local-First Data

---

## Overview

Educom is a production-ready modular desktop application for educational institutional management. Built with Tauri 2.0 for native desktop performance, React 18 for the UI, and TypeScript for type safety. The system implements a local-first architecture with encrypted SQLite database for offline capability and background synchronization.

## Features

- **Student Management** - Admission, enrollment, and student records
- **Staff Management** - Employee records, designations, departments
- **Attendance Tracking** - Student and staff attendance with date-based filtering
- **Salary Processing** - Bulk salary generation and payment tracking
- **Fee Collection** - Student fee management with payment recording
- **Inventory Tracking** - Stock management with low-stock alerts
- **Course Management** - Course assignment and teacher allocation
- **Examination & Grading** - Exam records with automatic grading
- **Financial Ledger** - Complete double-entry bookkeeping system
- **Reports & Analytics** - Exportable reports in CSV, XLSX, JSON formats
- **Role-Based Access Control** - Four-tier permission system

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Tauri 2.0 | Native desktop runtime |
| Frontend | React 18 + TypeScript | UI components and state |
| Styling | Tailwind CSS | Utility-first styling |
| State | Zustand | Client state management |
| Database | SQLite (rusqlite) | Local encrypted storage |
| Spreadsheet | xlsx (SheetJS) | Excel import/export |

## System Requirements

- **OS:** Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Runtime:** WebView2 (Windows), WebKit (macOS/Linux)
- **Disk:** 200MB minimum for installation
- **RAM:** 4GB minimum, 8GB recommended

## Installation

### From Release
Download the latest release installer from the releases page and run the installer.

### From Source
```bash
# Clone the repository
git clone https://github.com/org/educom.git
cd educom

# Install dependencies
npm install

# Build frontend
npm run build

# Build Tauri application
npm run tauri build
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TAURI_DEV_HOST` | - | Development host for HMR |
| `RUST_LOG` | `info` | Rust logging level |

## Demo Accounts

The application initializes with four demo accounts for testing:

| Username | Role | Permissions |
|---|---|---|
| `admin` | Administrator | Full system access |
| `manager` | Management | Global visibility, all modules |
| `finance` | Finance | Accounting and payroll only |
| `teacher` | Teacher | Academic and attendance only |

## Architecture

Educom follows a four-layer modular architecture:

```
┌──────────────────────────────────────────────┐
│           Presentation Layer                   │
│  (React components, pages, Sidebar, Dock)    │
├──────────────────────────────────────────────┤
│           Application Layer                   │
│  (Use cases, validation, data orchestration)│
├──────────────────────────────────────────────┤
│             Domain Layer                      │
│  (Entities: Student, Staff, Course, etc.)    │
├──────────────────────────────────────────────┤
│          Infrastructure Layer                │
│  (Database, Import/Export, Tauri commands)  │
└──────────────────────────────────────────────┘
```

### Key Modules

- **Core Shell** - Authentication, routing, layout
- **RBAC Service** - Permission checking, module access
- **Database Service** - CRUD operations, local storage
- **Import/Export Service** - Spreadsheet parsing, file generation

## Data Architecture

### Local Storage
- SQLite database stored in `~/.local/share/educom/educom.db`
- Automatic initialization on first run
- Sync queue for background synchronization

### Database Schema
- **users** - System users with role-based access
- **students** - Student demographic and enrollment data
- **staff** - Employee records with salary information
- **attendance** - Daily attendance records
- **salary** - Processed salary records
- **fees** - Student fee records with payment tracking
- **inventory** - Stock items with reorder levels
- **courses** - Course definitions and assignments
- **exams** - Student examination results
- **ledger** - Double-entry financial transactions
- **sync_queue** - Pending synchronization operations

## Security

- SQL injection prevention via parameterized queries
- Role-based access control enforced at UI and service layers
- No credentials stored in localStorage (demo mode only)
- Input sanitization on all user inputs

See [SECURITY.md](SECURITY.md) for full security policy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

Proprietary - All rights reserved.

---

*Built with Tauri 2.0 · React 18 · TypeScript · Tailwind CSS*
