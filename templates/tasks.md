# Tasks: {feature-name}

> Generated during the TASKS phase. Executed during EXECUTE — the agent ticks
> boxes as tasks complete and bumps the Progress counter.

**Progress:** 0 / N complete
**Spec:** `.specs/features/{feature-name}/spec.md`
**Design:** `.specs/features/{feature-name}/design.md` *(if present)*

Status legend: `[ ]` pending · `[x]` done · `[~]` in-progress · `[!]` blocked

---

## Execution Order

Tasks marked `[P]` under *Parallel* have no file overlap and may be dispatched
to sub-agents concurrently. Others run in the order listed.

```
TASK-01 ─┬─ TASK-02 ──┐
         └─ TASK-03 ──┼── TASK-05 ── TASK-06
           TASK-04 ───┘      [P]         [P]
```

---

## TASK-01: {short summary}

- [ ] **Requirement:** REQ-01, REQ-01.1
- [ ] **Files:** `src/routes/tasks.ts`, `src/store/tasks.ts`
- [ ] **Reuses:** `src/lib/db.ts:42` (pool), `src/middleware/auth.ts:10`
- [ ] **Depends:** —
- [ ] **Parallel:** —
- [ ] **Done when:** integration test passes for `POST /api/tasks` returning 201
- [ ] **Test:** `tests/routes/tasks.test.ts` — POST creates row, returns 201 with id
- [ ] **Commit:** `feat(tasks): add POST /tasks endpoint [ADP-TASK-01]`

---

## TASK-02: {short summary}

- [ ] **Requirement:** REQ-01.2
- [ ] **Files:** `src/routes/tasks.ts`, `src/validators/task.ts`
- [ ] **Reuses:** `src/validators/base.ts:15` (zod helpers)
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** —
- [ ] **Done when:** invalid payloads return 422 with field-level errors
- [ ] **Test:** `tests/routes/tasks.test.ts` — POST with missing title → 422
- [ ] **Commit:** `feat(tasks): validate create-task payload [ADP-TASK-02]`

---

## TASK-03: {short summary}

- [ ] **Requirement:** REQ-02.1
- [ ] **Files:** `src/routes/tasks.ts`
- [ ] **Reuses:** —
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** [P] — no file overlap with TASK-04
- [ ] **Done when:** `GET /api/tasks` returns caller's tasks, paginated
- [ ] **Test:** `tests/routes/tasks.test.ts` — returns only authenticated user's rows
- [ ] **Commit:** `feat(tasks): list user tasks with pagination [ADP-TASK-03]`

---

## TASK-04: {short summary}

- [ ] **Requirement:** REQ-03
- [ ] **Files:** `src/store/tasks.ts`, `prisma/schema.prisma`
- [ ] **Reuses:** —
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** [P] — independent from TASK-03
- [ ] **Done when:** index on `(userId, createdAt)` present and migration applied
- [ ] **Test:** migration runs cleanly on empty DB; query plan uses index
- [ ] **Commit:** `perf(tasks): index tasks by user and creation time [ADP-TASK-04]`

---

## Atomicity Checklist

Before closing TASKS phase, confirm:

- [ ] Every task touches ≤5 files — split larger work
- [ ] Every task cites at least one `REQ-NN` or `REQ-NN.N`
- [ ] Every task has a **Done when** + **Test** that a sensor can detect
- [ ] Every task pre-specifies its Conventional Commit message
- [ ] `[P]` markers only on tasks with truly disjoint file sets
- [ ] Every `REQ-NN.N` in `spec.md` is referenced by at least one task
  *(gap = validation failure later — fix now)*

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-20 | Initial breakdown — 4 tasks |
