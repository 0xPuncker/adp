# Feature Workflow

**Trigger:** User says "feature" or "adp feature {request}"

Execute the full Spec-Driven Development pipeline for a new feature.

## What You Do

1. **Parse the feature request** and derive a slug (lowercase, hyphens only)

2. **Create `.specs/features/{feature}/` directory**

3. **Check if discovery/ddd exists** — if so, load context from those

4. **Determine complexity:**
   - **Small** (≤3 files, ≤1h, no new deps) → Quick mode
   - **Medium** (clear feature, <10 tasks) → Specify → Execute
   - **Large** (multi-component, 10+ tasks) → All phases
   - **Complex** (ambiguous, new domain) → All + UAT

5. **SPECIFY phase:**
   - Load guides: `conventions.md`, `architecture.md`, `PROJECT.md`
   - Ask at most ONE critical clarification question
   - Create `spec.md` with REQ-NN, User Stories, Acceptance Criteria

6. **DESIGN phase** (skip for Small/Medium):
   - Load guides: `architecture.md`, `structure.md`, `integrations.md`
   - Create `design.md` with component architecture, data flow, contracts

7. **TASKS phase** (skip for Small):
   - Load guides: `testing.md`, `conventions.md`
   - Create `tasks.md` with atomic tasks, REQ traceability, parallel marks

8. **EXECUTE phase:**
   - For each task:
     - Write sprint contract (`contracts/sprint-N.md`)
     - Build following guides
     - Run sensors: typecheck → lint → test
     - On pass: score and commit
     - On fail: fix and retry (3× max)

9. **VALIDATE phase:**
   - REQ coverage check
   - Full sensor suite
   - Evaluator final pass
   - Interactive UAT (Complex only)

10. **Output final summary table**

## Templates

- `SPEC.md` — Feature spec with REQ-NN
- `tasks.md` — Atomic tasks
- `sprint-contract.md` — Sprint contract

## Output Format

```
→ Sprint 1: TASK-01 Setup
  typecheck ✓  lint ✓  test ✓  (2.1s)
  [abc123f] feat(auth): add user model
← Sprint 1 ✓ — score 90/100

ADP Complete: user-auth
══════════════════════════════════════════════════════
 #   Task                       Score   REQs          Commit
 1   TASK-01 Setup              90/100  REQ-01        abc123f
 2   TASK-02 JWT logic          88/100  REQ-02        def456g
──────────────────────────────────────────────────────
 Avg score: 89/100   REQ coverage: 2/2 ✓   Sensors: all ✓
```

## Next Steps

After feature complete:
- `adp verify` — Run sensors manually
- `adp status` — Check pipeline state
