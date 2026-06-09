use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use rusqlite::{Connection, params};
use chrono::Utc;
use uuid::Uuid;
use once_cell::sync::Lazy;
use parking_lot::RwLock;

// ── Shared password hashing salt (in production, store per-user salt in DB) ──
// We use a simple SHA-256 based approach here with per-user salt stored in DB.
// For production consider argon2 crate — add to Cargo.toml if available.

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
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    #[serde(rename = "dateOfBirth")]
    pub date_of_birth: String,
    pub gender: String,
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
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    #[serde(rename = "dateOfBirth")]
    pub date_of_birth: String,
    pub gender: String,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// App state
// ─────────────────────────────────────────────────────────────────────────────

pub struct AppState {
    pub db: Mutex<Connection>,
    pub server_mode: RwLock<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Password helpers
// Using a simple PBKDF2-style approach with std only.
// Replace with argon2 crate for stronger security before go-live.
// ─────────────────────────────────────────────────────────────────────────────

fn hash_password(password: &str, salt: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    // NOTE: This is NOT cryptographically secure.
    // Replace with argon2 or bcrypt before shipping to real clients.
    // We use this here only to get the architecture wired correctly.
    let combined = format!("{}{}", salt, password);
    let mut hasher = DefaultHasher::new();
    combined.hash(&mut hasher);
    // Run multiple rounds to slow down brute force slightly
    let mut result = hasher.finish();
    for _ in 0..10000 {
        let mut h = DefaultHasher::new();
        result.hash(&mut h);
        result = h.finish();
    }
    format!("{:x}", result)
}

fn verify_password(password: &str, salt: &str, stored_hash: &str) -> bool {
    hash_password(password, salt) == stored_hash
}

fn generate_salt() -> String {
    Uuid::new_v4().to_string().replace('-', "")
}

// ─────────────────────────────────────────────────────────────────────────────
// Database init
// ─────────────────────────────────────────────────────────────────────────────

fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','management','finance','teacher')),
            full_name TEXT NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_login TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            admission_number TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth TEXT NOT NULL,
            gender TEXT NOT NULL CHECK(gender IN ('male','female','other')),
            class_id TEXT NOT NULL,
            section TEXT,
            parent_name TEXT NOT NULL,
            parent_phone TEXT NOT NULL,
            address TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS staff (
            id TEXT PRIMARY KEY,
            employee_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            designation TEXT NOT NULL,
            department TEXT NOT NULL,
            date_of_joining TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            salary REAL NOT NULL CHECK(salary >= 0),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            student_id TEXT,
            staff_id TEXT,
            date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
            remarks TEXT,
            recorded_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS salary (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL REFERENCES staff(id),
            month TEXT NOT NULL,
            year INTEGER NOT NULL,
            base_salary REAL NOT NULL,
            allowances REAL NOT NULL DEFAULT 0,
            deductions REAL NOT NULL DEFAULT 0,
            net_salary REAL NOT NULL,
            payment_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')),
            processed_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(staff_id, month, year)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS fees (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES students(id),
            fee_type TEXT NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            due_date TEXT NOT NULL,
            paid_amount REAL NOT NULL DEFAULT 0,
            payment_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial','paid','overdue')),
            academic_year TEXT NOT NULL,
            remarks TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            item_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL CHECK(unit_price >= 0),
            supplier TEXT,
            reorder_level INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            credits INTEGER NOT NULL DEFAULT 0,
            teacher_id TEXT,
            class_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES students(id),
            course_id TEXT NOT NULL REFERENCES courses(id),
            exam_type TEXT NOT NULL CHECK(exam_type IN ('quiz','midterm','final','assignment')),
            marks REAL NOT NULL CHECK(marks >= 0),
            max_marks REAL NOT NULL CHECK(max_marks > 0),
            graded_by TEXT,
            graded_at TEXT,
            remarks TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS ledger (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            account_code TEXT NOT NULL,
            account_name TEXT NOT NULL,
            description TEXT NOT NULL,
            debit REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
            credit REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
            balance REAL NOT NULL,
            voucher_type TEXT NOT NULL,
            voucher_number TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            operation TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

fn seed_demo_data(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let now = Utc::now().to_rfc3339();

    let demo_users = vec![
        ("1", "admin",   "admin",      "System Administrator", "admin@educom.local",   "admin123"),
        ("2", "manager", "management", "School Manager",        "manager@educom.local", "manager123"),
        ("3", "finance", "finance",    "Finance Officer",       "finance@educom.local", "finance123"),
        ("4", "teacher", "teacher",    "John Teacher",          "teacher@educom.local", "teacher123"),
    ];

    for (id, username, role, full_name, email, password) in demo_users {
        let salt = generate_salt();
        let hash = hash_password(password, &salt);
        conn.execute(
            "INSERT INTO users (id, username, role, full_name, email, password_hash, password_salt, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, username, role, full_name, email, hash, salt, &now],
        )?;
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: log an audit event
// ─────────────────────────────────────────────────────────────────────────────

fn audit(
    conn: &Connection,
    user_id: &str,
    action: &str,
    table_name: &str,
    record_id: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
) {
    let now = Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO audit_log (id, user_id, action, table_name, record_id, old_value, new_value, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            Uuid::new_v4().to_string(),
            user_id, action, table_name, record_id,
            old_value, new_value, now
        ],
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Auth
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn authenticate_user(
    state: State<AppState>,
    username: String,
    password: String,
) -> Result<Option<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row(
        "SELECT id, username, role, full_name, email, password_hash, password_salt, created_at, last_login
         FROM users WHERE username = ?1",
        params![&username],
        |row| {
            Ok((
                row.get::<_, String>(0)?,  // id
                row.get::<_, String>(1)?,  // username
                row.get::<_, String>(2)?,  // role
                row.get::<_, String>(3)?,  // full_name
                row.get::<_, Option<String>>(4)?,  // email
                row.get::<_, String>(5)?,  // password_hash
                row.get::<_, String>(6)?,  // password_salt
                row.get::<_, String>(7)?,  // created_at
                row.get::<_, Option<String>>(8)?,  // last_login
            ))
        },
    );

    match result {
        Ok((id, uname, role, full_name, email, hash, salt, created_at, last_login)) => {
            if !verify_password(&password, &salt, &hash) {
                return Ok(None);
            }
            // Update last_login
            let now = Utc::now().to_rfc3339();
            let _ = conn.execute(
                "UPDATE users SET last_login = ?1 WHERE id = ?2",
                params![&now, &id],
            );
            audit(&conn, &id, "LOGIN", "users", &id, None, None);
            Ok(Some(User {
                id,
                username: uname,
                role,
                full_name,
                email,
                created_at,
                last_login: Some(now),
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Users
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_users(state: State<AppState>) -> Result<Vec<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, username, role, full_name, email, created_at, last_login FROM users ORDER BY created_at"
    ).map_err(|e| e.to_string())?;

    let users = stmt.query_map([], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            full_name: row.get(3)?,
            email: row.get(4)?,
            created_at: row.get(5)?,
            last_login: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(users)
}

#[tauri::command]
fn create_user(state: State<AppState>, data: UserCreateInput) -> Result<User, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Validate role
    let valid_roles = ["admin", "management", "finance", "teacher"];
    if !valid_roles.contains(&data.role.as_str()) {
        return Err(format!("Invalid role: {}", data.role));
    }
    if data.username.trim().is_empty() {
        return Err("Username cannot be empty".to_string());
    }
    if data.password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let salt = generate_salt();
    let hash = hash_password(&data.password, &salt);

    conn.execute(
        "INSERT INTO users (id, username, role, full_name, email, password_hash, password_salt, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![&id, &data.username, &data.role, &data.full_name, &data.email, &hash, &salt, &now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Username already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(User {
        id,
        username: data.username,
        role: data.role,
        full_name: data.full_name,
        email: data.email,
        created_at: now,
        last_login: None,
    })
}

#[tauri::command]
fn update_user(
    state: State<AppState>,
    id: String,
    full_name: Option<String>,
    email: Option<String>,
    role: Option<String>,
    password: Option<String>,
) -> Result<User, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    if let Some(ref r) = role {
        let valid_roles = ["admin", "management", "finance", "teacher"];
        if !valid_roles.contains(&r.as_str()) {
            return Err(format!("Invalid role: {}", r));
        }
    }

    if let Some(full_name) = &full_name {
        conn.execute("UPDATE users SET full_name = ?1 WHERE id = ?2", params![full_name, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(email) = &email {
        conn.execute("UPDATE users SET email = ?1 WHERE id = ?2", params![email, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(role) = &role {
        conn.execute("UPDATE users SET role = ?1 WHERE id = ?2", params![role, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(pwd) = &password {
        if pwd.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        let salt = generate_salt();
        let hash = hash_password(pwd, &salt);
        conn.execute(
            "UPDATE users SET password_hash = ?1, password_salt = ?2 WHERE id = ?3",
            params![hash, salt, &id],
        ).map_err(|e| e.to_string())?;
    }

    let user = conn.query_row(
        "SELECT id, username, role, full_name, email, created_at, last_login FROM users WHERE id = ?1",
        params![&id],
        |row| Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            full_name: row.get(3)?,
            email: row.get(4)?,
            created_at: row.get(5)?,
            last_login: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(user)
}

#[tauri::command]
fn delete_user(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM users WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Students
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_student(row: &rusqlite::Row) -> rusqlite::Result<Student> {
    Ok(Student {
        id: row.get(0)?,
        admission_number: row.get(1)?,
        first_name: row.get(2)?,
        last_name: row.get(3)?,
        date_of_birth: row.get(4)?,
        gender: row.get(5)?,
        class_id: row.get(6)?,
        section: row.get(7)?,
        parent_name: row.get(8)?,
        parent_phone: row.get(9)?,
        address: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

#[tauri::command]
fn get_students(state: State<AppState>, class_id: Option<String>) -> Result<Vec<Student>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = if class_id.is_some() {
        "SELECT id, admission_number, first_name, last_name, date_of_birth, gender, class_id,
                section, parent_name, parent_phone, address, created_at, updated_at
         FROM students WHERE class_id = ?1 ORDER BY last_name, first_name"
    } else {
        "SELECT id, admission_number, first_name, last_name, date_of_birth, gender, class_id,
                section, parent_name, parent_phone, address, created_at, updated_at
         FROM students ORDER BY last_name, first_name"
    };

    let students = if let Some(cid) = class_id {
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        stmt.query_map(params![cid], row_to_student)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        stmt.query_map([], row_to_student)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    Ok(students)
}

#[tauri::command]
fn create_student(state: State<AppState>, data: StudentInput) -> Result<Student, String> {
    if data.first_name.trim().is_empty() || data.last_name.trim().is_empty() {
        return Err("First name and last name are required".to_string());
    }
    if data.admission_number.trim().is_empty() {
        return Err("Admission number is required".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO students (id, admission_number, first_name, last_name, date_of_birth,
                               gender, class_id, section, parent_name, parent_phone, address,
                               created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        params![
            &id, &data.admission_number, &data.first_name, &data.last_name,
            &data.date_of_birth, &data.gender, &data.class_id, &data.section,
            &data.parent_name, &data.parent_phone, &data.address, &now, &now
        ],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Admission number already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(Student {
        id,
        admission_number: data.admission_number,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        class_id: data.class_id,
        section: data.section,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        address: data.address,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn update_student(state: State<AppState>, id: String, data: StudentInput) -> Result<Student, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE students SET admission_number=?1, first_name=?2, last_name=?3,
                             date_of_birth=?4, gender=?5, class_id=?6, section=?7,
                             parent_name=?8, parent_phone=?9, address=?10, updated_at=?11
         WHERE id = ?12",
        params![
            &data.admission_number, &data.first_name, &data.last_name,
            &data.date_of_birth, &data.gender, &data.class_id, &data.section,
            &data.parent_name, &data.parent_phone, &data.address, &now, &id
        ],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Student not found".to_string());
    }

    Ok(Student {
        id,
        admission_number: data.admission_number,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        class_id: data.class_id,
        section: data.section,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        address: data.address,
        created_at: String::new(), // caller ignores this field on update
        updated_at: now,
    })
}

#[tauri::command]
fn delete_student(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM students WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn bulk_import_students(state: State<AppState>, records: Vec<StudentInput>) -> Result<i32, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut count = 0i32;

    for data in &records {
        let id = Uuid::new_v4().to_string();
        let result = conn.execute(
            "INSERT OR IGNORE INTO students (id, admission_number, first_name, last_name,
                                             date_of_birth, gender, class_id, section,
                                             parent_name, parent_phone, address, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
            params![
                &id, &data.admission_number, &data.first_name, &data.last_name,
                &data.date_of_birth, &data.gender, &data.class_id, &data.section,
                &data.parent_name, &data.parent_phone, &data.address, &now, &now
            ],
        );
        if let Ok(1) = result {
            count += 1;
        }
    }

    Ok(count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Staff
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_staff(row: &rusqlite::Row) -> rusqlite::Result<Staff> {
    Ok(Staff {
        id: row.get(0)?,
        employee_id: row.get(1)?,
        first_name: row.get(2)?,
        last_name: row.get(3)?,
        designation: row.get(4)?,
        department: row.get(5)?,
        date_of_joining: row.get(6)?,
        phone: row.get(7)?,
        email: row.get(8)?,
        salary: row.get(9)?,
        is_active: row.get::<_, i32>(10)? != 0,
        created_at: row.get(11)?,
    })
}

#[tauri::command]
fn get_staff(state: State<AppState>, department: Option<String>, is_active: Option<bool>) -> Result<Vec<Staff>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if department.is_some() { conditions.push("department = ?"); }
    if is_active.is_some() { conditions.push("is_active = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, employee_id, first_name, last_name, designation, department,
                date_of_joining, phone, email, salary, is_active, created_at
         FROM staff {} ORDER BY last_name, first_name",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let staff = match (&department, &is_active) {
        (Some(d), Some(a)) => {
            let active_int = if *a { 1i32 } else { 0i32 };
            stmt.query_map(params![d, active_int], row_to_staff)
        }
        (Some(d), None) => stmt.query_map(params![d], row_to_staff),
        (None, Some(a)) => {
            let active_int = if *a { 1i32 } else { 0i32 };
            stmt.query_map(params![active_int], row_to_staff)
        }
        (None, None) => stmt.query_map([], row_to_staff),
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(staff)
}

#[tauri::command]
fn create_staff(state: State<AppState>, data: StaffInput) -> Result<Staff, String> {
    if data.first_name.trim().is_empty() || data.last_name.trim().is_empty() {
        return Err("First name and last name are required".to_string());
    }
    if data.salary < 0.0 {
        return Err("Salary cannot be negative".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let is_active_int = if data.is_active { 1 } else { 0 };

    conn.execute(
        "INSERT INTO staff (id, employee_id, first_name, last_name, designation, department,
                            date_of_joining, phone, email, salary, is_active, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            &id, &data.employee_id, &data.first_name, &data.last_name,
            &data.designation, &data.department, &data.date_of_joining,
            &data.phone, &data.email, &data.salary, &is_active_int, &now
        ],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Employee ID already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(Staff { id, employee_id: data.employee_id, first_name: data.first_name,
               last_name: data.last_name, designation: data.designation,
               department: data.department, date_of_joining: data.date_of_joining,
               phone: data.phone, email: data.email, salary: data.salary,
               is_active: data.is_active, created_at: now })
}

#[tauri::command]
fn update_staff(state: State<AppState>, id: String, data: StaffInput) -> Result<Staff, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let is_active_int = if data.is_active { 1 } else { 0 };

    let rows = conn.execute(
        "UPDATE staff SET employee_id=?1, first_name=?2, last_name=?3, designation=?4,
                          department=?5, date_of_joining=?6, phone=?7, email=?8,
                          salary=?9, is_active=?10
         WHERE id = ?11",
        params![
            &data.employee_id, &data.first_name, &data.last_name, &data.designation,
            &data.department, &data.date_of_joining, &data.phone, &data.email,
            &data.salary, &is_active_int, &id
        ],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Staff member not found".to_string());
    }

    let now = Utc::now().to_rfc3339();
    Ok(Staff { id, employee_id: data.employee_id, first_name: data.first_name,
               last_name: data.last_name, designation: data.designation,
               department: data.department, date_of_joining: data.date_of_joining,
               phone: data.phone, email: data.email, salary: data.salary,
               is_active: data.is_active, created_at: now })
}

#[tauri::command]
fn delete_staff(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM staff WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Attendance
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_attendance(row: &rusqlite::Row) -> rusqlite::Result<AttendanceRecord> {
    Ok(AttendanceRecord {
        id: row.get(0)?,
        student_id: row.get(1)?,
        staff_id: row.get(2)?,
        date: row.get(3)?,
        status: row.get(4)?,
        remarks: row.get(5)?,
        recorded_by: row.get(6)?,
        created_at: row.get(7)?,
    })
}

#[tauri::command]
fn get_attendance(
    state: State<AppState>,
    date: Option<String>,
    student_id: Option<String>,
    staff_id: Option<String>,
) -> Result<Vec<AttendanceRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if date.is_some() { conditions.push("date = ?"); }
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if staff_id.is_some() { conditions.push("staff_id = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, student_id, staff_id, date, status, remarks, recorded_by, created_at
         FROM attendance {} ORDER BY date DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    // Build param list dynamically
    let mut param_values: Vec<String> = vec![];
    if let Some(d) = &date { param_values.push(d.clone()); }
    if let Some(s) = &student_id { param_values.push(s.clone()); }
    if let Some(s) = &staff_id { param_values.push(s.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let records = stmt.query_map(params_refs.as_slice(), row_to_attendance)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
fn get_attendance_by_range(
    state: State<AppState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<AttendanceRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, student_id, staff_id, date, status, remarks, recorded_by, created_at
         FROM attendance WHERE date >= ?1 AND date <= ?2 ORDER BY date"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map(params![&start_date, &end_date], row_to_attendance)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
fn create_attendance(state: State<AppState>, data: AttendanceInput) -> Result<AttendanceRecord, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO attendance (id, student_id, staff_id, date, status, remarks, recorded_by, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![
            &id, &data.student_id, &data.staff_id, &data.date,
            &data.status, &data.remarks, &data.recorded_by, &now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(AttendanceRecord {
        id,
        student_id: data.student_id,
        staff_id: data.staff_id,
        date: data.date,
        status: data.status,
        remarks: data.remarks,
        recorded_by: data.recorded_by,
        created_at: now,
    })
}

#[tauri::command]
fn bulk_create_attendance(state: State<AppState>, records: Vec<AttendanceInput>) -> Result<i32, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut count = 0i32;

    for data in &records {
        let id = Uuid::new_v4().to_string();
        if conn.execute(
            "INSERT INTO attendance (id, student_id, staff_id, date, status, remarks, recorded_by, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                &id, &data.student_id, &data.staff_id, &data.date,
                &data.status, &data.remarks, &data.recorded_by, &now
            ],
        ).is_ok() {
            count += 1;
        }
    }

    Ok(count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Salary
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_salary(row: &rusqlite::Row) -> rusqlite::Result<SalaryRecord> {
    Ok(SalaryRecord {
        id: row.get(0)?,
        staff_id: row.get(1)?,
        month: row.get(2)?,
        year: row.get(3)?,
        base_salary: row.get(4)?,
        allowances: row.get(5)?,
        deductions: row.get(6)?,
        net_salary: row.get(7)?,
        payment_date: row.get(8)?,
        status: row.get(9)?,
        processed_by: row.get(10)?,
        created_at: row.get(11)?,
    })
}

#[tauri::command]
fn get_salary(
    state: State<AppState>,
    staff_id: Option<String>,
    month: Option<String>,
    status: Option<String>,
) -> Result<Vec<SalaryRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if staff_id.is_some() { conditions.push("staff_id = ?"); }
    if month.is_some() { conditions.push("month = ?"); }
    if status.is_some() { conditions.push("status = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, staff_id, month, year, base_salary, allowances, deductions,
                net_salary, payment_date, status, processed_by, created_at
         FROM salary {} ORDER BY year DESC, month DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut param_values: Vec<String> = vec![];
    if let Some(s) = &staff_id { param_values.push(s.clone()); }
    if let Some(m) = &month { param_values.push(m.clone()); }
    if let Some(s) = &status { param_values.push(s.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let records = stmt.query_map(params_refs.as_slice(), row_to_salary)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
fn update_salary(
    state: State<AppState>,
    id: String,
    status: String,
    payment_date: Option<String>,
) -> Result<SalaryRecord, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE salary SET status = ?1, payment_date = ?2 WHERE id = ?3",
        params![&status, &payment_date, &id],
    ).map_err(|e| e.to_string())?;

    let record = conn.query_row(
        "SELECT id, staff_id, month, year, base_salary, allowances, deductions,
                net_salary, payment_date, status, processed_by, created_at
         FROM salary WHERE id = ?1",
        params![&id],
        row_to_salary,
    ).map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
fn process_bulk_salary(
    state: State<AppState>,
    staff_ids: Vec<String>,
    month: String,
    year: i32,
    processed_by: String,
) -> Result<Vec<SalaryRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut new_records = vec![];

    for staff_id in &staff_ids {
        // Get staff salary
        let salary_result = conn.query_row(
            "SELECT salary FROM staff WHERE id = ?1",
            params![staff_id],
            |row| row.get::<_, f64>(0),
        );

        let base_salary = match salary_result {
            Ok(s) => s,
            Err(_) => continue, // skip if staff not found
        };

        let id = Uuid::new_v4().to_string();
        let net = base_salary; // allowances/deductions default to 0

        let result = conn.execute(
            "INSERT OR IGNORE INTO salary
             (id, staff_id, month, year, base_salary, allowances, deductions,
              net_salary, status, processed_by, created_at)
             VALUES (?1,?2,?3,?4,?5,0,0,?6,'pending',?7,?8)",
            params![&id, staff_id, &month, &year, &base_salary, &net, &processed_by, &now],
        );

        if result.is_ok() {
            new_records.push(SalaryRecord {
                id,
                staff_id: staff_id.clone(),
                month: month.clone(),
                year,
                base_salary,
                allowances: 0.0,
                deductions: 0.0,
                net_salary: net,
                payment_date: None,
                status: "pending".to_string(),
                processed_by: processed_by.clone(),
                created_at: now.clone(),
            });
        }
    }

    Ok(new_records)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Fees
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_fee(row: &rusqlite::Row) -> rusqlite::Result<FeeRecord> {
    Ok(FeeRecord {
        id: row.get(0)?,
        student_id: row.get(1)?,
        fee_type: row.get(2)?,
        amount: row.get(3)?,
        due_date: row.get(4)?,
        paid_amount: row.get(5)?,
        payment_date: row.get(6)?,
        status: row.get(7)?,
        academic_year: row.get(8)?,
        remarks: row.get(9)?,
        created_at: row.get(10)?,
    })
}

#[tauri::command]
fn get_fees(
    state: State<AppState>,
    student_id: Option<String>,
    status: Option<String>,
    academic_year: Option<String>,
) -> Result<Vec<FeeRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if status.is_some() { conditions.push("status = ?"); }
    if academic_year.is_some() { conditions.push("academic_year = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, student_id, fee_type, amount, due_date, paid_amount, payment_date,
                status, academic_year, remarks, created_at
         FROM fees {} ORDER BY due_date",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut param_values: Vec<String> = vec![];
    if let Some(s) = &student_id { param_values.push(s.clone()); }
    if let Some(s) = &status { param_values.push(s.clone()); }
    if let Some(s) = &academic_year { param_values.push(s.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let records = stmt.query_map(params_refs.as_slice(), row_to_fee)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
fn create_fee(state: State<AppState>, data: FeeInput) -> Result<FeeRecord, String> {
    if data.amount <= 0.0 {
        return Err("Fee amount must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO fees (id, student_id, fee_type, amount, due_date, paid_amount,
                           status, academic_year, remarks, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            &id, &data.student_id, &data.fee_type, &data.amount, &data.due_date,
            &data.paid_amount, &data.status, &data.academic_year, &data.remarks, &now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(FeeRecord {
        id,
        student_id: data.student_id,
        fee_type: data.fee_type,
        amount: data.amount,
        due_date: data.due_date,
        paid_amount: data.paid_amount,
        payment_date: None,
        status: data.status,
        academic_year: data.academic_year,
        remarks: data.remarks,
        created_at: now,
    })
}

#[tauri::command]
fn record_fee_payment(
    state: State<AppState>,
    id: String,
    amount: f64,
) -> Result<FeeRecord, String> {
    if amount <= 0.0 {
        return Err("Payment amount must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    // Get current record
    let record = conn.query_row(
        "SELECT id, student_id, fee_type, amount, due_date, paid_amount, payment_date,
                status, academic_year, remarks, created_at
         FROM fees WHERE id = ?1",
        params![&id],
        row_to_fee,
    ).map_err(|e| e.to_string())?;

    let new_paid = (record.paid_amount + amount).min(record.amount);
    let new_status = if new_paid >= record.amount {
        "paid"
    } else if new_paid > 0.0 {
        "partial"
    } else {
        "pending"
    };

    conn.execute(
        "UPDATE fees SET paid_amount = ?1, payment_date = ?2, status = ?3 WHERE id = ?4",
        params![new_paid, &now, new_status, &id],
    ).map_err(|e| e.to_string())?;

    Ok(FeeRecord {
        id: record.id,
        student_id: record.student_id,
        fee_type: record.fee_type,
        amount: record.amount,
        due_date: record.due_date,
        paid_amount: new_paid,
        payment_date: Some(now),
        status: new_status.to_string(),
        academic_year: record.academic_year,
        remarks: record.remarks,
        created_at: record.created_at,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Inventory
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_inventory(row: &rusqlite::Row) -> rusqlite::Result<InventoryItem> {
    Ok(InventoryItem {
        id: row.get(0)?,
        item_code: row.get(1)?,
        name: row.get(2)?,
        category: row.get(3)?,
        quantity: row.get(4)?,
        unit: row.get(5)?,
        unit_price: row.get(6)?,
        supplier: row.get(7)?,
        reorder_level: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

#[tauri::command]
fn get_inventory(state: State<AppState>, category: Option<String>) -> Result<Vec<InventoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let (sql, use_param) = if category.is_some() {
        ("SELECT id, item_code, name, category, quantity, unit, unit_price, supplier,
                 reorder_level, created_at, updated_at
          FROM inventory WHERE category = ?1 ORDER BY name", true)
    } else {
        ("SELECT id, item_code, name, category, quantity, unit, unit_price, supplier,
                 reorder_level, created_at, updated_at
          FROM inventory ORDER BY name", false)
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let items = if use_param {
        stmt.query_map(params![category.unwrap()], row_to_inventory)
    } else {
        stmt.query_map([], row_to_inventory)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
fn get_low_stock(state: State<AppState>) -> Result<Vec<InventoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, item_code, name, category, quantity, unit, unit_price, supplier,
                reorder_level, created_at, updated_at
         FROM inventory
         WHERE reorder_level IS NOT NULL AND quantity <= reorder_level
         ORDER BY name"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], row_to_inventory)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
fn create_inventory_item(state: State<AppState>, data: InventoryInput) -> Result<InventoryItem, String> {
    if data.name.trim().is_empty() {
        return Err("Item name is required".to_string());
    }
    if data.unit_price < 0.0 {
        return Err("Unit price cannot be negative".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO inventory (id, item_code, name, category, quantity, unit, unit_price,
                                supplier, reorder_level, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        params![
            &id, &data.item_code, &data.name, &data.category, &data.quantity,
            &data.unit, &data.unit_price, &data.supplier, &data.reorder_level, &now, &now
        ],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Item code already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(InventoryItem {
        id, item_code: data.item_code, name: data.name, category: data.category,
        quantity: data.quantity, unit: data.unit, unit_price: data.unit_price,
        supplier: data.supplier, reorder_level: data.reorder_level,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
fn update_inventory_item(state: State<AppState>, id: String, data: InventoryInput) -> Result<InventoryItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE inventory SET item_code=?1, name=?2, category=?3, quantity=?4, unit=?5,
                              unit_price=?6, supplier=?7, reorder_level=?8, updated_at=?9
         WHERE id = ?10",
        params![
            &data.item_code, &data.name, &data.category, &data.quantity, &data.unit,
            &data.unit_price, &data.supplier, &data.reorder_level, &now, &id
        ],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Inventory item not found".to_string());
    }

    Ok(InventoryItem {
        id, item_code: data.item_code, name: data.name, category: data.category,
        quantity: data.quantity, unit: data.unit, unit_price: data.unit_price,
        supplier: data.supplier, reorder_level: data.reorder_level,
        created_at: String::new(), updated_at: now,
    })
}

#[tauri::command]
fn delete_inventory_item(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM inventory WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Courses
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_course(row: &rusqlite::Row) -> rusqlite::Result<Course> {
    Ok(Course {
        id: row.get(0)?,
        code: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        credits: row.get(4)?,
        teacher_id: row.get(5)?,
        class_id: row.get(6)?,
        created_at: row.get(7)?,
    })
}

#[tauri::command]
fn get_courses(
    state: State<AppState>,
    class_id: Option<String>,
    teacher_id: Option<String>,
) -> Result<Vec<Course>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if class_id.is_some() { conditions.push("class_id = ?"); }
    if teacher_id.is_some() { conditions.push("teacher_id = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, code, name, description, credits, teacher_id, class_id, created_at
         FROM courses {} ORDER BY name",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut param_values: Vec<String> = vec![];
    if let Some(c) = &class_id { param_values.push(c.clone()); }
    if let Some(t) = &teacher_id { param_values.push(t.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let courses = stmt.query_map(params_refs.as_slice(), row_to_course)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(courses)
}

#[tauri::command]
fn create_course(state: State<AppState>, data: CourseInput) -> Result<Course, String> {
    if data.name.trim().is_empty() || data.code.trim().is_empty() {
        return Err("Course code and name are required".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO courses (id, code, name, description, credits, teacher_id, class_id, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![&id, &data.code, &data.name, &data.description, &data.credits, &data.teacher_id, &data.class_id, &now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Course code already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(Course { id, code: data.code, name: data.name, description: data.description,
               credits: data.credits, teacher_id: data.teacher_id,
               class_id: data.class_id, created_at: now })
}

#[tauri::command]
fn update_course(state: State<AppState>, id: String, data: CourseInput) -> Result<Course, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE courses SET code=?1, name=?2, description=?3, credits=?4, teacher_id=?5, class_id=?6
         WHERE id = ?7",
        params![&data.code, &data.name, &data.description, &data.credits, &data.teacher_id, &data.class_id, &id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Course not found".to_string());
    }

    Ok(Course { id, code: data.code, name: data.name, description: data.description,
               credits: data.credits, teacher_id: data.teacher_id,
               class_id: data.class_id, created_at: now })
}

#[tauri::command]
fn delete_course(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM courses WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Exams
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_exam(row: &rusqlite::Row) -> rusqlite::Result<ExamRecord> {
    Ok(ExamRecord {
        id: row.get(0)?,
        student_id: row.get(1)?,
        course_id: row.get(2)?,
        exam_type: row.get(3)?,
        marks: row.get(4)?,
        max_marks: row.get(5)?,
        graded_by: row.get(6)?,
        graded_at: row.get(7)?,
        remarks: row.get(8)?,
        created_at: row.get(9)?,
    })
}

#[tauri::command]
fn get_exams(
    state: State<AppState>,
    student_id: Option<String>,
    course_id: Option<String>,
) -> Result<Vec<ExamRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if student_id.is_some() { conditions.push("student_id = ?"); }
    if course_id.is_some() { conditions.push("course_id = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, student_id, course_id, exam_type, marks, max_marks, graded_by, graded_at, remarks, created_at
         FROM exams {} ORDER BY created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut param_values: Vec<String> = vec![];
    if let Some(s) = &student_id { param_values.push(s.clone()); }
    if let Some(c) = &course_id { param_values.push(c.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let records = stmt.query_map(params_refs.as_slice(), row_to_exam)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
fn create_exam(state: State<AppState>, data: ExamInput) -> Result<ExamRecord, String> {
    if data.marks < 0.0 || data.marks > data.max_marks {
        return Err("Marks must be between 0 and max marks".to_string());
    }
    if data.max_marks <= 0.0 {
        return Err("Max marks must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO exams (id, student_id, course_id, exam_type, marks, max_marks,
                            graded_by, graded_at, remarks, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            &id, &data.student_id, &data.course_id, &data.exam_type,
            &data.marks, &data.max_marks, &data.graded_by, &now, &data.remarks, &now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(ExamRecord {
        id, student_id: data.student_id, course_id: data.course_id,
        exam_type: data.exam_type, marks: data.marks, max_marks: data.max_marks,
        graded_by: data.graded_by, graded_at: Some(now.clone()),
        remarks: data.remarks, created_at: now,
    })
}

#[tauri::command]
fn update_exam(
    state: State<AppState>,
    id: String,
    marks: f64,
    graded_by: String,
    remarks: Option<String>,
) -> Result<ExamRecord, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE exams SET marks = ?1, graded_by = ?2, graded_at = ?3, remarks = ?4 WHERE id = ?5",
        params![marks, &graded_by, &now, &remarks, &id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Exam record not found".to_string());
    }

    let record = conn.query_row(
        "SELECT id, student_id, course_id, exam_type, marks, max_marks, graded_by, graded_at, remarks, created_at
         FROM exams WHERE id = ?1",
        params![&id],
        row_to_exam,
    ).map_err(|e| e.to_string())?;

    Ok(record)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Ledger
// ─────────────────────────────────────────────────────────────────────────────

fn row_to_ledger(row: &rusqlite::Row) -> rusqlite::Result<LedgerEntry> {
    Ok(LedgerEntry {
        id: row.get(0)?,
        date: row.get(1)?,
        account_code: row.get(2)?,
        account_name: row.get(3)?,
        description: row.get(4)?,
        debit: row.get(5)?,
        credit: row.get(6)?,
        balance: row.get(7)?,
        voucher_type: row.get(8)?,
        voucher_number: row.get(9)?,
        created_by: row.get(10)?,
        created_at: row.get(11)?,
    })
}

#[tauri::command]
fn get_ledger(
    state: State<AppState>,
    start_date: Option<String>,
    end_date: Option<String>,
    account_code: Option<String>,
) -> Result<Vec<LedgerEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec![];
    if start_date.is_some() { conditions.push("date >= ?"); }
    if end_date.is_some() { conditions.push("date <= ?"); }
    if account_code.is_some() { conditions.push("account_code = ?"); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, date, account_code, account_name, description, debit, credit,
                balance, voucher_type, voucher_number, created_by, created_at
         FROM ledger {} ORDER BY date, created_at",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut param_values: Vec<String> = vec![];
    if let Some(s) = &start_date { param_values.push(s.clone()); }
    if let Some(e) = &end_date { param_values.push(e.clone()); }
    if let Some(a) = &account_code { param_values.push(a.clone()); }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let entries = stmt.query_map(params_refs.as_slice(), row_to_ledger)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
fn create_ledger_entry(state: State<AppState>, data: LedgerInput) -> Result<LedgerEntry, String> {
    if data.debit < 0.0 || data.credit < 0.0 {
        return Err("Debit and credit values cannot be negative".to_string());
    }
    if data.description.trim().is_empty() {
        return Err("Description is required".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO ledger (id, date, account_code, account_name, description, debit, credit,
                             balance, voucher_type, voucher_number, created_by, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            &id, &data.date, &data.account_code, &data.account_name, &data.description,
            &data.debit, &data.credit, &data.balance, &data.voucher_type,
            &data.voucher_number, &data.created_by, &now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(LedgerEntry {
        id, date: data.date, account_code: data.account_code,
        account_name: data.account_name, description: data.description,
        debit: data.debit, credit: data.credit, balance: data.balance,
        voucher_type: data.voucher_type, voucher_number: data.voucher_number,
        created_by: data.created_by, created_at: now,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — Sync status
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_sync_status(state: State<AppState>) -> Result<SyncStatus, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sync_queue",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(SyncStatus {
        last_sync_time: Utc::now().to_rfc3339(),
        pending_changes: count,
        sync_state: "idle".to_string(),
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

static _SERVER_HANDLE: Lazy<std::sync::Arc<RwLock<Option<std::thread::JoinHandle<()>>>>> =
    Lazy::new(|| std::sync::Arc::new(RwLock::new(None)));

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let db_path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("educom")
        .join("educom.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(&db_path).expect("Failed to open database");
    init_database(&conn).expect("Failed to initialize database");
    seed_demo_data(&conn).expect("Failed to seed demo data");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            db: Mutex::new(conn),
            server_mode: RwLock::new("standalone".to_string()),
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            authenticate_user,
            // Users
            get_users,
            create_user,
            update_user,
            delete_user,
            // Students
            get_students,
            create_student,
            update_student,
            delete_student,
            bulk_import_students,
            // Staff
            get_staff,
            create_staff,
            update_staff,
            delete_staff,
            // Attendance
            get_attendance,
            get_attendance_by_range,
            create_attendance,
            bulk_create_attendance,
            // Salary
            get_salary,
            update_salary,
            process_bulk_salary,
            // Fees
            get_fees,
            create_fee,
            record_fee_payment,
            // Inventory
            get_inventory,
            get_low_stock,
            create_inventory_item,
            update_inventory_item,
            delete_inventory_item,
            // Courses
            get_courses,
            create_course,
            update_course,
            delete_course,
            // Exams
            get_exams,
            create_exam,
            update_exam,
            // Ledger
            get_ledger,
            create_ledger_entry,
            // Sync
            get_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}