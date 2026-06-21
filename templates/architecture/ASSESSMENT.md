# Architecture Assessment

> Current state of the codebase — technical debt, risks, and improvement areas

**Last Updated:** {YYYY-MM-DD}
**Assessed By:** {Who performed the assessment}

---

## Executive Summary

{Overall health of the architecture. Key findings at a glance.}

**Overall Score:** {A/B/C/D/F}

**Key Concerns:**
- {Concern 1}
- {Concern 2}

**Key Strengths:**
- {Strength 1}
- {Strength 2}

---

## Code Quality Assessment

### Maintainability

| Area | Score | Findings |
|------|-------|----------|
| Code Organization | {A/B/C/D/F} | {Assessment} |
| Naming Conventions | {A/B/C/D/F} | {Assessment} |
| Documentation | {A/B/C/D/F} | {Assessment} |
| Error Handling | {A/B/C/D/F} | {Assessment} |

### Complexity

| Module | Cyclomatic Complexity | Cognitive Complexity | Risk |
|--------|---------------------|---------------------|------|
| {Module 1} | {Score} | {Score} | {High/Medium/Low} |
| {Module 2} | {Score} | {Score} | {High/Medium/Low} |

### Duplication

| Area | Duplication | Impact | Recommendation |
|------|-------------|--------|------------------|
| {Area 1} | {Percentage} | {Impact} | {What to do} |
| {Area 2} | {Percentage} | {Impact} | {What to do} |

---

## Architecture Assessment

### Coupling

| Module | Coupling | Issues | Recommendation |
|--------|----------|--------|------------------|
| {Module 1} | {Tight/Loose} | {Problems} | {What to do} |
| {Module 2} | {Tight/Loose} | {Problems} | {What to do} |

### Cohesion

| Module | Cohesion | Assessment | Recommendation |
|--------|----------|-------------|------------------|
| {Module 1} | {High/Low} | {Assessment} | {What to do} |
| {Module 2} | {High/Low} | {Assessment} | {What to do} |

### Abstraction Layers

| Layer | Assessment | Issues |
|-------|-------------|--------|
| {Layer 1} | {Assessment} | {Issues} |
| {Layer 2} | {Assessment} | {Issues} |

---

## Data Architecture

### Database Health

| Database | Size | Performance | Backup Status |
|-----------|------|------------|---------------|
| {DB 1} | {Size} | {Slow/Fast} | {Status} |
| {DB 2} | {Size} | {Slow/Fast} | {Status} |

### Data Model

| Entity | State | Issues |
|--------|-------|--------|
| {Entity 1} | {Good/Problematic} | {Issues} |
| {Entity 2} | {Good/Problematic} | {Issues} |

### Migration Status

| Migration | Applied | Rollback | Issues |
|-----------|---------|----------|--------|
| {Migration 1} | {Yes/No} | {Available} | {Issues} |
| {Migration 2} | {Yes/No} | {Available} | {Issues} |

---

## Performance

### Bottlenecks

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| {Endpoint 1} | {p95} | {Target} | {Gap} |
| {Endpoint 2} | {p95} | {Target} | {Gap} |
| {Query 1} | {Time} | {Target} | {Gap} |
| {Query 2} | {Time} | {Target} | {Gap} |

### Resource Usage

| Resource | Current | Limit | Utilization |
|-----------|---------|-------|-------------|
| CPU | {Average}% | {Limit}% | {Assessment} |
| Memory | {Average} | {Limit} | {Assessment} |
| Disk | {Average} | {Limit} | {Assessment} |
| Network | {Average} | {Limit} | {Assessment} |

---

## Security

### Vulnerabilities

| CVE | Severity | Component | Fixed In | Status |
|-----|----------|-----------|----------|--------|
| {CVE 1} | {High/Med/Low} | {Component} | {Version} | {Open/Fixed} |
| {CVE 2} | {High/Med/Low} | {Component} | {Version} | {Open/Fixed} |

### Security Practices

| Area | Status | Issues |
|------|--------|--------|
| Authentication | {Good/Problematic} | {Issues} |
| Authorization | {Good/Problematic} | {Issues} |
| Input Validation | {Good/Problematic} | {Issues} |
| Secrets Management | {Good/Problematic} | {Issues} |
| Encryption | {Good/Problematic} | {Issues} |

---

## Dependencies

### Outdated Dependencies

| Package | Current | Latest | Severity | Action |
|---------|---------|--------|----------|--------|
| {Package 1} | {Version} | {Version} | {High/Med/Low} | {Upgrade/Deprecate} |
| {Package 2} | {Version} | {Version} | {High/Med/Low} | {Upgrade/Deprecate} |

### Vulnerable Dependencies

| Package | Vulnerability | Severity | Action |
|---------|---------------|----------|--------|
| {Package 1} | {CVE} | {High/Med/Low} | {Upgrade/Replace} |
| {Package 2} | {CVE} | {High/Med/Low} | {Upgrade/Replace} |

### Deprecated Dependencies

| Package | Deprecated In | Replacement | Timeline |
|---------|---------------|-------------|----------|
| {Package 1} | {Date} | {Replacement} | {When to migrate} |
| {Package 2} | {Date} | {Replacement} | {When to migrate} |

---

## Operational Concerns

### Monitoring

| Area | Coverage | Gaps |
|------|----------|------|
| Logging | {Percentage} | {What's missing} |
| Metrics | {Percentage} | {What's missing} |
| Tracing | {Percentage} | {What's missing} |
| Alerting | {Percentage} | {What's missing} |

### Deployment

| Area | Status | Issues |
|------|--------|--------|
| Automation | {Good/Problematic} | {Issues} |
| Rollback | {Available/Not Available} | {Issues} |
| Zero-Downtime | {Supported/Not Supported} | {Issues} |
| Blue-Green | {Supported/Not Supported} | {Issues} |

---

## Technical Debt Register

| Debt | Location | Impact | Effort | Priority | Owner |
|------|----------|--------|--------|----------|-------|
| {Debt 1} | {file:line} | {Impact} | {Story points} | {P0/P1/P2/P3} | {Who} |
| {Debt 2} | {file:line} | {Impact} | {Story points} | {P0/P1/P2/P3} | {Who} |

---

## Recommendations

### High Priority

| Recommendation | Impact | Effort | Value |
|----------------|--------|--------|-------|
| {Recommendation 1} | {High/Med/Low} | {Story points} | {High/Med/Low} |
| {Recommendation 2} | {High/Med/Low} | {Story points} | {High/Med/Low} |

### Medium Priority

| Recommendation | Impact | Effort | Value |
|----------------|--------|--------|-------|
| {Recommendation 1} | {High/Med/Low} | {Story points} | {High/Med/Low} |

### Low Priority

| Recommendation | Impact | Effort | Value |
|----------------|--------|--------|-------|
| {Recommendation 1} | {High/Med/Low} | {Story points} | {High/Med/Low} |

---

## Action Plan

### Immediate (This Sprint)

- [ ] {Action 1}
- [ ] {Action 2}

### Short-term (Next 2-3 Sprints)

- [ ] {Action 1}
- [ ] {Action 2}

### Long-term (Next Quarter)

- [ ] {Action 1}
- [ ] {Action 2}

---

## Reassessment

**Next Assessment Date:** {YYYY-MM-DD}

**Areas to Revisit:**
- {Area 1}
- {Area 2}
