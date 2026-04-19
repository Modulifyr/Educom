# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-18

### Added

- **Modular Desktop Application** - Production-ready Tauri 2.0 desktop application with React 18 frontend
- **Local-First Database** - SQLite database with encrypted local storage for offline capability
- **Background Synchronization** - Sync queue for pending changes with status tracking
- **Four-Layer Architecture** - Presentation, Application, Domain, and Infrastructure layers
- **Role-Based Access Control** - Four-tier permission system (admin, management, finance, teacher)
- **Module System** - Independent feature modules with standardized interfaces:
  - Student Management (CRUD, search, filtering)
  - Staff Management (CRUD, department filtering)
  - Attendance Tracking (student/staff, date-based filtering)
  - Salary Processing (bulk generation, payment tracking)
  - Fee Collection (payment recording, balance tracking)
  - Inventory Management (stock tracking, low-stock alerts)
  - Course Management (assignment, teacher allocation)
  - Examination & Grading (results, averages)
  - Financial Ledger (double-entry bookkeeping)
  - Reports & Analytics (exportable reports)
  - User Management (CRUD, role assignment)
  - Settings (profile, system information)
- **Drag-and-Drop Import** - Automated spreadsheet import with column mapping for XLSX, XLS, CSV
- **One-Click Export** - Export to CSV, XLSX, JSON formats
- **Responsive UI** - Tailwind CSS styling with sidebar navigation and utility dock
- **State Management** - Zustand for centralized client state
- **TypeScript** - Full type safety across all modules
- **Demo Accounts** - Pre-configured users for testing all permission levels

### Security

- SQL injection prevention via parameterized queries (rusqlite)
- Role-based access control enforced at UI and service layers
- Input sanitization on all user inputs
- No secrets or credentials in code

### Performance

- Native desktop performance via Tauri 2.0
- Optimized bundle size (251KB JS + 19KB CSS gzipped)
- Lazy loading of import/export service

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

### Security
-

---

## How to Update This File

Every PR that ships user-facing changes must update the `[Unreleased]` section.

On release:
1. Replace `[Unreleased]` with version and date: `[1.2.0] — 2026-05-01`
2. Add a new blank `[Unreleased]` section at the top
3. Tag the commit: `git tag -a v1.2.0 -m "Release 1.2.0"`
4. Push the tag: `git push origin v1.2.0` (this triggers the release workflow)

### Categories

| Category | Use for |
|---|---|
| `Added` | New features |
| `Changed` | Changes to existing functionality |
| `Deprecated` | Features to be removed in a future release |
| `Removed` | Features removed in this release |
| `Fixed` | Bug fixes |
| `Security` | Security fixes — always include these |

---

## Version History

- `[0.1.0]` — Initial project setup with Tauri template
