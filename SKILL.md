---
name: adp
description: >
  Autonomous Development Pipeline — harness-driven spec-to-code execution.
  Wraps coding work with feedforward guides (auto-generated from codebase analysis)
  and feedback sensors (lint, typecheck, test) enforced at every boundary.
  Phases: Specify → Design → Tasks → Execute, auto-sized by complexity.
  Triggers on: "adp init", "adp map", "adp run", "adp status", "adp verify",
  "adp pause", "adp resume".
license: MIT
metadata:
  author: bifrostlabs
  version: 0.2.0
---

# ADP — Autonomous Development Pipeline

Harness-driven autonomous development. You ARE the orchestrator.

```
┌─────────────────────────────────────────────────────────┐
│                    HARNESS LAYER                        │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌───────┐  ┌─────────┐       │
│  │ SPECIFY │→ │ DESIGN  │→ │ TASKS │→ │ EXECUTE │       │
│  └─────────┘  └─────────┘  └───────┘  └─────────┘       │
│       ↑            ↑            ↑           ↑           │
│   [guides]     [guides]    [guides]     [guides]        │
│       ↓            ↓            ↓           ↓           │
│   [sensors]    [sensors]   [sensors]    [sensors]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## How This Works

You (Claude Code) are the orchestrator. This skill gives you the methodology.
There is no external CLI. You use your own tools — Read, Write, Edit, Bash, Glob, Grep —
to execute every phase, run sensors, and manage state.

## Commands

| Trigger | What you do |
|---------|------------|
| `adp init` | Detect stack, create `.adp/` + `.specs/`, configure sensors, generate guides |
| `adp map` | Analyze codebase, produce `.adp/guides/` markdown files (7 docs) |
| `adp run [feature]` | Execute full pipeline E2E for a feature |
| `adp status` | Read `.adp/state.json` and report |
| `adp verify` | Run all sensors, report pass/fail |
| `adp pause` | Snapshot progress to `.specs/HANDOFF.md`, stop gracefully |
| `adp resume` | Read HANDOFF.md + state.json, resume from exact stopping point |

---

## adp init

1. **Detect stack** by reading project files:
   - `package.json` + `tsconfig.json` → TypeScript
   - `Cargo.toml` → Rust
   - `pyproject.toml` / `requirements.txt` → Python
   - `go.mod` → Go

2. **Create `.adp/` structure:**

```
.adp/
├── state.json        # Pipeline runtime state (sprint, phase, activity)
├── harness.yaml      # Sensor configuration
└── guides/           # Feedforward guides (populated by map — 7 files)
    ├── stack.md
    ├── architecture.md
    ├── structure.md
    ├── conventions.md
    ├── testing.md
    ├── integrations.md
    └── concerns.md
```

3. **Create `.specs/` structure:**

```
.specs/
├── HANDOFF.md                 # (created on `adp pause`) — resume pointer
├── project/
│   ├── PROJECT.md             # Vision, goals, tech stack, constraints
│   ├── ROADMAP.md             # Milestones, features, status
│   └── STATE.md               # Decisions, blockers, learnings, deferred ideas
├── features/
│   └── {feature}/
│       ├── spec.md            # Requirements with REQ-NN IDs
│       ├── context.md         # Gray-area UX decisions (only if ambiguity found)
│       ├── design.md          # Architecture (skipped for Small/Medium)
│       └── tasks.md           # Atomic tasks (skipped for Small)
└── quick/
    └── NNN-slug/
        ├── TASK.md            # Quick-mode task definition
        └── SUMMARY.md         # Quick-mode result
