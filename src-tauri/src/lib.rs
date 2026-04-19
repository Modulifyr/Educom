use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::State;
use rusqlite::{Connection, params};
use chrono::Utc;
use uuid::Uuid;
use once_cell::sync::Lazy;
use parking_lot::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub role: String,
    pub full_name: String,
    pub email: Option<String>,
    pub created_at: String,
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Student {
    pub id: String,
    pub admission_number: String,
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: String,
    pub gender: String,
    pub class_id: String,
    pub section: Option<String>,
    pub parent_name: String,
    pub parent_phone: String,
    pub address: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Staff {
    pub id: String,
    pub employee_id: String,
    pub first_name: String,
    pub last_name: String,
    pub designation: String,
    pub department: String,
    pub date_of_joining: String,
    pub phone: String,
    pub email: Option<String>,
    pub salary: f64,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttendanceRecord {
    pub id: String,
    pub student_id: Option<String>,
    pub staff_id: Option<String>,
    pub date: String,
    pub status: String,
    pub remarks: Option<String>,
    pub recorded_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalaryRecord {
    pub id: String,
    pub staff_id: String,
    pub month: String,
    pub year: i32,
    pub base_salary: f64,
    pub allowances: f64,
    pub deductions: f64,
    pub net_salary: f64,
    pub payment_date: Option<String>,
    pub status: String,
    pub processed_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeeRecord {
    pub id: String,
    pub student_id: String,
    pub fee_type: String,
    pub amount: f64,
    pub due_date: String,
    pub paid_amount: f64,
    pub payment_date: Option<String>,
    pub status: String,
    pub academic_year: String,
    pub remarks: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryItem {
    pub id: String,
    pub item_code: String,
    pub name: String,
    pub category: String,
    pub quantity: i32,
    pub unit: String,
    pub unit_price: f64,
    pub supplier: Option<String>,
    pub reorder_level: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub credits: i32,
    pub teacher_id: Option<String>,
    pub class_id: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExamRecord {
    pub id: String,
    pub student_id: String,
    pub course_id: String,
    pub exam_type: String,
    pub marks: f64,
    pub max_marks: f64,
    pub graded_by: Option<String>,
    pub graded_at: Option<String>,
    pub remarks: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    pub id: String,
    pub date: String,
    pub account_code: String,
    pub account_name: String,
    pub description: String,
    pub debit: f64,
    pub credit: f64,
    pub balance: f64,
    pub voucher_type: String,
    pub voucher_number: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRequest {
    pub action: String,
    pub table: String,
    pub data: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub server_mode: RwLock<ServerMode>,
    pub server_url: RwLock<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServerMode {
    Standalone,
    Server { port: u16 },
    Client { server_url: String },
}

static SERVER_HANDLE: Lazy<Arc<RwLock<Option<thread::JoinHandle<()>>>>> = Lazy::new(|| Arc::new(RwLock::new(None)));

fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT,
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
            gender TEXT NOT NULL,
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
            salary REAL NOT NULL,
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
            status TEXT NOT NULL,
            remarks TEXT,
            recorded_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS salary (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            month TEXT NOT NULL,
            year INTEGER NOT NULL,
            base_salary REAL NOT NULL,
            allowances REAL NOT NULL DEFAULT 0,
            deductions REAL NOT NULL DEFAULT 0,
            net_salary REAL NOT NULL,
            payment_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            processed_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS fees (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            fee_type TEXT NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            paid_amount REAL NOT NULL DEFAULT 0,
            payment_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
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
            quantity INTEGER NOT NULL DEFAULT 0,
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL,
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
            student_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            exam_type TEXT NOT NULL,
            marks REAL NOT NULL,
            max_marks REAL NOT NULL,
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
            debit REAL NOT NULL DEFAULT 0,
            credit REAL NOT NULL DEFAULT 0,
            balance REAL NOT NULL,
            voucher_type TEXT NOT NULL,
            voucher_number TEXT NOT NULL,
            created_by TEXT NOT NULL,
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
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        let now = Utc::now().to_rfc3339();
        
        conn.execute(
            "INSERT INTO users (id, username, role, full_name, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params!["1", "admin", "admin", "System Administrator", "admin@educom.local", &now],
        )?;

        conn.execute(
            "INSERT INTO users (id, username, role, full_name, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params!["2", "manager", "management", "School Manager", "manager@educom.local", &now],
        )?;

        conn.execute(
            "INSERT INTO users (id, username, role, full_name, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params!["3", "finance", "finance", "Finance Officer", "finance@educom.local", &now],
        )?;

        conn.execute(
            "INSERT INTO users (id, username, role, full_name, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params!["4", "teacher", "teacher", "John Teacher", "teacher@educom.local", &now],
        )?;
    }

    Ok(())
}

#[tauri::command]
fn get_users(state: State<AppState>) -> Result<Vec<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, username, role, full_name, email, created_at, last_login FROM users")
        .map_err(|e| e.to_string())?;
    
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
fn authenticate_user(state: State<AppState>, username: &str) -> Result<Option<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, username, role, full_name, email, created_at, last_login FROM users WHERE username = ?1"
    ).map_err(|e| e.to_string())?;
    
    let user = stmt.query_row(params![username], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            full_name: row.get(3)?,
            email: row.get(4)?,
            created_at: row.get(5)?,
            last_login: row.get(6)?,
        })
    }).ok();

    Ok(user)
}

#[tauri::command]
fn create_student(state: State<AppState>, data: Student) -> Result<Student, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO students (id, admission_number, first_name, last_name, date_of_birth, gender, class_id, section, parent_name, parent_phone, address, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![&id, &data.admission_number, &data.first_name, &data.last_name, &data.date_of_birth, &data.gender, &data.class_id, &data.section, &data.parent_name, &data.parent_phone, &data.address, &now, &now],
    ).map_err(|e| e.to_string())?;

    Ok(Student {
        id,
        created_at: now.clone(),
        updated_at: now,
        ..data
    })
}

#[tauri::command]
fn get_students(state: State<AppState>) -> Result<Vec<Student>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, admission_number, first_name, last_name, date_of_birth, gender, class_id, section, parent_name, parent_phone, address, created_at, updated_at FROM students"
    ).map_err(|e| e.to_string())?;
    
    let students = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(students)
}

