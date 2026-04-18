# Security Policy

## Supported Versions

Only the latest production release receives security fixes.

| Version | Supported |
|---|---|
| Latest (main) | ✅ |
| Older versions | ❌ |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.** Public disclosure of an unpatched vulnerability puts all users at risk.

### How to Report

Email **contact@modulifyr.com** with the subject line:

\`\`\`
[SECURITY] [Project Name] — Brief description
\`\`\`

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

All Modulifyr projects are built against the OWASP Top 10. For our full security engineering standards, see the Modulifyr Technical Standards Handbook.

---

*Modulifyr Engineering · contact@modulifyr.com · Birtamode, Jhapa, Nepal*