```

4. **Generate `harness.yaml`** with sensors AND actions matching the detected stack:

   ```yaml
   sensors:
     typecheck: { command: tsc --noEmit }
     lint:      { command: npm run lint }
     test:      { command: npm test }

   order: [typecheck, lint, test]

   actions:                          # external-world commands — see Action Zones
     db_up:
       command: docker compose up -d postgres
       zone: gated
       auto_approve: false
     migrate:
       command: npx prisma migrate dev
       zone: gated
       depends_on: [db_up]
     push:
       command: git push
       zone: gated
     deploy:
       command: flyctl deploy
       zone: always_ask
   ```

   Defaults by stack (sensors):
   - TypeScript: `tsc --noEmit`, `npm run lint`, `npm test`
   - Rust: `cargo check`, `cargo clippy -- -D warnings`, `cargo test`
   - Python: `mypy .`, `ruff check .`, `pytest`

   Defaults (actions) — only populated when evidence is found in the repo
   (Dockerfile, docker-compose.yaml, prisma/ dir, fly.toml, etc.). Never invent.

5. **Initialize `state.json`:**

```json
{
  "status": "idle",
  "phase": null,
  "feature": null,
  "complexity": null,
  "sprints": [],
  "activity": [],
  "startedAt": null,
  "blockers": []
}
```

6. **Seed `STATE.md`** as empty scaffold (see [State Management](#state-management)).

7. **Immediately run `adp map`** to generate guides.

---

## adp map

Analyze the codebase and write **7 feedforward guides** into `.adp/guides/`.
These are injected into your context before each phase to prevent mistakes.

**Read these files** to understand the project:
- Package manifest (`package.json`, `Cargo.toml`, etc.)
- Config files (tsconfig, eslint, prettier, CI workflows)
- Source directory structure
- Test files (patterns, location, framework)
- Key source files (entry points, routers, models)

**Write these guides** (each ≤200 lines, concise, evidence-backed):

### `.adp/guides/stack.md`
- Language, framework, runtime versions
- Key dependencies and their roles
- Build tool, package manager
- CI commands (from workflow files)

### `.adp/guides/architecture.md`
- Module layout and responsibilities
- Dependency direction (which modules import which)
- Data flow
- Public API surface per module

### `.adp/guides/structure.md`
- Directory layout, module boundaries
- File-naming patterns
- Where new features/tests/types belong

### `.adp/guides/conventions.md`
- Naming patterns (camelCase, PascalCase, snake_case — what's actually used)
- File naming (kebab-case? PascalCase? Match existing)
- Import ordering
- Error handling patterns
- Export style (named, default, barrel)
- Include `file:line` references for each observation

### `.adp/guides/testing.md`
- Test framework and assertion style
- Test file location (co-located or separate)
- Mocking/stubbing patterns
- What gets tested and what doesn't

### `.adp/guides/integrations.md`
- External services, APIs, SDKs in use
- Auth/credential mechanisms
- Rate limits, retry patterns observed
- Mock/stub strategies for integration tests

### `.adp/guides/concerns.md`
- Tech debt hotspots, fragile modules
- Known bugs, TODOs, FIXMEs with `file:line`
- Performance hot paths
- Risk areas to treat carefully

**Guide rules:**
- Specific to THIS codebase. Not generic advice.
- Include `file:line` references as evidence.
- Concise — optimized for token budget.
- Descriptive (what IS) not prescriptive (what SHOULD BE).

---

## adp run [feature]

Execute the full pipeline for a feature. This is the core loop.

### Step 0: Load State

Read `.adp/state.json` AND `.specs/project/STATE.md` (if present).
If resuming, pick up where you left off.

### Step 1: Auto-Size Complexity

Assess the feature scope:

| Scope | Criteria | Phases |
|-------|----------|--------|
| **Small** | ≤3 files, ≤1h, no new deps, no design decisions | Quick mode (see below) |
| **Medium** | Clear feature, <10 tasks | Specify → Execute |
| **Large** | Multi-component, 10+ tasks | Specify → Design → Tasks → Execute |
| **Complex** | Ambiguous, new domain | All + gray-area discussion + UAT |

### Step 2: SPECIFY

**Load guides:** `conventions.md`, `architecture.md`

**Before writing spec — clarify:**

Scan the feature request for ambiguity (UX behavior, error handling, edge cases,
role boundaries). For each gray area, ASK the user a numbered clarifying question.
Wait for answers before proceeding. Record the answers in `context.md`.

If no ambiguity exists, skip clarification and don't create `context.md`.

**Action:** Create `.specs/features/{feature}/spec.md` with:

```markdown
# {Feature Name}

## Complexity
{Small | Medium | Large | Complex} — {one-sentence rationale}

## Requirements

### ⭐ REQ-01: {summary} [MVP]