#[tauri::command]
fn get_sync_status(state: State<AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sync_queue",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "lastSyncTime": Utc::now().to_rfc3339(),
        "pendingChanges": count,
        "syncState": "idle"
    }))
}

#[tauri::command]
fn set_server_mode(state: State<AppState>, mode: ServerMode, port: Option<u16>, server_url: Option<String>) -> Result<String, String> {
    let mut server_mode = state.server_mode.write();
    let mut url_write = state.server_url.write();
    
    match mode {
        ServerMode::Standalone => {
            *server_mode = ServerMode::Standalone;
            *url_write = None;
            Ok("Running in standalone mode".to_string())
        },
        ServerMode::Server { port: p } => {
            let actual_port = p.unwrap_or(8080);
            *server_mode = ServerMode::Server { port: actual_port };
            *url_write = Some(format!("http://localhost:{}", actual_port));
            Ok(format!("Server mode enabled on port {}", actual_port))
        },
        ServerMode::Client { server_url: url } => {
            *server_mode = ServerMode::Client { server_url: url.clone() };
            *url_write = Some(url);
            Ok(format!("Connected to server at {}", url))
        }
    }
}

#[tauri::command]
fn get_server_info(state: State<AppState>) -> Result<serde_json::Value, String> {
    let server_mode = state.server_mode.read();
    let server_url = state.server_url.read();
    
    let mode_str = match &*server_mode {
        ServerMode::Standalone => "standalone",
        ServerMode::Server { .. } => "server",
        ServerMode::Client { .. } => "client",
    };
    
    Ok(serde_json::json!({
        "mode": mode_str,
        "url": (*server_url).clone()
    }))
}

