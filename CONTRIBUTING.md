# Contributing to [Project Name]

This document defines how everyone working on this project contributes code, reports issues, and collaborates. These are requirements, not suggestions. Code that does not follow these standards will not be merged.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branch Naming](#branch-naming)
3. [Commit Messages](#commit-messages)
4. [Pull Requests](#pull-requests)
5. [Code Review](#code-review)
6. [Testing Requirements](#testing-requirements)
7. [Definition of Done](#definition-of-done)

---

## Getting Started

1. Read `README.md` and get the project running locally before contributing anything.
2. Read `docs/ARCHITECTURE.md` to understand the system structure.
3. Check open issues before starting new work — the task may already be assigned.
4. If working on something not tracked, open an issue first and get it acknowledged.

---

## Branch Naming

All branches must follow this format:

\`\`\`
<type>/<short-description>
\`\`\`

| Type | When to use |
|---|---|
| `feat/` | New feature or functionality |
| `fix/` | Bug fix |
| `chore/` | Maintenance, dependency updates, config |
| `docs/` | Documentation only changes |
| `refactor/` | Code restructure, no behaviour change |
| `test/` | Adding or updating tests only |
| `perf/` | Performance improvements |

**Examples:**
\`\`\`
feat/user-authentication
fix/invoice-total-calculation
chore/update-prisma-to-6
docs/add-api-reference
refactor/extract-payment-module
\`\`\`

Rules:
- Lowercase and hyphens only. No underscores, no spaces, no camelCase.
- 3–5 words maximum.
- Branch from `main` unless told otherwise.
- Delete your branch after it is merged.

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

\`\`\`
<type>(<scope>): <short description>

[optional body]

[optional footer]
\`\`\`

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`

**Examples:**
\`\`\`
feat(auth): add JWT refresh token rotation
fix(billing): correct VAT calculation for Nepal tax rate
docs(api): add OpenAPI spec for /users endpoint
chore(deps): update next to 16.2.0
test(ratelimit): add integration tests for sliding window
ci(actions): add stale issue workflow
\`\`\`

Rules:
- Scope = the module or area affected (e.g. `auth`, `billing`, `api`, `ui`)
- Description: present tense, lowercase, no period at the end
- Max 72 characters on the first line
- Body explains *why*, not *what* (the diff shows what)
- Breaking changes: add `BREAKING CHANGE:` in the footer

---

## Pull Requests

### Before Opening a PR

- [ ] Code runs locally without errors
- [ ] All existing tests pass (`npm test`)
- [ ] New functionality has tests written for it
- [ ] Linting passes (`npm run lint`)
- [ ] No `console.log` in production code
- [ ] No hardcoded secrets or environment-specific values
- [ ] `docs/ARCHITECTURE.md` updated if system structure changed
- [ ] ADR added to `docs/adr/` if a significant technical decision was made

### PR Size

- One PR = one thing. Keep PRs small and focused.
- If a PR touches more than 400 lines of non-test code, break it up unless there is a documented reason it cannot be.
- Draft PRs are welcome for early feedback.

### PR Title

Must follow Conventional Commits format: `feat(auth): add JWT refresh token rotation`

### PR Description

Fill out the PR template completely. Vague or empty descriptions are sent back.

---

## Code Review

### As the Author

- Respond to all comments before requesting re-review.
- If you disagree with feedback, explain your reasoning — do not just close comments.
- Do not merge your own PR unless you are the sole engineer on the project.

### As the Reviewer

- Review within 1 business day of being assigned.
- Approve only if you would be comfortable shipping this code to a client.
- Leave specific, actionable comments. Use these prefixes:
  - `nit:` — minor style point, not blocking
  - `suggestion:` — improvement idea, not blocking
  - `question:` — asking for clarification, not blocking
  - `blocker:` — must be resolved before merge

### Merge Rules

- Minimum 1 approval before merging (2 for production-critical changes)
- All CI checks must pass
- No unresolved `blocker:` comments
- Squash merge preferred for feature branches

---

## Testing Requirements

Per Modulifyr Technical Standards:

- **Unit tests:** 80% minimum coverage on all business logic
- **Integration tests:** All API routes must have integration tests
- **E2E tests:** All critical user flows before a release

Write tests as part of building the feature — not after as a checkbox.

---

## Definition of Done

A task is done when **all** of these are true:

- [ ] Feature works as specified in the issue
- [ ] Unit and integration tests written and passing
- [ ] Linting passes with zero errors
- [ ] No console.log or debug code in production paths
- [ ] Documentation updated if applicable
- [ ] PR reviewed and approved
- [ ] CI pipeline green
- [ ] Merged to main and branch deleted

If any of these are not true, the task is not done.