**User Story:** As a {role}, I want to {action}, so that {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN {event} THEN {system behavior} |
| REQ-01.2 | WHEN {event} THEN {system behavior} |

### REQ-02: {summary} [P2]
...
```

**Rules:**
- Every REQ gets a unique ID used downstream in tasks and commits.
- Mark priority: `⭐ [MVP]`, `[P1]`, `[P2]`, etc.
- Acceptance criteria use WHEN/THEN or GIVEN/WHEN/THEN form — testable.

**Update state:** `phase: "specify"`, `feature: "{feature}"`

### Step 3: DESIGN (skip for Small/Medium)

**Load guides:** `architecture.md`, `structure.md`, `integrations.md`

Apply the **Knowledge Verification Chain** (see [Methodology Rules](#methodology-rules))
before recommending any library or pattern. Never fabricate.

**Action:** Create `.specs/features/{feature}/design.md` with:
- Component architecture (how new modules fit existing layout)
- Data flow + sequence for key REQs
- Interface contracts (function signatures, endpoint shapes)
- Reuse map — existing code referenced, at `file:line`
- How it maps to existing patterns from guides

### Step 4: TASKS (skip for Small)

**Load guides:** `testing.md`, `conventions.md`

**Action:** Create `.specs/features/{feature}/tasks.md` with atomic tasks:

```markdown
# Tasks: {feature}

Progress: 0/N complete

## TASK-01: {summary}
- [ ] **Requirement:** REQ-01, REQ-01.1
- [ ] **Files:** src/routes/tasks.ts, src/store/tasks.ts
- [ ] **Reuses:** src/lib/db.ts:42 (pool), src/middleware/auth.ts:10
- [ ] **Depends:** none
- [ ] **Parallel:** [P] (no shared files with TASK-02)
- [ ] **Done when:** integration test passes for POST /tasks 200
- [ ] **Test:** tests/routes/tasks.test.ts — POST creates row, returns 201
- [ ] **Commit:** `feat(tasks): add POST /tasks endpoint [ADP-TASK-01]`

## TASK-02: {summary}
- [ ] **Requirement:** REQ-01.2
- [ ] **Files:** src/routes/tasks.ts
- [ ] **Reuses:** —
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** — (edits same file as TASK-01 follow-ups)
- [ ] **Done when:** {verification criteria}
- [ ] **Test:** {what test to write/verify}
- [ ] **Commit:** `feat(tasks): validate quantity [ADP-TASK-02]`
```

**Rules:**
- Each task touches ≤5 files. If more, split it.
- Every task cites a REQ-NN it satisfies.
- Every task names a concrete Done-when + Test.
- Every task pre-specifies its Conventional Commit message.
- Mark `[P]` on tasks with no file overlap with concurrent tasks — eligible for parallel execution.
- Update the `Progress: N/total` header and check the `- [ ]` boxes during Execute.

**Safety valve:** If you skipped Tasks (Medium) but discover >5 steps during Execute,
STOP and create `tasks.md`. Log: `safety_valve_triggered` to activity.

### Step 5: EXECUTE

**Load guides:** ALL guides (stack, architecture, structure, conventions, testing, integrations, concerns)

For each task:

1. **Sprint contract** — State what you'll build and how you'll verify it.
   Log to activity: `sprint_start: "Sprint N: TASK-XX {summary}"`

2. **Prerequisites** — If `spec.md → Prerequisites` lists actions not yet run
   this session, run them now (obey their Action Zone). Do not bypass a denied
   gated action — halt and log to `STATE.md → Blockers`.

3. **Scope lock** — You may only touch the files listed in the task. If you
   discover a bug, refactor opportunity, or feature idea OUTSIDE scope:
   → append it to `.specs/project/STATE.md` under **Deferred Ideas**.
   → do NOT touch it now.

4. **Build** — Implement the task following loaded guides.

5. **QA — Run sensors:**
   ```bash
   # Read sensor commands from .adp/harness.yaml and execute each one in `order`
   ```

6. **On sensor failure:**
   - Attempt 1: Read error output, fix the issue
   - Attempt 2: Re-read relevant guide + error, fix with broader context
   - Attempt 3: Log blocker to `state.json` AND `STATE.md → Blockers`, halt, ask user

7. **On sensor pass — Score and commit:**
   - Self-assess quality 0–100 against the sprint contract
   - Commit atomically using **Conventional Commits 1.0.0** + ADP trace tag:
     ```
     feat(scope): short summary [ADP-TASK-01]

     Implements: REQ-01, REQ-01.1
     {what was implemented}
     Sensors: typecheck ✓ lint ✓ test ✓
     Score: 92/100
     ```
     Type prefixes: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `build` / `ci`.

8. **Update artifacts:**
   - `tasks.md` — check `- [x]` boxes on completed items, bump `Progress: N/total`
   - `state.json` — record sprint result:
     ```json
     {
       "id": 1,
       "task": "TASK-01 {summary}",
       "status": "done",
       "contract": "{what was agreed}",
       "score": 92,
       "requirements": ["REQ-01", "REQ-01.1"],
       "commit": "abc123f",
       "cost": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 }
     }
     ```

9. **Next task** — Fresh context: re-read only files relevant to the next task.
   For heavy research or parallelizable independent tasks, consider
   [Sub-Agent Delegation](#sub-agent-delegation).

### Step 6: VALIDATE (feature-level UAT)

After all tasks `done`:

1. **Requirement coverage check** — For each REQ in `spec.md`, confirm at least
   one task cited it and that task passed. Any REQ with zero passing tasks =
   validation failure. Log gaps to `STATE.md → Blockers`.
2. **Full sensor suite** — Run all sensors once more end-to-end.
3. **Interactive UAT (Complex only)** — Walk the user through each MVP REQ,
   asking them to confirm expected behavior. Record confirmations in
   `.specs/features/{feature}/validation.md`.
4. Update state: `status: "idle"`, `phase: null`.

### Step 7: Complete

Report summary with sprint table, REQ coverage, and pointer to the feature directory.

---

## Quick Mode (Small scope express lane)

Triggered by: `adp run "quick: {description}"` or auto-classified Small.

**Guardrails — if any fail, escalate to full pipeline:**
- ≤3 files touched
- ≤1 hour of work
- No new dependencies
- No architectural/design decisions
- No new public API surface

**Flow:**
1. Create `.specs/quick/NNN-slug/TASK.md` with: description, files, approach, verify.
2. Implement.
3. Run sensors.
4. Commit: `fix(scope): summary [ADP-QUICK-NNN]` (or `feat`, `refactor`, etc.).
5. Write `.specs/quick/NNN-slug/SUMMARY.md` — one paragraph + commit SHA.

Skip Specify/Design/Tasks phases entirely.

---

## adp status

Read `.adp/state.json` and display:

```
ADP Pipeline Status
════════════════════

  Status:  ▶ RUNNING
  Sprint:  3/7
  Feature: auth-middleware
  Phase:   execute
  Elapsed: 12m

  SPRINTS
  ─────────────────────────────────────────────
  #  Task              Contract  Build  QA   Score  REQs
  1  TASK-01 Setup     ✓         ✓      ✓    95     REQ-01
  2  TASK-02 JWT       ✓         ✓      ✓    88     REQ-02
  3  TASK-03 Validate  ✓         ▶      ·    —      REQ-02.1
  4  TASK-04 Decorator ·         ·      ·    —      REQ-03

  ACTIVITY (last 5)
  ─────────────────────────────────────────────
  15:20  → Sprint 3: TASK-03 Token validation
  15:19  ⚡ typecheck ✓ lint ✓ test ✓
  15:18  ● [ADP-TASK-02] feat(auth): add JWT parsing
  15:08  ← Sprint 2 complete — score: 88
  15:08  → Sprint 2: TASK-02 JWT parsing
