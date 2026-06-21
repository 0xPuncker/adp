# Windsurf Workflow: Feature

**Trigger:** "feature" or "adp feature {request}"

Execute the Spec-Driven Development pipeline for a feature.

## Steps

1. **Parse request** → derive slug (lowercase, hyphens)

2. **Create `.specs/features/{feature}/`**

3. **Determine complexity:**
   - Small (≤3 files, ≤1h) → Quick mode
   - Medium (<10 tasks) → Specify → Execute
   - Large (10+ tasks) → All phases
   - Complex (ambiguous) → All + UAT

4. **SPECIFY:**
   - Load guides: conventions, architecture
   - Ask ONE critical question max
   - Create spec.md: REQ-NN, User Stories, ACs

5. **DESIGN** (skip Small/Medium):
   - Load guides: architecture, structure
   - Create design.md: architecture, contracts

6. **TASKS** (skip Small):
   - Load guides: testing, conventions
   - Create tasks.md: atomic tasks, traceability

7. **EXECUTE:**
   - Per task: contract → build → sensors → score → commit

8. **VALIDATE:**
   - REQ coverage
   - Full sensors
   - Evaluator pass
   - UAT (Complex)

9. **Output summary:**

```
ADP Complete: {feature}
 #   Task              Score   REQs      Commit
 1   TASK-01 Setup     90/100  REQ-01    abc123f
──────────────────────────────────────────────
 Avg: 89/100   Coverage: 2/2 ✓   Sensors: all ✓
```

## Templates

- `SPEC.md` — Feature spec
- `tasks.md` — Tasks
- `sprint-contract.md` — Sprint contract

## Next

- `adp verify` — Run sensors
- `adp status` — Check state
