---
name: add-feature
description: Add a new feature end-to-end — spec, design, build, test
complexity: medium
---

# Feature: {Feature name}

## Complexity
Medium — new feature with clear scope, <10 tasks expected

## Vision

> One paragraph: who needs this, what it does, why now.

## Requirements

### ⭐ REQ-01: {Core capability} [MVP]

**User Story:** As a {role}, I want to {action}, so that {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN {primary use case} THEN {happy path behavior} |
| REQ-01.2 | WHEN {invalid input} THEN {validation error with clear message} |
| REQ-01.3 | WHEN {empty / boundary state} THEN {graceful handling} |

### REQ-02: {Secondary capability} [P1]

**User Story:** As a {role}, I want to {action}, so that {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN ... THEN ... |

## Non-Functional Requirements

| ID | Category | Criterion |
|----|----------|-----------|
| NFR-01 | Performance | {budget for the feature's hot path} |
| NFR-02 | Security | All inputs validated at boundary; no secrets in logs |
| NFR-03 | Observability | Errors logged with correlation ID |

## Recommended sensors
- `typecheck`, `lint`, `test`, `audit`, `secret_scan`
- `live_test: true` if exposing HTTP/CLI surface

## Out of Scope
- {Adjacent feature deferred to a separate workflow}
- {Migration from old system — separate refactor workflow}
