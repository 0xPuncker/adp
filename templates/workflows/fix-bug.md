---
name: fix-bug
description: Fix a reported bug — reproduce, isolate root cause, patch with regression test
complexity: small
---

# Fix: {Bug summary}

## Complexity
Small — bug fix with regression test, ≤3 files touched

## Bug Report

**Reported by:** {user / issue link}
**Symptom:** {what users see — error message, wrong output, hang, crash}
**Expected:** {what should happen}
**Reproduction:** {steps to reproduce, with file:line if known}
**Severity:** {S1 — outage / S2 — broken feature / S3 — degraded / S4 — minor}

## Requirements

### ⭐ REQ-01: {Bug summary} [MVP]

**User Story:** As a {affected user}, I want {correct behavior}, so that {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN {trigger from reproduction} THEN {expected behavior} (not {symptom}) |
| REQ-01.2 | WHEN {edge case adjacent to bug} THEN {correct behavior — verify no regression} |
| REQ-01.3 | A regression test MUST exist that fails before the fix and passes after |

## Workflow

1. **Reproduce** — Run the reproduction steps. Confirm the symptom locally.
2. **Isolate** — Use `git bisect` if recent regression, or read the implicated module.
   Identify the root cause, not just where the symptom appears.
3. **Test first** — Write a failing regression test that captures the bug.
4. **Fix** — Smallest change that makes the test pass without breaking others.
5. **Verify** — Run sensors. Re-run the original reproduction.

## Recommended sensors
- `typecheck`, `lint`, `test` (always)
- If integration-level bug: add live_test or e2e check

## Out of Scope
- Refactoring around the bug — log to STATE.md → Deferred Ideas instead
- Performance improvements — separate workflow
