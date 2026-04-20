# HANDOFF — {YYYY-MM-DD HH:MM} ({timezone})

> Created by `adp pause`. Read by `adp resume`. Everything needed for the next
> session to pick up in the exact state the current session left off.

---

## Session Context

- **Feature:** `{feature-name}`
- **Phase:** {specify | design | tasks | execute | validate}
- **Complexity:** {Small | Medium | Large | Complex}
- **Started:** {YYYY-MM-DD HH:MM}
- **Paused:** {YYYY-MM-DD HH:MM}

---

## Progress

### Completed

| Task | Commit | Score | Notes |
|------|--------|-------|-------|
| TASK-01 | `abc123f` | 95/100 | Clean |
| TASK-02 | `def456g` | 88/100 | Lint warning accepted (see STATE.md) |

### In progress

- **Task:** TASK-03 — {short summary}
- **Status:** {e.g. "70% — implementation done, one test failing"}
- **Last file:** `src/auth/validate.ts:78`
- **What remains:**
  1. Fix failing test at `tests/routes/auth.test.ts:42` (token validation edge case)
  2. Re-run sensors
  3. Commit as `feat(auth): validate token expiry [ADP-TASK-03]`

### Remaining

| Task | Blocked on | Parallel-eligible |
|------|------------|-------------------|
| TASK-04 | — | [P] with TASK-05 |
| TASK-05 | — | [P] with TASK-04 |
| TASK-06 | TASK-05 | — |

---

## Current Sensor State

Last run: {YYYY-MM-DD HH:MM}

| Sensor | Result | Detail |
|--------|--------|--------|
| typecheck | ✓ | clean |
| lint | ✓ | clean |
| test | ✗ | 1 failure: `tests/routes/auth.test.ts:42` — expected 401, got 200 |

---

## Requirement Coverage So Far

| REQ | Tasks touching it | Status |
|-----|-------------------|--------|
| REQ-01.1 | TASK-01 | ✓ passed sensors + committed |
| REQ-01.2 | TASK-02 | ✓ passed sensors + committed |
| REQ-02.1 | TASK-03 | ◐ in progress |
| REQ-02.2 | TASK-04 | ◯ not started |
| REQ-03 | TASK-05, TASK-06 | ◯ not started |

---

## Open Questions

Any gray areas that surfaced during this session and still need the user's input.

1. Should failed login attempts lock the account after N tries? (Affects REQ-01.4)
2. Do we rate-limit by IP, by user, or both?

Move answers into `.specs/features/{feature-name}/context.md` once resolved.

---

## Next Session Instructions

Copy-pasteable steps for whoever (or whatever) picks this up next:

1. `adp resume` → confirms you loaded this handoff
2. Run `adp verify` to confirm no drift since pause
3. Re-read:
   - `.specs/features/{feature-name}/spec.md` (REQ-02.1)
   - `.adp/guides/conventions.md` + `.adp/guides/testing.md`
   - `src/auth/validate.ts` and its test
4. Fix the failing test (see *Current Sensor State*)
5. Commit TASK-03, then start TASK-04 and TASK-05 in parallel
6. After all tasks done → run Step 6 VALIDATE (REQ coverage + full sensor suite)

---

## Deferred Ideas Captured This Session

Mirrored to `.specs/project/STATE.md → Deferred Ideas`.

- Extract `validateNIF` to shared util (seen during TASK-02)
- Rating histogram on provider dashboard (seen during TASK-03)

---

## Blockers (if any)

- `[2026-04-21]` Need NIF.pt sandbox credentials to finish TASK-07. Asked user.

Mirrored to `.specs/project/STATE.md → Blockers`.
