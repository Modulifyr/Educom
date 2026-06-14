use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use argon2::password_hash::{PasswordHash, rand_core::OsRng};
use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::{Connection, params};
use chrono::Utc;
use uuid::Uuid;
use once_cell::sync::Lazy;
use parking_lot::{Mutex, RwLock};
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::AtomicU64;
use std::time::{Duration, Instant};
use tracing::{info, warn, error};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use sentry::{init, capture_message, ClientOptions};

const SQLITE_CONSTRAINT_UNIQUE_CODE: i32 = 1555;

fn sqlite_error_to_string(err: rusqlite::Error, default_msg: &str) -> String {
    match err {
        rusqlite::Error::SqliteFailure(code, _) => {
            if code.extended_code == SQLITE_CONSTRAINT_UNIQUE_CODE {
                default_msg.to_string()
            } else {
                err.to_string()
            }
        }
        _ => err.to_string(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain structs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub role: String,
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub email: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastLogin")]
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Student {
    pub id: String,
    #[serde(rename = "admissionNumber")]
    pub admission_number: String,
    #[serde(rename = "rollNumber")]
    pub roll_number: Option<String>,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    #[serde(rename = "dateOfBirth")]
    pub date_of_birth: String,
    #[serde(rename = "enrollmentDate")]
    pub enrollment_date: Option<String>,
    pub gender: String,
    pub grade: Option<String>,
    pub semester: Option<String>,
    pub stream: Option<String>,
    #[serde(rename = "classId")]
    pub class_id: String,
    pub section: Option<String>,
    #[serde(rename = "parentName")]
    pub parent_name: String,
    #[serde(rename = "parentPhone")]
    pub parent_phone: String,
    pub address: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudentInput {
    #[serde(rename = "admissionNumber")]
    pub admission_number: String,
    #[serde(rename = "rollNumber")]
    pub roll_number: Option<String>,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    #[serde(rename = "dateOfBirth")]
    pub date_of_birth: String,
    #[serde(rename = "enrollmentDate")]
    pub enrollment_date: Option<String>,
    pub gender: String,
    pub grade: Option<String>,
    pub semester: Option<String>,
    pub stream: Option<String>,
    #[serde(rename = "classId")]
    pub class_id: String,
    pub section: Option<String>,
    #[serde(rename = "parentName")]
    pub parent_name: String,
    #[serde(rename = "parentPhone")]
    pub parent_phone: String,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Staff {
    pub id: String,
    #[serde(rename = "employeeId")]
    pub employee_id: String,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    pub designation: String,
    pub department: String,
    #[serde(rename = "dateOfJoining")]
    pub date_of_joining: String,
    pub phone: String,
    pub email: Option<String>,
    pub salary: f64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StaffInput {
    #[serde(rename = "employeeId")]
    pub employee_id: String,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    pub designation: String,
    pub department: String,
    #[serde(rename = "dateOfJoining")]
    pub date_of_joining: String,
    pub phone: String,
    pub email: Option<String>,
    pub salary: f64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttendanceRecord {
    pub id: String,
    #[serde(rename = "studentId")]
    pub student_id: Option<String>,
    #[serde(rename = "staffId")]
    pub staff_id: Option<String>,
    pub date: String,
    pub status: String,
    pub remarks: Option<String>,
    #[serde(rename = "recordedBy")]
    pub recorded_by: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttendanceInput {
    #[serde(rename = "studentId")]
    pub student_id: Option<String>,
    #[serde(rename = "staffId")]
    pub staff_id: Option<String>,
    pub date: String,
    pub status: String,
    pub remarks: Option<String>,
    #[serde(rename = "recordedBy")]
    pub recorded_by: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalaryRecord {
    pub id: String,
    #[serde(rename = "staffId")]
    pub staff_id: String,
    pub month: String,
    pub year: i32,
    #[serde(rename = "baseSalary")]
    pub base_salary: f64,
    pub allowances: f64,
    pub deductions: f64,
    #[serde(rename = "netSalary")]
    pub net_salary: f64,
    #[serde(rename = "paymentDate")]
    pub payment_date: Option<String>,
    pub status: String,
    #[serde(rename = "processedBy")]
    pub processed_by: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalaryOverride {
    #[serde(rename = "staffId")]
    pub staff_id: String,
    pub allowances: f64,
    pub deductions: f64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeeRecord {
    pub id: String,
    #[serde(rename = "studentId")]
    pub student_id: String,
    #[serde(rename = "feeType")]
    pub fee_type: String,
    pub amount: f64,
    #[serde(rename = "dueDate")]
    pub due_date: String,
    #[serde(rename = "paidAmount")]
    pub paid_amount: f64,
    #[serde(rename = "paymentDate")]
    pub payment_date: Option<String>,
    pub status: String,
    #[serde(rename = "academicYear")]
    pub academic_year: String,
    pub remarks: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeeInput {
    #[serde(rename = "studentId")]
    pub student_id: String,
    #[serde(rename = "feeType")]
    pub fee_type: String,
    pub amount: f64,
    #[serde(rename = "dueDate")]
    pub due_date: String,
    #[serde(rename = "paidAmount")]
    pub paid_amount: f64,
    pub status: String,
    #[serde(rename = "academicYear")]
    pub academic_year: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryItem {
    pub id: String,
    #[serde(rename = "itemCode")]
    pub item_code: String,
    pub name: String,
    pub category: String,
    pub quantity: i32,
    pub unit: String,
    #[serde(rename = "unitPrice")]
    pub unit_price: f64,
    pub supplier: Option<String>,
    #[serde(rename = "reorderLevel")]
    pub reorder_level: Option<i32>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryInput {
    #[serde(rename = "itemCode")]
    pub item_code: String,
    pub name: String,
    pub category: String,
    pub quantity: i32,
    pub unit: String,
    #[serde(rename = "unitPrice")]
    pub unit_price: f64,
    pub supplier: Option<String>,
    #[serde(rename = "reorderLevel")]
    pub reorder_level: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub credits: i32,
    #[serde(rename = "teacherId")]
    pub teacher_id: Option<String>,
    #[serde(rename = "classId")]
    pub class_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CourseInput {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub credits: i32,
    #[serde(rename = "teacherId")]
    pub teacher_id: Option<String>,
    #[serde(rename = "classId")]
    pub class_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExamRecord {
    pub id: String,
    #[serde(rename = "studentId")]
    pub student_id: String,
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "examType")]
    pub exam_type: String,
    pub marks: f64,
    #[serde(rename = "maxMarks")]
    pub max_marks: f64,
    #[serde(rename = "gradedBy")]
    pub graded_by: Option<String>,
    #[serde(rename = "gradedAt")]
    pub graded_at: Option<String>,
    pub remarks: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExamInput {
    #[serde(rename = "studentId")]
    pub student_id: String,
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "examType")]
    pub exam_type: String,
    pub marks: f64,
    #[serde(rename = "maxMarks")]
    pub max_marks: f64,
    #[serde(rename = "gradedBy")]
    pub graded_by: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    pub id: String,
    pub date: String,
    #[serde(rename = "accountCode")]
    pub account_code: String,
    #[serde(rename = "accountName")]
    pub account_name: String,
    pub description: String,
    pub debit: f64,
    pub credit: f64,
    pub balance: f64,
    #[serde(rename = "voucherType")]
    pub voucher_type: String,
    #[serde(rename = "voucherNumber")]
    pub voucher_number: String,
    #[serde(rename = "createdBy")]
    pub created_by: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerInput {
    pub date: String,
    #[serde(rename = "accountCode")]
    pub account_code: String,
    #[serde(rename = "accountName")]
    pub account_name: String,
    pub description: String,
    pub debit: f64,
    pub credit: f64,
    pub balance: f64,
    #[serde(rename = "voucherType")]
    pub voucher_type: String,
    #[serde(rename = "voucherNumber")]
    pub voucher_number: String,
    #[serde(rename = "createdBy")]
    pub created_by: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserCreateInput {
    pub username: String,
    pub role: String,
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub email: Option<String>,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncStatus {
    #[serde(rename = "lastSyncTime")]
    pub last_sync_time: String,
    #[serde(rename = "pendingChanges")]
    pub pending_changes: i32,
    #[serde(rename = "syncState")]
    pub sync_state: String,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncQueueEntry {
    pub id: String,
    pub operation: String,
    pub table_name: String,
    pub record_id: String,
    pub data: String,
    pub user_role: String,
    pub timestamp: String,
    pub synced: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictResolutionResult {
    pub resolution: String,
    pub winning_data: Option<String>,
    pub conflict_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invite {
    pub id: String,
    #[serde(rename = "inviteCode")]
    pub invite_code: String,
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub role: String,
    pub username: String,
    pub password_hash: String,
    pub status: String,
    #[serde(rename = "createdBy")]
    pub created_by: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
    #[serde(rename = "usedBy")]
    pub used_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InviteCreateInput {
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub role: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InviteAcceptInput {
    #[serde(rename = "inviteCode")]
    pub invite_code: String,
    #[serde(rename = "serverUrl")]
    pub server_url: Option<String>,
}

// ── New structs for settings and updates ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstitutionSettings {
    #[serde(rename = "institutionName")]
    pub institution_name: String,
    #[serde(rename = "institutionType")]
    pub institution_type: String,
    #[serde(rename = "academicYear")]
    pub academic_year: String,
    pub currency: String,
    #[serde(rename = "githubRepo")]
    pub github_repo: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    #[serde(rename = "currentVersion")]
    pub current_version: String,
    #[serde(rename = "latestVersion")]
    pub latest_version: String,
    #[serde(rename = "releaseNotes")]
    pub release_notes: String,
    #[serde(rename = "releaseUrl")]
    pub release_url: String,
    #[serde(rename = "publishedAt")]
    pub published_at: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Role hierarchy
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: [&str; 4] = ["teacher", "finance", "management", "admin"];

fn role_to_authority(role: &str) -> i32 {
    ROLE_HIERARCHY.iter().position(|&r| r == role).map(|p| p as i32).unwrap_or(-1)
}

fn resolve_conflict(
    local_authority: i32,
    remote_authority: i32,
    local_timestamp: &str,
    remote_timestamp: &str,
) -> ConflictResolutionResult {
    if local_authority > remote_authority {
        ConflictResolutionResult { resolution: "local".to_string(), winning_data: None, conflict_type: "update_update".to_string() }
    } else if remote_authority > local_authority {
        ConflictResolutionResult { resolution: "remote".to_string(), winning_data: None, conflict_type: "update_update".to_string() }
    } else if local_timestamp >= remote_timestamp {
        ConflictResolutionResult { resolution: "local".to_string(), winning_data: None, conflict_type: "update_update".to_string() }
    } else {
        ConflictResolutionResult { resolution: "remote".to_string(), winning_data: None, conflict_type: "update_update".to_string() }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// App state
// ─────────────────────────────────────────────────────────────────────────────

pub(crate) struct LoginAttempt {
    count: u32,
    first_attempt: Instant,
    locked_until: Option<Instant>,
}

impl Clone for LoginAttempt {
    fn clone(&self) -> Self {
        LoginAttempt { count: self.count, first_attempt: self.first_attempt, locked_until: self.locked_until }
    }
}

#[derive(Clone)]
struct DbState {
    db: Arc<Mutex<Connection>>,
    login_attempts: Arc<Mutex<HashMap<String, LoginAttempt>>>,
}

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub server_mode: RwLock<String>,
    pub server_url: RwLock<Option<String>>,
    pub http_server_handle: Mutex<Option<tokio::task::JoinHandle<()>>>,
    pub(crate) login_attempts: Arc<Mutex<HashMap<String, LoginAttempt>>>,
    pub db_stats: DbStats,
}

#[derive(Default)]
pub struct DbStats {
    pub acquire_count: AtomicU64,
    pub contention_count: AtomicU64,
    pub total_wait_ms: AtomicU64,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            db: Arc::new(Mutex::new(Connection::open(":memory:").unwrap())),
            server_mode: RwLock::new("standalone".to_string()),
            server_url: RwLock::new(None),
            http_server_handle: Mutex::new(None),
            login_attempts: Arc::new(Mutex::new(HashMap::new())),
            db_stats: DbStats::default(),
        }
    }
}

const MAX_LOGIN_ATTEMPTS: u32 = 5;
const LOCKOUT_DURATION: Duration = Duration::from_secs(300);
const ATTEMPT_WINDOW: Duration = Duration::from_secs(900);

// ─────────────────────────────────────────────────────────────────────────────
// Password helpers
// ─────────────────────────────────────────────────────────────────────────────

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(password_hash.to_string())
}

fn verify_password(password: &str, stored_hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(stored_hash)?;
    let argon2 = Argon2::default();
    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(e),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────────────────────

fn check_rate_limit(state: &DbState, username: &str) -> Result<(), String> {
    let mut attempts = state.login_attempts.lock();
    let now = Instant::now();
    if let Some(attempt) = attempts.get(username) {
        if let Some(locked_until) = attempt.locked_until {
            if now < locked_until {
                let remaining = locked_until.duration_since(now).as_secs();
                return Err(format!("Account locked. Try again in {} seconds.", remaining));
            }
            attempts.remove(username);
            return Ok(());
        }
        if now.duration_since(attempt.first_attempt) < ATTEMPT_WINDOW {
            if attempt.count >= MAX_LOGIN_ATTEMPTS {
                let mut locked = attempt.clone();
                locked.locked_until = Some(now + LOCKOUT_DURATION);
                attempts.insert(username.to_string(), locked);
                return Err(format!("Too many attempts. Locked for {} seconds.", LOCKOUT_DURATION.as_secs()));
            }
        } else {
            attempts.remove(username);
        }
    }
    Ok(())
}

fn record_failed_attempt(state: &DbState, username: &str) {
    let mut attempts = state.login_attempts.lock();
    let now = Instant::now();
    if let Some(attempt) = attempts.get_mut(username) {
        if now.duration_since(attempt.first_attempt) >= ATTEMPT_WINDOW {
            *attempt = LoginAttempt { count: 1, first_attempt: now, locked_until: None };
        } else {
            attempt.count += 1;
        }
    } else {
        attempts.insert(username.to_string(), LoginAttempt { count: 1, first_attempt: now, locked_until: None });
    }
}

fn clear_login_attempts(state: &DbState, username: &str) {
    let mut attempts = state.login_attempts.lock();
    attempts.remove(username);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database init
// ─────────────────────────────────────────────────────────────────────────────

fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;"
    )?;

    conn.execute("CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','management','finance','teacher')),
        full_name TEXT NOT NULL, email TEXT, password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, last_login TEXT
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY, admission_number TEXT UNIQUE NOT NULL, roll_number TEXT,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL, date_of_birth TEXT NOT NULL,
        enrollment_date TEXT, gender TEXT NOT NULL CHECK(gender IN ('male','female','other')),
        grade TEXT, semester TEXT, stream TEXT, class_id TEXT NOT NULL, section TEXT,
        parent_name TEXT NOT NULL, parent_phone TEXT NOT NULL, address TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT DEFAULT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY, employee_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL, designation TEXT NOT NULL,
        department TEXT NOT NULL, date_of_joining TEXT NOT NULL, phone TEXT NOT NULL,
        email TEXT, salary REAL NOT NULL CHECK(salary >= 0), is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL, deleted_at TEXT DEFAULT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY, student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
        staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL, date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
        remarks TEXT, recorded_by TEXT NOT NULL, created_at TEXT NOT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS salary (
        id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        month TEXT NOT NULL, year INTEGER NOT NULL, base_salary REAL NOT NULL,
        allowances REAL NOT NULL DEFAULT 0, deductions REAL NOT NULL DEFAULT 0,
        net_salary REAL NOT NULL, payment_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')),
        processed_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(staff_id, month, year)
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS fees (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        fee_type TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), due_date TEXT NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0, payment_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial','paid','overdue')),
        academic_year TEXT NOT NULL, remarks TEXT, created_at TEXT NOT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY, item_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        category TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        unit TEXT NOT NULL, unit_price REAL NOT NULL CHECK(unit_price >= 0),
        supplier TEXT, reorder_level INTEGER, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, deleted_at TEXT DEFAULT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        description TEXT, credits INTEGER NOT NULL DEFAULT 0,
        teacher_id TEXT REFERENCES staff(id) ON DELETE SET NULL, class_id TEXT NOT NULL,
        created_at TEXT NOT NULL, deleted_at TEXT DEFAULT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        exam_type TEXT NOT NULL CHECK(exam_type IN ('quiz','midterm','final','assignment')),
        marks REAL NOT NULL CHECK(marks >= 0), max_marks REAL NOT NULL CHECK(max_marks > 0),
        graded_by TEXT, graded_at TEXT, remarks TEXT, created_at TEXT NOT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS ledger (
        id TEXT PRIMARY KEY, date TEXT NOT NULL, account_code TEXT NOT NULL,
        account_name TEXT NOT NULL, description TEXT NOT NULL,
        debit REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
        credit REAL NOT NULL DEFAULT 0 CHECK(credit >= 0), balance REAL NOT NULL,
        voucher_type TEXT NOT NULL, voucher_number TEXT NOT NULL,
        created_by TEXT NOT NULL, created_at TEXT NOT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL,
        table_name TEXT NOT NULL, record_id TEXT NOT NULL,
        old_value TEXT, new_value TEXT, created_at TEXT NOT NULL
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY, operation TEXT NOT NULL, table_name TEXT NOT NULL,
        record_id TEXT NOT NULL, data TEXT NOT NULL, user_role TEXT NOT NULL,
        timestamp TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0
    )", [])?;

    conn.execute("CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY, invite_code TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','management','finance','teacher')),
        username TEXT NOT NULL, password_hash TEXT NOT NULL, created_by TEXT NOT NULL,
        created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired')),
        used_by TEXT
    )", [])?;

    // Institution settings — key/value store
    conn.execute("CREATE TABLE IF NOT EXISTS institution_settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
    )", [])?;

    // Migrations — safe to run every time, errors ignored if column exists
    let migrations: Vec<(&str, &str)> = vec![
        ("ALTER TABLE students ADD COLUMN roll_number TEXT", ""),
        ("ALTER TABLE students ADD COLUMN grade TEXT", ""),
        ("ALTER TABLE students ADD COLUMN semester TEXT", ""),
        ("ALTER TABLE students ADD COLUMN stream TEXT", ""),
        ("ALTER TABLE students ADD COLUMN enrollment_date TEXT", ""),
        ("ALTER TABLE students ADD COLUMN deleted_at TEXT DEFAULT NULL", ""),
        ("ALTER TABLE staff ADD COLUMN deleted_at TEXT DEFAULT NULL", ""),
        ("ALTER TABLE inventory ADD COLUMN deleted_at TEXT DEFAULT NULL", ""),
        ("ALTER TABLE courses ADD COLUMN deleted_at TEXT DEFAULT NULL", ""),
    ];
    for (sql, _) in migrations {
        conn.execute(sql, []).ok();
    }

    // Indexes
    let indexes = [
        "CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)",
        "CREATE INDEX IF NOT EXISTS idx_students_deleted ON students(deleted_at)",
        "CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)",
        "CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_staff_deleted ON staff(deleted_at)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_staff ON attendance(staff_id)",
        "CREATE INDEX IF NOT EXISTS idx_salary_staff ON salary(staff_id)",
        "CREATE INDEX IF NOT EXISTS idx_salary_month_year ON salary(month, year)",
        "CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status)",
        "CREATE INDEX IF NOT EXISTS idx_fees_academic_year ON fees(academic_year)",
        "CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category)",
        "CREATE INDEX IF NOT EXISTS idx_inventory_deleted ON inventory(deleted_at)",
        "CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id)",
        "CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id)",
        "CREATE INDEX IF NOT EXISTS idx_courses_deleted ON courses(deleted_at)",
        "CREATE INDEX IF NOT EXISTS idx_exams_student ON exams(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account_code)",
        "CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)",
        "CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code)",
        "CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status)",
    ];
    for sql in &indexes {
        conn.execute(sql, [])?;
    }

    Ok(())
}

// In debug builds only — seeds one admin user if the DB is empty
#[cfg(debug_assertions)]
fn seed_demo_data(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
    if count > 0 { return Ok(()); }
    // No longer seeding a default user — the setup wizard handles first-run
    info!("Empty database — setup wizard will run on first launch");
    Ok(())
}

#[cfg(not(debug_assertions))]
fn seed_demo_data(_conn: &Connection) -> Result<(), rusqlite::Error> { Ok(()) }

// ─────────────────────────────────────────────────────────────────────────────
// Audit helper
// ─────────────────────────────────────────────────────────────────────────────

fn audit(conn: &Connection, user_id: &str, action: &str, table_name: &str, record_id: &str, old_value: Option<&str>, new_value: Option<&str>) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, table_name, record_id, old_value, new_value, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![Uuid::new_v4().to_string(), user_id, action, table_name, record_id, old_value, new_value, now],
    ).map_err(|e| format!("Audit log failed: {}", e))?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn authenticate_user(state: State<'_, AppState>, username: String, password: String) -> Result<Option<User>, String> {
    let db_state = DbState { db: state.db.clone(), login_attempts: state.login_attempts.clone() };
    if let Err(e) = check_rate_limit(&db_state, &username) {
        warn!("Login rate limit exceeded for user: {}", username);
        return Err(e);
    }
    tokio::task::spawn_blocking(move || {
        let conn = db_state.db.lock();
        let result = conn.query_row(
            "SELECT id, username, role, full_name, email, password_hash, created_at, last_login FROM users WHERE username = ?1",
            params![&username],
            |row| Ok((row.get::<_,String>(0)?, row.get::<_,String>(1)?, row.get::<_,String>(2)?, row.get::<_,String>(3)?, row.get::<_,Option<String>>(4)?, row.get::<_,String>(5)?, row.get::<_,String>(6)?, row.get::<_,Option<String>>(7)?)),
        );
        match result {
            Ok((id, uname, role, full_name, email, hash, created_at, _)) => {
                drop(conn);
                let is_valid = verify_password(&password, &hash).map_err(|e| e.to_string())?;
                if !is_valid {
                    warn!("Failed login for: {}", username);
                    record_failed_attempt(&db_state, &username);
                    return Ok(None);
                }
                let conn = db_state.db.lock();
                let now = Utc::now().to_rfc3339();
                let _ = conn.execute("UPDATE users SET last_login = ?1 WHERE id = ?2", params![&now, &id]);
                clear_login_attempts(&db_state, &username);
                let _ = audit(&conn, &id, "LOGIN", "users", &id, None, None);
                info!("User {} logged in", username);
                Ok(Some(User { id, username: uname, role, full_name, email, created_at, last_login: Some(now) }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                record_failed_attempt(&db_state, &username);
                Ok(None)
            }
            Err(e) => Err(e.to_string()),
        }
    }).await.map_err(|e| e.to_string())?
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_users(state: State<AppState>) -> Result<Vec<User>, String> {
    let conn = state.db.lock();
    let mut stmt = conn.prepare("SELECT id, username, role, full_name, email, created_at, last_login FROM users ORDER BY created_at").map_err(|e| e.to_string())?;
    stmt.query_map([], |row| Ok(User { id: row.get(0)?, username: row.get(1)?, role: row.get(2)?, full_name: row.get(3)?, email: row.get(4)?, created_at: row.get(5)?, last_login: row.get(6)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_user(state: State<AppState>, data: UserCreateInput) -> Result<User, String> {
    let valid_roles = ["admin","management","finance","teacher"];
    if !valid_roles.contains(&data.role.as_str()) { return Err(format!("Invalid role: {}", data.role)); }
    if data.username.trim().is_empty() { return Err("Username cannot be empty".to_string()); }
    if data.password.len() < 8 { return Err("Password must be at least 8 characters".to_string()); }
    let conn = state.db.lock();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let hash = hash_password(&data.password).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (id, username, role, full_name, email, password_hash, password_salt, created_at) VALUES (?1,?2,?3,?4,?5,?6,'',?7)",
        params![&id, &data.username, &data.role, &data.full_name, &data.email, &hash, &now],
    ).map_err(|e| sqlite_error_to_string(e, "Username already exists"))?;
    Ok(User { id, username: data.username, role: data.role, full_name: data.full_name, email: data.email, created_at: now, last_login: None })
}

#[tauri::command]
fn update_user(state: State<AppState>, id: String, full_name: Option<String>, email: Option<String>, role: Option<String>, password: Option<String>) -> Result<User, String> {
    let conn = state.db.lock();
    if let Some(ref r) = role {
        let valid_roles = ["admin","management","finance","teacher"];
        if !valid_roles.contains(&r.as_str()) { return Err(format!("Invalid role: {}", r)); }
    }
    if let Some(ref v) = full_name { conn.execute("UPDATE users SET full_name = ?1 WHERE id = ?2", params![v, &id]).map_err(|e| e.to_string())?; }
    if let Some(ref v) = email { conn.execute("UPDATE users SET email = ?1 WHERE id = ?2", params![v, &id]).map_err(|e| e.to_string())?; }
    if let Some(ref v) = role { conn.execute("UPDATE users SET role = ?1 WHERE id = ?2", params![v, &id]).map_err(|e| e.to_string())?; }
    if let Some(ref pwd) = password {
        if pwd.len() < 8 { return Err("Password must be at least 8 characters".to_string()); }
        let hash = hash_password(pwd).map_err(|e| e.to_string())?;
        conn.execute("UPDATE users SET password_hash = ?1 WHERE id = ?2", params![hash, &id]).map_err(|e| e.to_string())?;
    }
    conn.query_row("SELECT id, username, role, full_name, email, created_at, last_login FROM users WHERE id = ?1", params![&id],
        |row| Ok(User { id: row.get(0)?, username: row.get(1)?, role: row.get(2)?, full_name: row.get(3)?, email: row.get(4)?, created_at: row.get(5)?, last_login: row.get(6)? }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_user(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.lock().execute("DELETE FROM users WHERE id = ?1", params![&id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_student(row: &rusqlite::Row) -> rusqlite::Result<Student> {
    Ok(Student {
        id: row.get(0)?, admission_number: row.get(1)?, roll_number: row.get(2)?,
        first_name: row.get(3)?, last_name: row.get(4)?, date_of_birth: row.get(5)?,
        enrollment_date: row.get(6)?, gender: row.get(7)?, grade: row.get(8)?,
        semester: row.get(9)?, stream: row.get(10)?, class_id: row.get(11)?,
        section: row.get(12)?, parent_name: row.get(13)?, parent_phone: row.get(14)?,
        address: row.get(15)?, created_at: row.get(16)?, updated_at: row.get(17)?,
    })
}

#[tauri::command]
fn get_students(state: State<AppState>, class_id: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Student>, String> {
    let conn = state.db.lock();
    let lim = limit.unwrap_or(1000);
    let off = offset.unwrap_or(0);
    let sql = if class_id.is_some() {
        format!("SELECT id, admission_number, roll_number, first_name, last_name, date_of_birth, enrollment_date, gender, grade, semester, stream, class_id, section, parent_name, parent_phone, address, created_at, updated_at FROM students WHERE class_id = ?1 AND deleted_at IS NULL ORDER BY last_name, first_name LIMIT {} OFFSET {}", lim, off)
    } else {
        format!("SELECT id, admission_number, roll_number, first_name, last_name, date_of_birth, enrollment_date, gender, grade, semester, stream, class_id, section, parent_name, parent_phone, address, created_at, updated_at FROM students WHERE deleted_at IS NULL ORDER BY last_name, first_name LIMIT {} OFFSET {}", lim, off)
    };
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    if let Some(cid) = class_id {
        stmt.query_map(params![cid], row_to_student)
    } else {
        stmt.query_map([], row_to_student)
    }.map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_student(state: State<AppState>, data: StudentInput) -> Result<Student, String> {
    if data.first_name.trim().is_empty() || data.last_name.trim().is_empty() { return Err("First and last name required".to_string()); }
    if data.admission_number.trim().is_empty() { return Err("Admission number required".to_string()); }
    let conn = state.db.lock();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO students (id, admission_number, roll_number, first_name, last_name, date_of_birth, enrollment_date, gender, grade, semester, stream, class_id, section, parent_name, parent_phone, address, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![&id, &data.admission_number, &data.roll_number, &data.first_name, &data.last_name, &data.date_of_birth, &data.enrollment_date, &data.gender, &data.grade, &data.semester, &data.stream, &data.class_id, &data.section, &data.parent_name, &data.parent_phone, &data.address, &now, &now],
    ).map_err(|e| sqlite_error_to_string(e, "Admission number already exists"))?;
    Ok(Student { id, admission_number: data.admission_number, roll_number: data.roll_number, first_name: data.first_name, last_name: data.last_name, date_of_birth: data.date_of_birth, enrollment_date: data.enrollment_date, gender: data.gender, grade: data.grade, semester: data.semester, stream: data.stream, class_id: data.class_id, section: data.section, parent_name: data.parent_name, parent_phone: data.parent_phone, address: data.address, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
fn update_student(state: State<AppState>, id: String, data: StudentInput) -> Result<Student, String> {
    let conn = state.db.lock();
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE students SET admission_number=?1, roll_number=?2, first_name=?3, last_name=?4, date_of_birth=?5, enrollment_date=?6, gender=?7, grade=?8, semester=?9, stream=?10, class_id=?11, section=?12, parent_name=?13, parent_phone=?14, address=?15, updated_at=?16 WHERE id=?17",
        params![&data.admission_number, &data.roll_number, &data.first_name, &data.last_name, &data.date_of_birth, &data.enrollment_date, &data.gender, &data.grade, &data.semester, &data.stream, &data.class_id, &data.section, &data.parent_name, &data.parent_phone, &data.address, &now, &id],
    ).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Student not found".to_string()); }
    Ok(Student { id, admission_number: data.admission_number, roll_number: data.roll_number, first_name: data.first_name, last_name: data.last_name, date_of_birth: data.date_of_birth, enrollment_date: data.enrollment_date, gender: data.gender, grade: data.grade, semester: data.semester, stream: data.stream, class_id: data.class_id, section: data.section, parent_name: data.parent_name, parent_phone: data.parent_phone, address: data.address, created_at: String::new(), updated_at: now })
}

#[tauri::command]
fn delete_student(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock();
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute("UPDATE students SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL", params![&now, &id]).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Student not found or already deleted".to_string()); }
    Ok(())
}

#[tauri::command]
fn bulk_import_students(state: State<AppState>, records: Vec<StudentInput>) -> Result<i32, String> {
    let conn = state.db.lock();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut count = 0i32;
    for data in &records {
        let id = Uuid::new_v4().to_string();
        if tx.execute(
            "INSERT OR IGNORE INTO students (id, admission_number, roll_number, first_name, last_name, date_of_birth, enrollment_date, gender, grade, semester, stream, class_id, section, parent_name, parent_phone, address, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
            params![&id, &data.admission_number, &data.roll_number, &data.first_name, &data.last_name, &data.date_of_birth, &data.enrollment_date, &data.gender, &data.grade, &data.semester, &data.stream, &data.class_id, &data.section, &data.parent_name, &data.parent_phone, &data.address, &now, &now],
        ).map(|r| r == 1).unwrap_or(false) { count += 1; }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_staff(row: &rusqlite::Row) -> rusqlite::Result<Staff> {
    Ok(Staff { id: row.get(0)?, employee_id: row.get(1)?, first_name: row.get(2)?, last_name: row.get(3)?, designation: row.get(4)?, department: row.get(5)?, date_of_joining: row.get(6)?, phone: row.get(7)?, email: row.get(8)?, salary: row.get(9)?, is_active: row.get::<_,i32>(10)? != 0, created_at: row.get(11)? })
}

#[tauri::command]
fn get_staff(state: State<AppState>, department: Option<String>, is_active: Option<bool>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Staff>, String> {
    let conn = state.db.lock();
    let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec!["deleted_at IS NULL".to_string()];
    if department.is_some() { conditions.push("department = ?".to_string()); }
    if is_active.is_some() { conditions.push("is_active = ?".to_string()); }
    let sql = format!("SELECT id, employee_id, first_name, last_name, designation, department, date_of_joining, phone, email, salary, is_active, created_at FROM staff WHERE {} ORDER BY last_name, first_name LIMIT {} OFFSET {}", conditions.join(" AND "), lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    match (&department, &is_active) {
        (Some(d), Some(a)) => { let ai = if *a {1i32} else {0i32}; stmt.query_map(params![d, ai], row_to_staff) }
        (Some(d), None) => stmt.query_map(params![d], row_to_staff),
        (None, Some(a)) => { let ai = if *a {1i32} else {0i32}; stmt.query_map(params![ai], row_to_staff) }
        (None, None) => stmt.query_map([], row_to_staff),
    }.map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_staff(state: State<AppState>, data: StaffInput) -> Result<Staff, String> {
    if data.first_name.trim().is_empty() || data.last_name.trim().is_empty() { return Err("First and last name required".to_string()); }
    if data.salary < 0.0 { return Err("Salary cannot be negative".to_string()); }
    let conn = state.db.lock();
    let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    let ai = if data.is_active {1} else {0};
    conn.execute("INSERT INTO staff (id, employee_id, first_name, last_name, designation, department, date_of_joining, phone, email, salary, is_active, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![&id, &data.employee_id, &data.first_name, &data.last_name, &data.designation, &data.department, &data.date_of_joining, &data.phone, &data.email, &data.salary, &ai, &now],
    ).map_err(|e| sqlite_error_to_string(e, "Employee ID already exists"))?;
    Ok(Staff { id, employee_id: data.employee_id, first_name: data.first_name, last_name: data.last_name, designation: data.designation, department: data.department, date_of_joining: data.date_of_joining, phone: data.phone, email: data.email, salary: data.salary, is_active: data.is_active, created_at: now })
}

#[tauri::command]
fn update_staff(state: State<AppState>, id: String, data: StaffInput) -> Result<Staff, String> {
    let conn = state.db.lock(); let ai = if data.is_active {1} else {0};
    let rows = conn.execute("UPDATE staff SET employee_id=?1, first_name=?2, last_name=?3, designation=?4, department=?5, date_of_joining=?6, phone=?7, email=?8, salary=?9, is_active=?10 WHERE id=?11",
        params![&data.employee_id, &data.first_name, &data.last_name, &data.designation, &data.department, &data.date_of_joining, &data.phone, &data.email, &data.salary, &ai, &id],
    ).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Staff not found".to_string()); }
    Ok(Staff { id, employee_id: data.employee_id, first_name: data.first_name, last_name: data.last_name, designation: data.designation, department: data.department, date_of_joining: data.date_of_joining, phone: data.phone, email: data.email, salary: data.salary, is_active: data.is_active, created_at: Utc::now().to_rfc3339() })
}

#[tauri::command]
fn delete_staff(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let rows = conn.execute("UPDATE staff SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL", params![&now, &id]).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Staff not found or already deleted".to_string()); }
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_attendance(row: &rusqlite::Row) -> rusqlite::Result<AttendanceRecord> {
    Ok(AttendanceRecord { id: row.get(0)?, student_id: row.get(1)?, staff_id: row.get(2)?, date: row.get(3)?, status: row.get(4)?, remarks: row.get(5)?, recorded_by: row.get(6)?, created_at: row.get(7)? })
}

#[tauri::command]
fn get_attendance(state: State<AppState>, date: Option<String>, student_id: Option<String>, staff_id: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<AttendanceRecord>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec![];
    if date.is_some() { conditions.push("date = ?"); }
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if staff_id.is_some() { conditions.push("staff_id = ?"); }
    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let sql = format!("SELECT id, student_id, staff_id, date, status, remarks, recorded_by, created_at FROM attendance {} ORDER BY date DESC LIMIT {} OFFSET {}", where_clause, lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(d) = &date { pv.push(d.clone()); }
    if let Some(s) = &student_id { pv.push(s.clone()); }
    if let Some(s) = &staff_id { pv.push(s.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_attendance).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_attendance_by_range(state: State<AppState>, start_date: String, end_date: String) -> Result<Vec<AttendanceRecord>, String> {
    let conn = state.db.lock();
    let mut stmt = conn.prepare("SELECT id, student_id, staff_id, date, status, remarks, recorded_by, created_at FROM attendance WHERE date >= ?1 AND date <= ?2 ORDER BY date").map_err(|e| e.to_string())?;
    stmt.query_map(params![&start_date, &end_date], row_to_attendance).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_attendance(state: State<AppState>, data: AttendanceInput) -> Result<AttendanceRecord, String> {
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO attendance (id, student_id, staff_id, date, status, remarks, recorded_by, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![&id, &data.student_id, &data.staff_id, &data.date, &data.status, &data.remarks, &data.recorded_by, &now],
    ).map_err(|e| e.to_string())?;
    Ok(AttendanceRecord { id, student_id: data.student_id, staff_id: data.staff_id, date: data.date, status: data.status, remarks: data.remarks, recorded_by: data.recorded_by, created_at: now })
}

#[tauri::command]
fn bulk_create_attendance(state: State<AppState>, records: Vec<AttendanceInput>) -> Result<i32, String> {
    let conn = state.db.lock(); let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339(); let mut count = 0i32;
    for data in &records {
        let id = Uuid::new_v4().to_string();
        if tx.execute("INSERT INTO attendance (id, student_id, staff_id, date, status, remarks, recorded_by, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![&id, &data.student_id, &data.staff_id, &data.date, &data.status, &data.remarks, &data.recorded_by, &now],
        ).is_ok() { count += 1; }
    }
    tx.commit().map_err(|e| e.to_string())?; Ok(count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Salary
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_salary(row: &rusqlite::Row) -> rusqlite::Result<SalaryRecord> {
    Ok(SalaryRecord { id: row.get(0)?, staff_id: row.get(1)?, month: row.get(2)?, year: row.get(3)?, base_salary: row.get(4)?, allowances: row.get(5)?, deductions: row.get(6)?, net_salary: row.get(7)?, payment_date: row.get(8)?, status: row.get(9)?, processed_by: row.get(10)?, created_at: row.get(11)? })
}

#[tauri::command]
fn get_salary(state: State<AppState>, staff_id: Option<String>, month: Option<String>, status: Option<String>) -> Result<Vec<SalaryRecord>, String> {
    let conn = state.db.lock();
    let mut conditions = vec![];
    if staff_id.is_some() { conditions.push("staff_id = ?"); }
    if month.is_some() { conditions.push("month = ?"); }
    if status.is_some() { conditions.push("status = ?"); }
    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let sql = format!("SELECT id, staff_id, month, year, base_salary, allowances, deductions, net_salary, payment_date, status, processed_by, created_at FROM salary {} ORDER BY year DESC, month DESC", where_clause);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(s) = &staff_id { pv.push(s.clone()); }
    if let Some(m) = &month { pv.push(m.clone()); }
    if let Some(s) = &status { pv.push(s.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_salary).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_salary(state: State<AppState>, id: String, status: String, payment_date: Option<String>) -> Result<SalaryRecord, String> {
    let conn = state.db.lock();
    conn.execute("UPDATE salary SET status = ?1, payment_date = ?2 WHERE id = ?3", params![&status, &payment_date, &id]).map_err(|e| e.to_string())?;
    conn.query_row("SELECT id, staff_id, month, year, base_salary, allowances, deductions, net_salary, payment_date, status, processed_by, created_at FROM salary WHERE id = ?1", params![&id], row_to_salary).map_err(|e| e.to_string())
}

#[tauri::command]
fn process_bulk_salary(state: State<AppState>, staff_ids: Vec<String>, month: String, year: i32, processed_by: String, overrides: Option<Vec<SalaryOverride>>) -> Result<Vec<SalaryRecord>, String> {
    let conn = state.db.lock();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let override_map: HashMap<String, SalaryOverride> = overrides.unwrap_or_default().into_iter().map(|o| (o.staff_id.clone(), o)).collect();
    let mut new_records = vec![];
    for staff_id in &staff_ids {
        let base_salary = match tx.query_row("SELECT salary FROM staff WHERE id = ?1 AND deleted_at IS NULL", params![staff_id], |row| row.get::<_,f64>(0)) {
            Ok(s) => s, Err(_) => continue,
        };
        let existing: i32 = tx.query_row("SELECT COUNT(*) FROM salary WHERE staff_id = ?1 AND month = ?2 AND year = ?3", params![staff_id, &month, &year], |row| row.get(0)).unwrap_or(0);
        if existing > 0 { continue; }
        let id = Uuid::new_v4().to_string();
        let (allowances, deductions) = override_map.get(staff_id).map(|o| (o.allowances, o.deductions)).unwrap_or((0.0, 0.0));
        let net = base_salary + allowances - deductions;
        if tx.execute("INSERT INTO salary (id, staff_id, month, year, base_salary, allowances, deductions, net_salary, status, processed_by, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'pending',?9,?10)",
            params![&id, staff_id, &month, &year, &base_salary, &allowances, &deductions, &net, &processed_by, &now],
        ).is_ok() {
            new_records.push(SalaryRecord { id, staff_id: staff_id.clone(), month: month.clone(), year, base_salary, allowances, deductions, net_salary: net, payment_date: None, status: "pending".to_string(), processed_by: processed_by.clone(), created_at: now.clone() });
        }
    }
    tx.commit().map_err(|e| e.to_string())?; Ok(new_records)
}

// ─────────────────────────────────────────────────────────────────────────────
// Fees
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_fee(row: &rusqlite::Row) -> rusqlite::Result<FeeRecord> {
    Ok(FeeRecord { id: row.get(0)?, student_id: row.get(1)?, fee_type: row.get(2)?, amount: row.get(3)?, due_date: row.get(4)?, paid_amount: row.get(5)?, payment_date: row.get(6)?, status: row.get(7)?, academic_year: row.get(8)?, remarks: row.get(9)?, created_at: row.get(10)? })
}

#[tauri::command]
fn get_fees(state: State<AppState>, student_id: Option<String>, status: Option<String>, academic_year: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<FeeRecord>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec![];
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if status.is_some() { conditions.push("status = ?"); }
    if academic_year.is_some() { conditions.push("academic_year = ?"); }
    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let sql = format!("SELECT id, student_id, fee_type, amount, due_date, paid_amount, payment_date, status, academic_year, remarks, created_at FROM fees {} ORDER BY due_date LIMIT {} OFFSET {}", where_clause, lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(s) = &student_id { pv.push(s.clone()); }
    if let Some(s) = &status { pv.push(s.clone()); }
    if let Some(s) = &academic_year { pv.push(s.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_fee).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_fee(state: State<AppState>, data: FeeInput) -> Result<FeeRecord, String> {
    if data.amount <= 0.0 { return Err("Fee amount must be greater than zero".to_string()); }
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO fees (id, student_id, fee_type, amount, due_date, paid_amount, status, academic_year, remarks, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![&id, &data.student_id, &data.fee_type, &data.amount, &data.due_date, &data.paid_amount, &data.status, &data.academic_year, &data.remarks, &now],
    ).map_err(|e| e.to_string())?;
    Ok(FeeRecord { id, student_id: data.student_id, fee_type: data.fee_type, amount: data.amount, due_date: data.due_date, paid_amount: data.paid_amount, payment_date: None, status: data.status, academic_year: data.academic_year, remarks: data.remarks, created_at: now })
}

#[tauri::command]
fn record_fee_payment(state: State<AppState>, id: String, amount: f64) -> Result<FeeRecord, String> {
    if amount <= 0.0 { return Err("Payment amount must be greater than zero".to_string()); }
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let record = conn.query_row("SELECT id, student_id, fee_type, amount, due_date, paid_amount, payment_date, status, academic_year, remarks, created_at FROM fees WHERE id = ?1", params![&id], row_to_fee).map_err(|e| e.to_string())?;
    let new_paid = (record.paid_amount + amount).min(record.amount);
    let new_status = if new_paid >= record.amount { "paid" } else if new_paid > 0.0 { "partial" } else { "pending" };
    conn.execute("UPDATE fees SET paid_amount = ?1, payment_date = ?2, status = ?3 WHERE id = ?4", params![new_paid, &now, new_status, &id]).map_err(|e| e.to_string())?;
    Ok(FeeRecord { paid_amount: new_paid, payment_date: Some(now), status: new_status.to_string(), ..record })
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_inventory(row: &rusqlite::Row) -> rusqlite::Result<InventoryItem> {
    Ok(InventoryItem { id: row.get(0)?, item_code: row.get(1)?, name: row.get(2)?, category: row.get(3)?, quantity: row.get(4)?, unit: row.get(5)?, unit_price: row.get(6)?, supplier: row.get(7)?, reorder_level: row.get(8)?, created_at: row.get(9)?, updated_at: row.get(10)? })
}

#[tauri::command]
fn get_inventory(state: State<AppState>, category: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<InventoryItem>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let (sql, use_param) = if category.is_some() {
        (format!("SELECT id, item_code, name, category, quantity, unit, unit_price, supplier, reorder_level, created_at, updated_at FROM inventory WHERE category = ?1 AND deleted_at IS NULL ORDER BY name LIMIT {} OFFSET {}", lim, off), true)
    } else {
        (format!("SELECT id, item_code, name, category, quantity, unit, unit_price, supplier, reorder_level, created_at, updated_at FROM inventory WHERE deleted_at IS NULL ORDER BY name LIMIT {} OFFSET {}", lim, off), false)
    };
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    if use_param { stmt.query_map(params![category.unwrap()], row_to_inventory) } else { stmt.query_map([], row_to_inventory) }
        .map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_low_stock(state: State<AppState>) -> Result<Vec<InventoryItem>, String> {
    let conn = state.db.lock();
    let mut stmt = conn.prepare("SELECT id, item_code, name, category, quantity, unit, unit_price, supplier, reorder_level, created_at, updated_at FROM inventory WHERE reorder_level IS NOT NULL AND quantity <= reorder_level ORDER BY name").map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_inventory).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_inventory_item(state: State<AppState>, data: InventoryInput) -> Result<InventoryItem, String> {
    if data.name.trim().is_empty() { return Err("Item name required".to_string()); }
    if data.unit_price < 0.0 { return Err("Unit price cannot be negative".to_string()); }
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO inventory (id, item_code, name, category, quantity, unit, unit_price, supplier, reorder_level, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        params![&id, &data.item_code, &data.name, &data.category, &data.quantity, &data.unit, &data.unit_price, &data.supplier, &data.reorder_level, &now, &now],
    ).map_err(|e| sqlite_error_to_string(e, "Item code already exists"))?;
    Ok(InventoryItem { id, item_code: data.item_code, name: data.name, category: data.category, quantity: data.quantity, unit: data.unit, unit_price: data.unit_price, supplier: data.supplier, reorder_level: data.reorder_level, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
fn update_inventory_item(state: State<AppState>, id: String, data: InventoryInput) -> Result<InventoryItem, String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let rows = conn.execute("UPDATE inventory SET item_code=?1, name=?2, category=?3, quantity=?4, unit=?5, unit_price=?6, supplier=?7, reorder_level=?8, updated_at=?9 WHERE id=?10",
        params![&data.item_code, &data.name, &data.category, &data.quantity, &data.unit, &data.unit_price, &data.supplier, &data.reorder_level, &now, &id],
    ).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Inventory item not found".to_string()); }
    Ok(InventoryItem { id, item_code: data.item_code, name: data.name, category: data.category, quantity: data.quantity, unit: data.unit, unit_price: data.unit_price, supplier: data.supplier, reorder_level: data.reorder_level, created_at: String::new(), updated_at: now })
}

#[tauri::command]
fn delete_inventory_item(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.lock().execute("DELETE FROM inventory WHERE id = ?1", params![&id]).map_err(|e| e.to_string())?; Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_course(row: &rusqlite::Row) -> rusqlite::Result<Course> {
    Ok(Course { id: row.get(0)?, code: row.get(1)?, name: row.get(2)?, description: row.get(3)?, credits: row.get(4)?, teacher_id: row.get(5)?, class_id: row.get(6)?, created_at: row.get(7)? })
}

#[tauri::command]
fn get_courses(state: State<AppState>, class_id: Option<String>, teacher_id: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Course>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec!["deleted_at IS NULL".to_string()];
    if class_id.is_some() { conditions.push("class_id = ?".to_string()); }
    if teacher_id.is_some() { conditions.push("teacher_id = ?".to_string()); }
    let sql = format!("SELECT id, code, name, description, credits, teacher_id, class_id, created_at FROM courses WHERE {} ORDER BY name LIMIT {} OFFSET {}", conditions.join(" AND "), lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(c) = &class_id { pv.push(c.clone()); }
    if let Some(t) = &teacher_id { pv.push(t.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_course).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_course(state: State<AppState>, data: CourseInput) -> Result<Course, String> {
    if data.name.trim().is_empty() || data.code.trim().is_empty() { return Err("Course code and name required".to_string()); }
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO courses (id, code, name, description, credits, teacher_id, class_id, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![&id, &data.code, &data.name, &data.description, &data.credits, &data.teacher_id, &data.class_id, &now],
    ).map_err(|e| sqlite_error_to_string(e, "Course code already exists"))?;
    Ok(Course { id, code: data.code, name: data.name, description: data.description, credits: data.credits, teacher_id: data.teacher_id, class_id: data.class_id, created_at: now })
}

#[tauri::command]
fn update_course(state: State<AppState>, id: String, data: CourseInput) -> Result<Course, String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let rows = conn.execute("UPDATE courses SET code=?1, name=?2, description=?3, credits=?4, teacher_id=?5, class_id=?6 WHERE id=?7",
        params![&data.code, &data.name, &data.description, &data.credits, &data.teacher_id, &data.class_id, &id],
    ).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Course not found".to_string()); }
    Ok(Course { id, code: data.code, name: data.name, description: data.description, credits: data.credits, teacher_id: data.teacher_id, class_id: data.class_id, created_at: now })
}

#[tauri::command]
fn delete_course(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.lock().execute("DELETE FROM courses WHERE id = ?1", params![&id]).map_err(|e| e.to_string())?; Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Exams
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_exam(row: &rusqlite::Row) -> rusqlite::Result<ExamRecord> {
    Ok(ExamRecord { id: row.get(0)?, student_id: row.get(1)?, course_id: row.get(2)?, exam_type: row.get(3)?, marks: row.get(4)?, max_marks: row.get(5)?, graded_by: row.get(6)?, graded_at: row.get(7)?, remarks: row.get(8)?, created_at: row.get(9)? })
}

#[tauri::command]
fn get_exams(state: State<AppState>, student_id: Option<String>, course_id: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<ExamRecord>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec![];
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if course_id.is_some() { conditions.push("course_id = ?"); }
    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let sql = format!("SELECT id, student_id, course_id, exam_type, marks, max_marks, graded_by, graded_at, remarks, created_at FROM exams {} ORDER BY created_at DESC LIMIT {} OFFSET {}", where_clause, lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(s) = &student_id { pv.push(s.clone()); }
    if let Some(c) = &course_id { pv.push(c.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_exam).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_exam(state: State<AppState>, data: ExamInput) -> Result<ExamRecord, String> {
    if data.max_marks <= 0.0 { return Err("Max marks must be > 0".to_string()); }
    if data.marks < 0.0 || data.marks > data.max_marks { return Err("Marks must be between 0 and max marks".to_string()); }
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO exams (id, student_id, course_id, exam_type, marks, max_marks, graded_by, graded_at, remarks, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![&id, &data.student_id, &data.course_id, &data.exam_type, &data.marks, &data.max_marks, &data.graded_by, &now, &data.remarks, &now],
    ).map_err(|e| e.to_string())?;
    Ok(ExamRecord { id, student_id: data.student_id, course_id: data.course_id, exam_type: data.exam_type, marks: data.marks, max_marks: data.max_marks, graded_by: data.graded_by, graded_at: Some(now.clone()), remarks: data.remarks, created_at: now })
}

#[tauri::command]
fn update_exam(state: State<AppState>, id: String, marks: f64, graded_by: String, remarks: Option<String>) -> Result<ExamRecord, String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let rows = conn.execute("UPDATE exams SET marks = ?1, graded_by = ?2, graded_at = ?3, remarks = ?4 WHERE id = ?5", params![marks, &graded_by, &now, &remarks, &id]).map_err(|e| e.to_string())?;
    if rows == 0 { return Err("Exam record not found".to_string()); }
    conn.query_row("SELECT id, student_id, course_id, exam_type, marks, max_marks, graded_by, graded_at, remarks, created_at FROM exams WHERE id = ?1", params![&id], row_to_exam).map_err(|e| e.to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_ledger(row: &rusqlite::Row) -> rusqlite::Result<LedgerEntry> {
    Ok(LedgerEntry { id: row.get(0)?, date: row.get(1)?, account_code: row.get(2)?, account_name: row.get(3)?, description: row.get(4)?, debit: row.get(5)?, credit: row.get(6)?, balance: row.get(7)?, voucher_type: row.get(8)?, voucher_number: row.get(9)?, created_by: row.get(10)?, created_at: row.get(11)? })
}

#[tauri::command]
fn get_ledger(state: State<AppState>, start_date: Option<String>, end_date: Option<String>, account_code: Option<String>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<LedgerEntry>, String> {
    let conn = state.db.lock(); let lim = limit.unwrap_or(1000); let off = offset.unwrap_or(0);
    let mut conditions = vec![];
    if start_date.is_some() { conditions.push("date >= ?"); }
    if end_date.is_some() { conditions.push("date <= ?"); }
    if account_code.is_some() { conditions.push("account_code = ?"); }
    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let sql = format!("SELECT id, date, account_code, account_name, description, debit, credit, balance, voucher_type, voucher_number, created_by, created_at FROM ledger {} ORDER BY date, created_at LIMIT {} OFFSET {}", where_clause, lim, off);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(s) = &start_date { pv.push(s.clone()); }
    if let Some(e) = &end_date { pv.push(e.clone()); }
    if let Some(a) = &account_code { pv.push(a.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    stmt.query_map(pr.as_slice(), row_to_ledger).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_ledger_entry(state: State<AppState>, data: LedgerInput) -> Result<LedgerEntry, String> {
    if data.debit < 0.0 || data.credit < 0.0 { return Err("Debit and credit cannot be negative".to_string()); }
    if data.description.trim().is_empty() { return Err("Description required".to_string()); }
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO ledger (id, date, account_code, account_name, description, debit, credit, balance, voucher_type, voucher_number, created_by, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![&id, &data.date, &data.account_code, &data.account_name, &data.description, &data.debit, &data.credit, &data.balance, &data.voucher_type, &data.voucher_number, &data.created_by, &now],
    ).map_err(|e| e.to_string())?;
    Ok(LedgerEntry { id, date: data.date, account_code: data.account_code, account_name: data.account_name, description: data.description, debit: data.debit, credit: data.credit, balance: data.balance, voucher_type: data.voucher_type, voucher_number: data.voucher_number, created_by: data.created_by, created_at: now })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_sync_entry(row: &rusqlite::Row) -> rusqlite::Result<SyncQueueEntry> {
    Ok(SyncQueueEntry { id: row.get(0)?, operation: row.get(1)?, table_name: row.get(2)?, record_id: row.get(3)?, data: row.get(4)?, user_role: row.get(5)?, timestamp: row.get(6)?, synced: row.get::<_,i32>(7)? != 0 })
}

#[tauri::command]
fn get_sync_status(state: State<AppState>) -> Result<SyncStatus, String> {
    let conn = state.db.lock();
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM sync_queue WHERE synced = 0", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    let last_sync: Option<String> = conn.query_row("SELECT MAX(timestamp) FROM sync_queue WHERE synced = 1", [], |row| row.get(0)).ok().flatten();
    Ok(SyncStatus { last_sync_time: last_sync.unwrap_or_default(), pending_changes: count, sync_state: "idle".to_string(), error_message: None })
}

#[tauri::command]
fn queue_sync_operation(state: State<AppState>, operation: String, table_name: String, record_id: String, data: String, user_role: String) -> Result<String, String> {
    let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let timestamp = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO sync_queue (id, operation, table_name, record_id, data, user_role, timestamp, synced) VALUES (?1,?2,?3,?4,?5,?6,?7,0)", params![&id, &operation, &table_name, &record_id, &data, &user_role, &timestamp]).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
fn get_pending_sync_operations(state: State<AppState>) -> Result<Vec<SyncQueueEntry>, String> {
    let conn = state.db.lock();
    let mut stmt = conn.prepare("SELECT id, operation, table_name, record_id, data, user_role, timestamp, synced FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC").map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_sync_entry).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn mark_operations_synced(state: State<AppState>, ids: Vec<String>) -> Result<(), String> {
    let conn = state.db.lock();
    for id in &ids { conn.execute("UPDATE sync_queue SET synced = 1 WHERE id = ?1", params![id]).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn resolve_and_apply_remote_change(state: State<AppState>, remote_operation: String, remote_table: String, remote_record_id: String, remote_data: String, remote_user_role: String, remote_timestamp: String) -> Result<ConflictResolutionResult, String> {
    let conn = state.db.lock();
    let local_entry: Option<SyncQueueEntry> = conn.query_row(
        "SELECT id, operation, table_name, record_id, data, user_role, timestamp, synced FROM sync_queue WHERE table_name = ?1 AND record_id = ?2 AND synced = 0 ORDER BY timestamp DESC LIMIT 1",
        params![&remote_table, &remote_record_id], row_to_sync_entry,
    ).ok();
    let local_entry = match local_entry {
        Some(e) => e,
        None => return Ok(ConflictResolutionResult { resolution: "remote".to_string(), winning_data: Some(remote_data), conflict_type: "none".to_string() }),
    };
    let resolution = resolve_conflict(role_to_authority(&local_entry.user_role), role_to_authority(&remote_user_role), &local_entry.timestamp, &remote_timestamp);
    let winning_data = if resolution.resolution == "remote" { Some(remote_data) } else { Some(local_entry.data) };
    conn.execute("UPDATE sync_queue SET synced = 1 WHERE id = ?1", params![local_entry.id]).map_err(|e| e.to_string())?;
    Ok(ConflictResolutionResult { winning_data, ..resolution })
}

#[tauri::command]
fn apply_synced_change(state: State<AppState>, operation: String, table_name: String, record_id: String, data: String) -> Result<(), String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    if operation == "update" || operation == "delete" {
        let _ = conn.execute(&format!("DELETE FROM {} WHERE id = ?1", table_name), params![&record_id]);
    }
    if operation != "delete" {
        let parsed: serde_json::Value = serde_json::from_str(&data).map_err(|e| format!("Invalid JSON: {}", e))?;
        match table_name.as_str() {
            "students" => {
                conn.execute("INSERT OR REPLACE INTO students (id, admission_number, first_name, last_name, date_of_birth, gender, class_id, section, parent_name, parent_phone, address, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                    params![&record_id, &record_id, parsed.get("firstName").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("lastName").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("dateOfBirth").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("gender").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("classId").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("section").and_then(|v| v.as_str()), parsed.get("parentName").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("parentPhone").and_then(|v| v.as_str()).unwrap_or(""), parsed.get("address").and_then(|v| v.as_str()).unwrap_or(""), &now, &now],
                ).map_err(|e| e.to_string())?;
            }
            _ => return Err(format!("Sync not implemented for table: {}", table_name)),
        }
    }
    Ok(())
}

#[tauri::command]
fn clear_synced_operations(state: State<AppState>, before_timestamp: String) -> Result<i32, String> {
    let deleted = state.db.lock().execute("DELETE FROM sync_queue WHERE synced = 1 AND timestamp < ?1", params![&before_timestamp]).map_err(|e| e.to_string())?;
    Ok(deleted as i32)
}

// ─────────────────────────────────────────────────────────────────────────────
// Institution Settings
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_institution_settings(state: State<AppState>) -> Result<InstitutionSettings, String> {
    let conn = state.db.lock();
    let mut settings = InstitutionSettings {
        institution_name: "My Institution".to_string(), institution_type: "school".to_string(),
        academic_year: format!("{}-{}", chrono::Utc::now().year(), chrono::Utc::now().year() + 1),
        currency: "NPR".to_string(), github_repo: String::new(),
        address: None, phone: None, email: None,
    };
    let keys = ["institution_name", "institution_type", "academic_year", "currency", "github_repo", "address", "phone", "email"];
    for key in &keys {
        if let Ok(value) = conn.query_row("SELECT value FROM institution_settings WHERE key = ?1", params![key], |row| row.get::<_,String>(0)) {
            match *key {
                "institution_name" => settings.institution_name = value,
                "institution_type" => settings.institution_type = value,
                "academic_year" => settings.academic_year = value,
                "currency" => settings.currency = value,
                "github_repo" => settings.github_repo = value,
                "address" => settings.address = Some(value),
                "phone" => settings.phone = Some(value),
                "email" => settings.email = Some(value),
                _ => {}
            }
        }
    }
    Ok(settings)
}

#[tauri::command]
fn save_institution_settings(state: State<AppState>, settings: InstitutionSettings) -> Result<(), String> {
    let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
    let pairs = vec![
        ("institution_name", settings.institution_name),
        ("institution_type", settings.institution_type),
        ("academic_year", settings.academic_year),
        ("currency", settings.currency),
        ("github_repo", settings.github_repo),
        ("address", settings.address.unwrap_or_default()),
        ("phone", settings.phone.unwrap_or_default()),
        ("email", settings.email.unwrap_or_default()),
    ];
    for (key, value) in pairs {
        conn.execute("INSERT INTO institution_settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value, &now],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Dev reset (debug only)
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(debug_assertions)]
#[tauri::command]
fn reset_for_dev(state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock();
    for table in &["users","students","staff","attendance","salary","fees","inventory","courses","exams","ledger","sync_queue","invites","audit_log","institution_settings"] {
        conn.execute(&format!("DELETE FROM {}", table), []).map_err(|e| e.to_string())?;
    }
    info!("Dev reset: all data wiped");
    Ok(())
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn reset_for_dev(_state: State<AppState>) -> Result<(), String> {
    Err("reset_for_dev is only available in debug builds".to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub update check
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn check_for_updates(github_repo: String, current_version: String) -> Result<UpdateInfo, String> {
    if github_repo.is_empty() {
        return Ok(UpdateInfo { available: false, current_version: current_version.clone(), latest_version: current_version, release_notes: String::new(), release_url: String::new(), published_at: String::new() });
    }
    let url = format!("https://api.github.com/repos/{}/releases/latest", github_repo);
    let client = reqwest::Client::builder().user_agent("educom-updater/1.0").timeout(std::time::Duration::from_secs(10)).build().map_err(|e| e.to_string())?;
    let response = client.get(&url).send().await.map_err(|e| format!("Network error: {}", e))?;
    if !response.status().is_success() { return Err(format!("GitHub API returned {}", response.status())); }
    let release: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let latest_tag = release["tag_name"].as_str().unwrap_or("").trim_start_matches('v').to_string();
    let current_clean = current_version.trim_start_matches('v').to_string();
    let available = semver_gt(&latest_tag, &current_clean);
    Ok(UpdateInfo { available, current_version: current_clean, latest_version: latest_tag, release_notes: release["body"].as_str().unwrap_or("").to_string(), release_url: release["html_url"].as_str().unwrap_or("").to_string(), published_at: release["published_at"].as_str().unwrap_or("").to_string() })
}

fn semver_gt(a: &str, b: &str) -> bool {
    fn parse(s: &str) -> (u64, u64, u64) {
        let parts: Vec<u64> = s.split('-').next().unwrap_or(s).split('.').map(|p| p.parse().unwrap_or(0)).collect();
        (parts.get(0).copied().unwrap_or(0), parts.get(1).copied().unwrap_or(0), parts.get(2).copied().unwrap_or(0))
    }
    parse(a) > parse(b)
}

// ─────────────────────────────────────────────────────────────────────────────
// Joined query commands for reports / display
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_salary_with_staff(state: State<AppState>, month: Option<String>, year: Option<i32>, status: Option<String>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock();
    let mut conditions = vec!["1=1".to_string()];
    if month.is_some()  { conditions.push("s.month = ?".to_string()); }
    if year.is_some()   { conditions.push("s.year = ?".to_string()); }
    if status.is_some() { conditions.push("s.status = ?".to_string()); }
    let sql = format!("SELECT s.id, s.staff_id, st.first_name || ' ' || st.last_name AS staff_name, st.designation, st.department, s.month, s.year, s.base_salary, s.allowances, s.deductions, s.net_salary, s.payment_date, s.status, s.processed_by, s.created_at FROM salary s JOIN staff st ON s.staff_id = st.id WHERE {} ORDER BY s.year DESC, s.month DESC, staff_name", conditions.join(" AND "));
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(m) = &month  { pv.push(m.clone()); }
    if let Some(y) = &year   { pv.push(y.to_string()); }
    if let Some(s) = &status { pv.push(s.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    let rows = stmt.query_map(pr.as_slice(), |row| {
        Ok(serde_json::json!({ "id": row.get::<_,String>(0)?, "staffId": row.get::<_,String>(1)?, "staffName": row.get::<_,String>(2)?, "designation": row.get::<_,String>(3)?, "department": row.get::<_,String>(4)?, "month": row.get::<_,String>(5)?, "year": row.get::<_,i32>(6)?, "baseSalary": row.get::<_,f64>(7)?, "allowances": row.get::<_,f64>(8)?, "deductions": row.get::<_,f64>(9)?, "netSalary": row.get::<_,f64>(10)?, "paymentDate": row.get::<_,Option<String>>(11)?, "status": row.get::<_,String>(12)?, "processedBy": row.get::<_,String>(13)?, "createdAt": row.get::<_,String>(14)? }))
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(rows))
}

#[tauri::command]
fn get_attendance_report(state: State<AppState>, start_date: String, end_date: String, grade: Option<String>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock();
    let grade_filter = if grade.is_some() { "AND COALESCE(s.grade, s.class_id) = ?3" } else { "" };
    let sql = format!("SELECT s.id, s.first_name || ' ' || s.last_name, s.admission_number, COALESCE(s.grade, s.class_id, ''), COUNT(*), SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END), SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END), SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) FROM students s JOIN attendance a ON a.student_id = s.id WHERE a.date >= ?1 AND a.date <= ?2 AND s.deleted_at IS NULL {} GROUP BY s.id ORDER BY COALESCE(s.grade, s.class_id), s.last_name, s.first_name", grade_filter);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| Ok(serde_json::json!({ "studentId": row.get::<_,String>(0)?, "studentName": row.get::<_,String>(1)?, "admissionNumber": row.get::<_,String>(2)?, "grade": row.get::<_,String>(3)?, "totalDays": row.get::<_,i32>(4)?, "presentDays": row.get::<_,i32>(5)?, "absentDays": row.get::<_,i32>(6)?, "lateDays": row.get::<_,i32>(7)?, "attendancePercent": row.get::<_,f64>(8).unwrap_or(0.0) }));
    let rows = if let Some(ref g) = grade {
        stmt.query_map(params![&start_date, &end_date, g], map_row)
    } else {
        stmt.query_map(params![&start_date, &end_date], map_row)
    }.map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(rows))
}

#[tauri::command]
fn get_fee_report(state: State<AppState>, academic_year: String, grade: Option<String>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock();
    let grade_filter = if grade.is_some() { "AND COALESCE(s.grade, s.class_id) = ?2" } else { "" };
    let sql = format!("SELECT s.id, s.first_name || ' ' || s.last_name, s.admission_number, COALESCE(s.grade, s.class_id, ''), f.fee_type, SUM(f.amount), SUM(f.paid_amount), SUM(f.amount - f.paid_amount), CASE WHEN SUM(f.amount) = SUM(f.paid_amount) THEN 'paid' WHEN SUM(f.paid_amount) = 0 THEN 'pending' ELSE 'partial' END FROM students s JOIN fees f ON f.student_id = s.id WHERE f.academic_year = ?1 AND s.deleted_at IS NULL {} GROUP BY s.id, f.fee_type ORDER BY COALESCE(s.grade, s.class_id), s.last_name, f.fee_type", grade_filter);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| Ok(serde_json::json!({ "studentId": row.get::<_,String>(0)?, "studentName": row.get::<_,String>(1)?, "admissionNo": row.get::<_,String>(2)?, "grade": row.get::<_,String>(3)?, "feeType": row.get::<_,String>(4)?, "totalAmount": row.get::<_,f64>(5)?, "paidAmount": row.get::<_,f64>(6)?, "pendingAmount": row.get::<_,f64>(7)?, "status": row.get::<_,String>(8)? }));
    let rows = if let Some(ref g) = grade {
        stmt.query_map(params![&academic_year, g], map_row)
    } else {
        stmt.query_map(params![&academic_year], map_row)
    }.map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(rows))
}

#[tauri::command]
fn get_exam_report(state: State<AppState>, course_id: Option<String>, exam_type: Option<String>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock();
    let mut conditions = vec!["s.deleted_at IS NULL".to_string()];
    if course_id.is_some()  { conditions.push("e.course_id = ?".to_string()); }
    if exam_type.is_some()  { conditions.push("e.exam_type = ?".to_string()); }
    let sql = format!("SELECT s.id, s.first_name || ' ' || s.last_name, s.admission_number, COALESCE(s.grade, s.class_id, ''), c.name, c.code, e.exam_type, e.marks, e.max_marks, ROUND(100.0 * e.marks / NULLIF(e.max_marks,0), 1) FROM exams e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE {} ORDER BY COALESCE(s.grade, s.class_id), s.last_name, c.name", conditions.join(" AND "));
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut pv: Vec<String> = vec![];
    if let Some(c) = &course_id { pv.push(c.clone()); }
    if let Some(t) = &exam_type { pv.push(t.clone()); }
    let pr: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    let rows = stmt.query_map(pr.as_slice(), |row| {
        let pct: f64 = row.get::<_,f64>(9).unwrap_or(0.0);
        let grade_letter = match pct as u32 { 90..=100 => "A+", 80..=89 => "A", 70..=79 => "B+", 60..=69 => "B", 50..=59 => "C", 40..=49 => "D", _ => "F" };
        Ok(serde_json::json!({ "studentId": row.get::<_,String>(0)?, "studentName": row.get::<_,String>(1)?, "admissionNumber": row.get::<_,String>(2)?, "grade": row.get::<_,String>(3)?, "courseName": row.get::<_,String>(4)?, "courseCode": row.get::<_,String>(5)?, "examType": row.get::<_,String>(6)?, "marks": row.get::<_,f64>(7)?, "maxMarks": row.get::<_,f64>(8)?, "percentage": pct, "gradeLetter": grade_letter }))
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(rows))
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

static _SERVER_HANDLE: Lazy<std::sync::Arc<RwLock<Option<std::thread::JoinHandle<()>>>>> =
    Lazy::new(|| std::sync::Arc::new(RwLock::new(None)));

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), String> {
    let dsn = std::env::var("SENTRY_DSN").ok();
    let _guard = if let Some(dsn_val) = dsn {
        let mut options = ClientOptions::default();
        if let Ok(parsed) = dsn_val.parse() { options.dsn = Some(parsed); }
        options.environment = Some("production".into());
        Some(init(options))
    } else { None };

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry().with(fmt::layer().with_target(true)).with(filter).init();

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {}", panic_info);
        capture_message(&msg, sentry::Level::Error);
        eprintln!("{}", msg);
    }));

    info!("Educom starting up");

    #[tauri::command]
    fn has_users(state: State<AppState>) -> Result<bool, String> {
        let count: i32 = state.db.lock().query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(count > 0)
    }

    #[tauri::command]
    fn create_invite(state: State<AppState>, data: InviteCreateInput, created_by: String) -> Result<Invite, String> {
        if data.full_name.trim().is_empty() { return Err("Full name required".to_string()); }
        if data.username.trim().is_empty() { return Err("Username required".to_string()); }
        if data.password.len() < 6 { return Err("Password must be at least 6 characters".to_string()); }
        let valid_roles = ["admin","management","finance","teacher"];
        if !valid_roles.contains(&data.role.as_str()) { return Err("Invalid role".to_string()); }
        let conn = state.db.lock(); let id = Uuid::new_v4().to_string(); let now = Utc::now().to_rfc3339();
        let expires_at = (Utc::now() + chrono::Duration::days(7)).to_rfc3339();
        let code = format!("EDU-{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
        let hash = hash_password(&data.password).map_err(|e| e.to_string())?;
        conn.execute("INSERT INTO invites (id, invite_code, full_name, role, username, password_hash, created_by, created_at, expires_at, status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'pending')",
            params![&id, &code, &data.full_name, &data.role, &data.username, &hash, &created_by, &now, &expires_at],
        ).map_err(|e| sqlite_error_to_string(e, "Username already exists"))?;
        Ok(Invite { id, invite_code: code, full_name: data.full_name, role: data.role, username: data.username, password_hash: hash, status: "pending".to_string(), created_by, created_at: now, expires_at, used_by: None })
    }

    #[tauri::command]
    fn get_invites(state: State<AppState>) -> Result<Vec<Invite>, String> {
        let conn = state.db.lock();
        let mut stmt = conn.prepare("SELECT id, invite_code, full_name, role, username, password_hash, status, created_by, created_at, expires_at, used_by FROM invites ORDER BY created_at DESC").map_err(|e| e.to_string())?;
        stmt.query_map([], |row| Ok(Invite { id: row.get(0)?, invite_code: row.get(1)?, full_name: row.get(2)?, role: row.get(3)?, username: row.get(4)?, password_hash: row.get(5)?, status: row.get(6)?, created_by: row.get(7)?, created_at: row.get(8)?, expires_at: row.get(9)?, used_by: row.get(10)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    fn accept_invite(state: State<AppState>, invite_code: String) -> Result<User, String> {
        let conn = state.db.lock(); let now = Utc::now().to_rfc3339();
        let invite: Invite = conn.query_row(
            "SELECT id, invite_code, full_name, role, username, password_hash, created_by, created_at, expires_at, status, used_by FROM invites WHERE invite_code = ?1",
            params![&invite_code],
            |row| Ok(Invite { id: row.get(0)?, invite_code: row.get(1)?, full_name: row.get(2)?, role: row.get(3)?, username: row.get(4)?, password_hash: row.get(5)?, created_by: row.get(6)?, created_at: row.get(7)?, expires_at: row.get(8)?, status: row.get(9)?, used_by: row.get(10)? }),
        ).map_err(|_| "Invalid invite code".to_string())?;
        if invite.status != "pending" { return Err("Invite already used or expired".to_string()); }
        let expires = chrono::DateTime::parse_from_rfc3339(&invite.expires_at).map_err(|e| e.to_string())?.with_timezone(&Utc);
        if Utc::now() > expires {
            conn.execute("UPDATE invites SET status = 'expired' WHERE id = ?1", params![&invite.id]).map_err(|e| e.to_string())?;
            return Err("Invite has expired".to_string());
        }
        let user_id = Uuid::new_v4().to_string();
        conn.execute("INSERT INTO users (id, username, role, full_name, password_hash, password_salt, created_at) VALUES (?1,?2,?3,?4,?5,'',?6)",
            params![&user_id, &invite.username, &invite.role, &invite.full_name, &invite.password_hash, &now],
        ).map_err(|e| sqlite_error_to_string(e, "Username already exists"))?;
        conn.execute("UPDATE invites SET status = 'accepted', used_by = ?1 WHERE id = ?2", params![&user_id, &invite.id]).map_err(|e| e.to_string())?;
        Ok(User { id: user_id, username: invite.username, role: invite.role, full_name: invite.full_name, email: None, created_at: now, last_login: None })
    }

    #[tauri::command]
    fn delete_invite(state: State<AppState>, id: String) -> Result<(), String> {
        let rows = state.db.lock().execute("DELETE FROM invites WHERE id = ?1", params![&id]).map_err(|e| e.to_string())?;
        if rows == 0 { return Err("Invite not found".to_string()); }
        Ok(())
    }

    #[tauri::command]
    fn get_server_status(state: State<AppState>) -> Result<ServerStatus, String> {
        Ok(ServerStatus { mode: state.server_mode.read().clone(), server_url: state.server_url.read().clone(), is_running: state.http_server_handle.lock().is_some() })
    }

    #[tauri::command]
    fn configure_remote_server(state: State<AppState>, server_url: String) -> Result<(), String> {
        if !server_url.starts_with("http://") && !server_url.starts_with("https://") { return Err("Server URL must start with http:// or https://".to_string()); }
        *state.server_url.write() = Some(server_url.clone()); *state.server_mode.write() = "remote".to_string(); Ok(())
    }

    #[tauri::command]
    fn start_local_server(state: State<AppState>, port: Option<u16>) -> Result<String, String> {
        use axum::Router; use axum::routing::get; use std::net::SocketAddr; use tower_http::cors::{Any, CorsLayer};
        let p = port.unwrap_or(8080); let addr: SocketAddr = ([0,0,0,0], p).into();
        let router = Router::new().route("/health", get(|| async { "ok" })).layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any));
        let handle = tokio::spawn(async move { let listener = tokio::net::TcpListener::bind(addr).await.unwrap(); axum::serve(listener, router).await.unwrap(); });
        *state.http_server_handle.lock() = Some(handle); *state.server_mode.write() = "local".to_string(); *state.server_url.write() = Some(format!("http://localhost:{}", p));
        Ok(format!("http://localhost:{}", p))
    }

    #[tauri::command]
    fn stop_local_server(state: State<AppState>) -> Result<(), String> {
        let mut handle = state.http_server_handle.lock();
        if let Some(h) = handle.take() { h.abort(); *state.server_mode.write() = "standalone".to_string(); Ok(()) } else { Err("No server running".to_string()) }
    }

    #[derive(Serialize)]
    struct ServerStatus { mode: String, server_url: Option<String>, is_running: bool }

    let db_path = dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from(".")).join("educom").join("educom.db");
    info!("Database path: {:?}", db_path);
    if let Some(parent) = db_path.parent() { let _ = std::fs::create_dir_all(parent); }
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    init_database(&conn).map_err(|e| e.to_string())?;
    seed_demo_data(&conn).map_err(|e| e.to_string())?;
    info!("Database initialized successfully");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState { db: Arc::new(Mutex::new(conn)), server_mode: RwLock::new("standalone".to_string()), server_url: RwLock::new(None), http_server_handle: Mutex::new(None), login_attempts: Arc::new(Mutex::new(HashMap::new())), db_stats: DbStats::default() })
        .invoke_handler(tauri::generate_handler![
            authenticate_user,
            get_users, create_user, update_user, delete_user,
            get_students, create_student, update_student, delete_student, bulk_import_students,
            get_staff, create_staff, update_staff, delete_staff,
            get_attendance, get_attendance_by_range, create_attendance, bulk_create_attendance,
            get_salary, update_salary, process_bulk_salary,
            get_fees, create_fee, record_fee_payment,
            get_inventory, get_low_stock, create_inventory_item, update_inventory_item, delete_inventory_item,
            get_courses, create_course, update_course, delete_course,
            get_exams, create_exam, update_exam,
            get_ledger, create_ledger_entry,
            get_sync_status, queue_sync_operation, get_pending_sync_operations, mark_operations_synced,
            resolve_and_apply_remote_change, apply_synced_change, clear_synced_operations,
            has_users, create_invite, get_invites, accept_invite, delete_invite,
            get_server_status, configure_remote_server, start_local_server, stop_local_server,
            get_institution_settings, save_institution_settings,
            reset_for_dev, check_for_updates,
            get_salary_with_staff, get_attendance_report, get_fee_report, get_exam_report,
        ])
        .run(tauri::generate_context!())
        .map_err(|e| e.to_string())?;
    Ok(())
}

// chrono year helper
use chrono::Datelike;