```

---

## adp verify

Run all sensors from `.adp/harness.yaml`:

1. Read harness.yaml
2. Execute each sensor command via Bash
3. Report pass/fail with timing
4. Update `state.json` sensors field

```
[adp] Sensor Results:
  ✓ typecheck  (2.1s)
  ✓ lint       (1.3s)
  ✗ test       (3.4s) — 2 failures
    FAIL src/auth/validate.test.ts > should reject expired tokens
```

---

## adp pause

1. Write `.specs/HANDOFF.md`:

```markdown
# HANDOFF — {timestamp}

**Feature:** {name}
**Phase:** {current phase}
**Complexity:** {sizing}

## Progress
- Completed: TASK-01, TASK-02 (committed SHA abc123f, def456g)
- In progress: TASK-03 — {what's done, what remains, file:line}
- Remaining: TASK-04, TASK-05

## Current Sensors
- typecheck: ✓
- lint: ✓
- test: ✗ (tests/routes/auth.test.ts:42 — token validation edge case)

## Next Session
1. Resume TASK-03 at src/auth/validate.ts:78
2. Fix failing test
3. Then TASK-04 (parallel-eligible with TASK-05)

## Open Questions
- {any gray areas awaiting user input}
```

2. Set `state.json → status: "paused"`.
3. Commit any clean in-progress work as `wip(scope): checkpoint [ADP-TASK-NN]` if safe.

## adp resume

1. Read `.specs/HANDOFF.md` + `.adp/state.json`.
2. Run `adp verify` to confirm nothing drifted.
3. Re-read the in-progress task's files and guides.
4. Continue from "Next Session" instructions.
5. Do NOT restart from Specify.

---

## State Management

ADP maintains **two** persistent state files with distinct purposes:

### 1. `.adp/state.json` — Pipeline runtime state

Sprint progress, phase, activity log, sensor results. Machine-readable. Rewritten often.

### 2. `.specs/project/STATE.md` — Project memory

Human-readable, append-mostly log. Preserved across features and sessions.

Scaffold:

```markdown
# Project State

## Decisions
- 2026-04-20 — Chose Prisma over TypeORM. Reason: simpler migrations, better TS inference.

## Blockers
- 2026-04-21 — TASK-07 blocked on credentials for NIF.pt sandbox. Asked user.

## Learnings
- Rate limiter in integrations.md undercounts retries; adjust before REQ-05.

## Deferred Ideas
- Rating histogram visual on provider dashboard (out of scope for TASK-12).
- Extract `validateNIF` to shared util — currently duplicated in two routes.

## Todos
- [ ] Backfill tests for legacy auth middleware
```

**Rules:**
- Every scope-creep finding → **Deferred Ideas**.
- Every architectural choice → **Decisions** (with date + reason).
- Every user-visible uncertainty or wait → **Blockers**.

### Activity Log (in state.json)

Every significant action gets logged to `state.json → activity[]`:

```json
{ "timestamp": "ISO", "type": "sprint_start", "message": "Sprint 1: TASK-01 Setup" }
{ "timestamp": "ISO", "type": "sensor_pass", "message": "typecheck ✓ lint ✓ test ✓" }
{ "timestamp": "ISO", "type": "commit", "message": "[ADP-TASK-01] feat(auth): add middleware skeleton" }
{ "timestamp": "ISO", "type": "sprint_end", "message": "Sprint 1 complete — score: 95" }
{ "timestamp": "ISO", "type": "error", "message": "Sensor failed: test — 2 failures" }
{ "timestamp": "ISO", "type": "deferred", "message": "Logged to STATE.md: extract validateNIF util" }
```

### Session Resume

When starting and `state.json` exists with `status: "running"` or `"paused"`:
1. Read state + HANDOFF.md, report where you left off
2. Run sensors to verify nothing drifted
3. Resume from the current sprint/task
4. Do NOT restart from specify

### Stuck Detection

If the same sensor fails 3 times on the same task with the same error:
1. Stop attempting fixes
2. Log blocker to `state.json` AND `STATE.md → Blockers`
3. Report diagnostic info to user
4. Wait for user guidance

---

## Methodology Rules

### Knowledge Verification Chain

When you need a fact about a library, API, or pattern, resolve in this strict order.
Never fabricate — if none of these yield a confident answer, flag uncertainty to the user.

1. **Codebase** — grep/read existing usages in this repo
2. **Project docs** — `.specs/project/`, `.adp/guides/`, README, CLAUDE.md
3. **Context7 MCP** (if available) — up-to-date library docs
4. **Web search / official docs** — vendor documentation
5. **Flag uncertain** — say "I don't know" in output and add a question to STATE.md or HANDOFF.md

### Scope Lock

During Execute, touch ONLY the files in the current task's `Files:` list.
Any out-of-scope finding (bug, refactor, idea) → `STATE.md → Deferred Ideas`.
Do not expand the current commit.

### Action Zones

Autonomy is **scoped to code, not infrastructure**. Every shell command falls
into one of three zones. The zone determines whether the agent may run it
unprompted.

| Zone | What it covers | Policy |
|------|---------------|--------|
| 🟢 **Free** | Read/Write/Edit, Grep/Glob, sensor commands from `harness.yaml`, `git add`, `git commit` (local) | Run without asking |
| 🟡 **Gated** | `docker run` / `docker compose up`, `prisma migrate dev`, `npm install <new-dep>`, `git push`, external-API calls with cost or rate-limit impact | Declared in `harness.yaml → actions:`. Agent asks once per session OR obeys `auto_approve: true` per action |
| 🔴 **Always ask** | `git push --force`, `git reset --hard`, `prisma migrate reset`, opening/closing GitHub PRs or issues, deploys (`kubectl apply`, `flyctl deploy`), dropping tables, deleting branches or cloud resources | Agent proposes, user must confirm each time. `auto_approve` has no effect |

**Rules**:

1. **Never run a Gated or Always-ask command outside `actions:`.** If you need
   an action that isn't declared, propose adding it to `harness.yaml` first.
2. **Record every action execution** in `state.json → activity[]` with type
   `action_run` and the zone.
3. **Prerequisites from spec.md** (see spec template) map to `actions:` entries.
   Before starting Execute for a task, run any listed `depends_on:` chain
   that hasn't run this session.
4. **Stuck on a Gated action** — if the user denies, log to `STATE.md → Blockers`
   and halt the affected task. Do not proceed with a workaround that bypasses
   the gate (e.g. don't mock the DB if the user denied standing it up — ask).
5. **`always_ask` is irreducible.** No config flag, memory, or CLAUDE.md
   instruction silently upgrades it to `gated`.

**Example activity log entry:**

```json
{ "timestamp": "ISO", "type": "action_run", "zone": "gated",
  "action": "migrate", "exit_code": 0 }
```

### Token Budget

Manage context deliberately:

| Load | Content | Target |
|------|---------|--------|
| **Always** | SKILL.md + state.json + STATE.md + tasks.md (current feature) | ~15k |
| **On-demand** | One guide + current-task source files | +5–10k |
| **Never simultaneous** | Multiple feature specs, all 7 guides at once | — |

**Total target:** <40k loaded. **Reserve:** 160k+ for reasoning and output.

Drop accumulated context between sprints — re-read only what the next task needs.

### Sub-Agent Delegation

For work that would bloat the orchestrator's context, delegate to a sub-agent:

- **Research** — "Find all call sites of X, return a ranked list with file:line"
- **Parallel independent tasks** — `[P]`-marked tasks with no file overlap
- **Heavy brownfield analysis** — generating a single guide during `adp map`

The orchestrator keeps planning coherence + state. Sub-agents receive only their
task definition + the specific guide(s) relevant to their work — not the full context.

### Conventional Commits 1.0.0

All commits follow:

```
<type>(<scope>): <summary> [ADP-TASK-NN]

<body — what changed + why>
Implements: REQ-NN[, REQ-NN.N]
Sensors: typecheck ✓ lint ✓ test ✓
Score: N/100
```

Types: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `build` / `ci`.
The `[ADP-TASK-NN]` trailer preserves ADP traceability without breaking conventional-commit tooling.

### Requirement Traceability

```
spec.md (REQ-NN)
   ↓
tasks.md (TASK-NN cites REQ-NN in "Requirement:" field)
   ↓
commit (body: "Implements: REQ-NN")
   ↓
validate phase (every REQ has ≥1 passing task or it's a gap)
```

Break the chain = validation failure.

---

## Harness Principles

1. **Guides prevent. Sensors catch.** Both required.
2. **Computational before inferential.** Run lint/test before LLM review.
3. **Fresh context per task.** Re-read relevant files, drop accumulated history.
4. **The harness evolves.** Re-run `adp map` after refactors or model upgrades.
5. **Don't skip sensors.** Never disable a check to make it pass. Fix the code.
6. **Never fabricate.** Knowledge Verification Chain or explicit uncertainty.
7. **Scope lock.** Discovered ideas → STATE.md, not this commit.
8. **Traceability end-to-end.** REQ → task → commit → validation, unbroken.
9. **Action zones.** Free for code, Gated for infra (declare in `harness.yaml`),
   Always-ask for destructive or externally-visible state.