#[tauri::command]
fn start_server(state: State<AppState>, port: u16) -> Result<String, String> {
    let db_path = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("PRAGMA database_list").map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let path: String = row.get(2).map_err(|e| e.to_string())?;
            path
        } else {
            return Err("Could not determine database path".to_string());
        }
    };
    
    let addr = format!("0.0.0.0:{}", port);
    let db_path_clone = db_path.clone();
    
    let handle = thread::spawn(move || {
        use tiny_http::{Server, Response, Header};
        
        let server = match Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                log::error!("Failed to start server: {}", e);
                return;
            }
        };
        
        log::info!("Educom API server started on {}", addr);
        
        for request in server.incoming_requests() {
            let db_path = db_path_clone.clone();
            let path = request.url().to_string();
            
            thread::spawn(move || {
                let response = match path.as_str() {
                    "/api/health" => {
                        Response::from_json(&serde_json::json!({"status": "ok"})).unwrap()
                    },
                    "/api/users" => {
                        let conn = match Connection::open(&db_path) {
                            Ok(c) => c,
                            Err(e) => {
                                Response::from_string(format!("{{\"error\": \"{}\"}}", e)).with_status_code(500)
                            }
                        };
                        
                        let mut stmt = match conn.prepare("SELECT id, username, role, full_name, email, created_at, last_login FROM users") {
                            Ok(s) => s,
                            Err(e) => {
                                Response::from_string(format!("{{\"error\": \"{}\"}}", e)).with_status_code(500)
                            }
                        };
                        
                        let users: Vec<User> = stmt.query_map([], |row| {
                            Ok(User {
                                id: row.get(0)?,
                                username: row.get(1)?,
                                role: row.get(2)?,
                                full_name: row.get(3)?,
                                email: row.get(4)?,
                                created_at: row.get(5)?,
                                last_login: row.get(6)?,
                            })
                        }).ok().map(|rows| rows.filter_map(|r| r.ok()).collect()).unwrap_or_default();
                        
                        Response::from_json(&users).unwrap()
                    },
                    "/api/students" => {
                        let conn = match Connection::open(&db_path) {
                            Ok(c) => c,
                            Err(e) => {
                                Response::from_string(format!("{{\"error\": \"{}\"}}", e)).with_status_code(500)
                            }
                        };
                        
                        let mut stmt = match conn.prepare("SELECT id, admission_number, first_name, last_name, date_of_birth, gender, class_id, section, parent_name, parent_phone, address, created_at, updated_at FROM students") {
                            Ok(s) => s,
                            Err(e) => {
                                Response::from_string(format!("{{\"error\": \"{}\"}}", e)).with_status_code(500)
                            }
                        };
                        
                        let students: Vec<Student> = stmt.query_map([], |row| {
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
                        }).ok().map(|rows| rows.filter_map(|r| r.ok()).collect()).unwrap_or_default();
                        
                        Response::from_json(&students).unwrap()
                    },
                    _ => {
                        Response::from_string("{\"error\": \"Not found\"}").with_status_code(404)
                    }
                };
                
                request.respond(response).ok();
            });
        }
    });
    
    *SERVER_HANDLE.write() = Some(handle);
    
    {
        let mut server_mode = state.server_mode.write();
        *server_mode = ServerMode::Server { port };
    }
    {
        let mut server_url = state.server_url.write();
        *server_url = Some(format!("http://localhost:{}", port));
    }
    
    Ok(format!("Server started on port {}", port))
}

#[tauri::command]
fn stop_server() -> Result<String, String> {
    if let Some(handle) = SERVER_HANDLE.write().take() {
        drop(handle);
    }
    Ok("Server stopped".to_string())
}

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
            server_mode: RwLock::new(ServerMode::Standalone),
            server_url: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_users,
            authenticate_user,
            create_student,
            get_students,
            get_sync_status,
            set_server_mode,
            get_server_info,
            start_server,
            stop_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}