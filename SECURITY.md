# Security Policy

## Supported Versions

Only the latest production release receives security fixes.

| Version | Supported |
|---|---|
| 1.0.0 (latest) | ✅ |
| Older versions | ❌ |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.** Public disclosure of an unpatched vulnerability puts all users at risk.

### How to Report

Email **security@educom.local** with the subject line:

```
[SECURITY] Educom — Brief description
```

Include:
- A clear description of the vulnerability
- Steps to reproduce it
- The potential impact (what an attacker could do)
- Your suggested fix if you have one (optional)
- Your name/handle if you want acknowledgement (optional)

### Response Timeline

- Acknowledgement within **48 hours**
- Critical vulnerabilities: fix within **7 days**
- All others: fix within **30 days**
- You will be credited in release notes if you wish

### In Scope

- Authentication or authorisation bypasses
- SQL injection, XSS, CSRF, or other injection vulnerabilities
- Secrets or credentials exposed in code or API responses
- Insecure direct object references (IDOR)
- Remote code execution
- Data exposure affecting client or user information

### Out of Scope

- Issues in third-party services we use (report those to the vendor)
- Social engineering or physical access attacks

---

## Security Standards

### Built Against OWASP Top 10

This project implements controls against the OWASP Top 10 security risks:

| OWASP Category | Implementation |
|---|---|
| A01 - Broken Access Control | RBAC service enforces role-based permissions at UI and service layers |
| A02 - Cryptographic Failures | SQLite with rusqlite parameterized queries; no credential storage |
| A03 - Injection | All database queries use parameterized statements |
| A04 - Insecure Design | Four-layer architecture with standardized module interfaces |
| A05 - Security Misconfiguration | Tauri sandbox enforced; CSP configured |
| A06 - Vulnerable Components | Dependencies scanned via npm audit; regular updates |
| A07 - Auth Failures | Demo authentication without credential storage |
| A08 - Data Integrity | Sync queue tracks all local changes for consistency |
| A09 - Logging Failures | Structured logging via Rust env_logger |
| A10 - SSRF | No external resource fetching in core application |

### Code Security Requirements

- **No hardcoded secrets** - All secrets via environment variables
- **Parameterized queries** - All SQL uses rusqlite parameter binding
- **Input validation** - All user inputs validated before processing
- **Output encoding** - React handles XSS prevention via JSX

### Dependency Management

- **Automated scans** - npm audit runs on every build
- **Dependency updates** - Dependabot configured for weekly audits
- **Vulnerability threshold** - Critical vulnerabilities block builds

---

## Security Configuration

### Tauri Security

- CSP: Default Tauri CSP (no unsafe-inline)
- IPC: Tauri command validation
- Window: Native decorations only

### Data Protection

- **Local Storage** - All data stored in user's local app directory
- **Encryption** - SQLite database encrypted at rest
- **Sync Queue** - Pending changes queued for background sync
- **No External Calls** - Application operates fully offline

---

*Educom Institutional Management System · security@educom.local*
