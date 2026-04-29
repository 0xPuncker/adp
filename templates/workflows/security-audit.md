---
name: security-audit
description: Systematic security review — deps, secrets, OWASP, auth, input validation
complexity: large
---

# Security Audit: {Scope — module / feature / full repo}

## Complexity
Large — multi-area review across deps, code, config

## Audit Scope

| Area | In scope? | Notes |
|------|-----------|-------|
| Dependency vulnerabilities | yes | All ecosystems present |
| Secret leakage | yes | Source + history + CI logs |
| Input validation | yes | All boundaries (HTTP, CLI, file) |
| Auth / authz | yes | Routes, RBAC, session handling |
| OWASP Top 10 | yes | Each category checked |
| Infrastructure | {yes/no} | If yes, list configs to audit |
| Threat model | {yes/no} | Document trust boundaries |

## Requirements

### ⭐ REQ-01: Dependency hygiene [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | Every dependency has a pinned version in lock file |
| REQ-01.2 | `npm audit` / `cargo audit` / `pip-audit` report zero moderate+ findings |
| REQ-01.3 | Unused dependencies removed |

### ⭐ REQ-02: Secret hygiene [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | `secretlint` scan reports zero findings on current source |
| REQ-02.2 | Git history scanned (e.g., `gitleaks`) — any past leaks documented + rotated |
| REQ-02.3 | No secrets in CI configs, Dockerfiles, or env example files |

### ⭐ REQ-03: Input validation at boundaries [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | Every HTTP route validates body/query/params with schema (zod / pydantic / serde) |
| REQ-03.2 | File uploads enforce size + MIME + extension allowlists |
| REQ-03.3 | CLI args validated before use |

### REQ-04: OWASP Top 10 coverage [P1]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | A01 Broken Access Control — every route checks authorization |
| REQ-04.2 | A02 Cryptographic Failures — TLS only; no weak hashes for passwords |
| REQ-04.3 | A03 Injection — parameterized queries, escaped output, no shell interpolation |
| REQ-04.4 | A05 Misconfiguration — security headers, no debug endpoints in prod |
| REQ-04.5 | A07 Auth Failures — rate limiting, account lockout, password policy |
| REQ-04.6 | A09 Logging — no PII in logs; security events logged |

## Recommended sensors
- `audit`, `secret_scan` (always; failures block)
- `security_lint` (e.g., bandit for Python, `eslint-plugin-security`)

## Deliverables
- `audits/{date}-security-audit.md` — findings, severity, remediation status
- Patches for all S1/S2 findings
- Tickets / STATE.md → Deferred Ideas for S3/S4

## Out of Scope
- Penetration testing — separate engagement
- Compliance certification — requires external audit
