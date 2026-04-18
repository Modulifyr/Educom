# Architecture — [Project Name]

**Version:** [e.g. 1.0]  
**Last updated:** [YYYY-MM-DD]  
**Author:** [Name]  
**Project type:** [Web App / Mobile / Desktop / API / Static Site]

---

## 1. System Overview

<!-- 2–4 sentences. What does this system do? Who uses it? What does it replace? -->

**Users:** [Who interacts with this system and how?]  
**Scale:** [Approximate number of users, records, or requests per day]  
**Criticality:** [High / Medium / Low — what happens if it goes down?]

---

## 2. Architecture Layers

This project follows Modulifyr's four-layer modular architecture.

\`\`\`
┌──────────────────────────────────────────┐
│           Presentation Layer              │
│  (UI components, pages, routes)           │
├──────────────────────────────────────────┤
│           Application Layer               │
│  (use cases, validation, orchestration)   │
├──────────────────────────────────────────┤
│             Domain Layer                  │
│  (business entities, rules, interfaces)   │
├──────────────────────────────────────────┤
│          Infrastructure Layer             │
│  (DB, APIs, file storage, email, queues)  │
└──────────────────────────────────────────┘
\`\`\`

### Presentation Layer
<!-- What lives here? Server components, client components, pages, API routes. -->

### Application Layer
<!-- What lives here? Use-case handlers, form validation, orchestration logic. -->

### Domain Layer
<!-- What lives here? Core entities, business rules, value objects. -->

### Infrastructure Layer
<!-- What lives here? Database adapters, external API clients, queues, email. -->

---

## 3. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | | |
| Language | TypeScript | Company standard |
| Styling | | |
| Database | | |
| ORM | | |
| Auth | | |
| Email | | |
| Queue | | |
| Cache | | |
| Deployment | | |
| Monitoring | | |

---

## 4. Data Flow

<!-- Describe the main data flows. -->

### [Flow 1: e.g. User submits a form]

\`\`\`
Browser → API route → Validation → Use case → Repository → Database
                                                     ↓
                                             Email notification
\`\`\`

### [Flow 2: e.g. Background job]

\`\`\`
Scheduled trigger → Queue → Worker → External API → Database update
\`\`\`

---

## 5. External Dependencies

| Service | Purpose | What happens if it's down? |
|---|---|---|
| [e.g. PostgreSQL] | Primary database | System unavailable |
| [e.g. Resend] | Transactional email | Emails queued/dropped |
| [e.g. Upstash Redis] | Rate limiting | Falls back to in-memory |
| [e.g. Vercel] | Hosting | System unavailable |

---

## 6. Environment Architecture

\`\`\`
[Development] → [Staging] → [Production]
  localhost        Vercel        Vercel
  local DB         test DB       prod DB
\`\`\`

---

## 7. Authentication & Authorization

- **Auth method:** [e.g. JWT / session-based / API key]
- **Token lifetime:** [e.g. 15 min access, 7 day refresh]
- **Authorization model:** [e.g. RBAC with roles: Admin, User, Viewer]
- **Session storage:** [e.g. HttpOnly cookie]

---

## 8. Database Schema Overview

<!-- High-level tables and relationships. Link to Prisma schema for full detail. -->

Key tables:
- `users` — [what it stores]
- `[table]` — [what it stores]

Relationships:
- A user has many [X]
- [X] belongs to one [Y]

---

## 9. Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| LCP (web) | < 2.5s | Lighthouse |
| API response (p95) | < 300ms | APM |
| DB query (p95) | < 100ms | Query profiling |
| Uptime | 99.9% | 30-day rolling |
| Error rate | < 0.1% | Error tracking |

---

## 10. Known Limitations & Technical Debt

| Limitation | Impact | Planned resolution |
|---|---|---|
| | | |

---

## 11. Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR-0001](adr/ADR-0001-[name].md) | [What was decided] |

---

*Last reviewed by: [Name] on [Date]*