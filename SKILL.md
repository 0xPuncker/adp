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

## CRITICAL RULES (never skip, even after context compaction)

1. **SCORE EVERY SPRINT.** After each sprint passes sensors, self-assess 0–100
   (or use evaluator if enabled). Write score to `.adp/state.json` sprint entry.
   A sprint without a score is incomplete.
2. **UPDATE state.json** after every sprint completion. Write the full sprint
   object including `score`, `evaluator_scores`, `status: "done"`, `completedAt`.
3. **NEVER skip sensors.** Run typecheck + lint + test after every sprint.
4. **NEVER ask to proceed.** Execute all sprints continuously.

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
| `adp evaluate` | Retroactively score unscored sprints using evaluator criteria |
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
└── guides/           # Feedforward guides (populated by map — 8 files)
    ├── stack.md
    ├── architecture.md
    ├── structure.md
    ├── conventions.md
    ├── testing.md
    ├── integrations.md
    ├── concerns.md
    └── security.md
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
│       ├── tasks.md           # Atomic tasks (skipped for Small)
│       └── contracts/         # Sprint contracts (one per sprint)
│           └── sprint-N.md    # Bidirectional agreement before building
└── quick/
    └── NNN-slug/
        ├── TASK.md            # Quick-mode task definition
        └── SUMMARY.md         # Quick-mode result
```

4. **Generate `harness.yaml`** with sensors AND actions matching the detected stack:

   ```yaml
   mode: sprint                      # "sprint" (decomposed) or "continuous" (single-pass)
   min_score: 80                     # Hard threshold — sprint fails below this

   sensors:
     typecheck: { command: tsc --noEmit }
     lint:      { command: npm run lint }
     test:      { command: npm test }

   order: [typecheck, lint, test]

   evaluator:                        # QA evaluator configuration
     enabled: true                   # Separate agent judges each sprint
     timing: per_sprint              # "per_sprint" | "end_of_run" | "adaptive"
     criteria:                       # Hard-fail thresholds (0-100 each)
       correctness: 80              # Does it actually work as specified?
       completeness: 75             # Are all acceptance criteria met?
       code_quality: 70             # Clean, idiomatic, follows guides?
       test_coverage: 70            # Are the important paths tested?
       security: 70                 # No injection, XSS, secrets, safe patterns?
       resilience: 65               # Error recovery, timeouts, retries, degradation?
     live_test: false               # If true, evaluator launches app and interacts
     live_test_command: npm start   # Command to start the app for live testing

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

   Defaults by stack (sensors — core):
   - TypeScript: `tsc --noEmit`, `npm run lint`, `npm test`
   - Rust: `cargo check`, `cargo clippy -- -D warnings`, `cargo test`
   - Python: `mypy .`, `ruff check .`, `pytest`
   - Go: `go vet ./...`, `golangci-lint run`, `go test ./...`

   Defaults by stack (sensors — security):
   - TypeScript: `npm audit --audit-level=moderate`
   - Rust: `cargo audit`
   - Python: `pip-audit`, `bandit -r . -c pyproject.toml`
   - Go: `govulncheck ./...`
   - All stacks: `npx secretlint '**/*'` (secret scanning)

   Defaults (evaluator):
   - `enabled: true` unless user explicitly disables
   - `timing: per_sprint` for Large/Complex, `end_of_run` for Medium
   - `min_score: 80` (global threshold when evaluator is disabled)
   - `live_test: false` unless the project has a running server (Express, FastAPI, etc.)
   - `criteria` thresholds start at 65-80; tighten after first successful feature run
   - `security: 70` — catches injection, XSS, hardcoded secrets, unpinned deps
   - `resilience: 65` — checks error handling, timeouts, retries, graceful degradation

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

Analyze the codebase and write **8 feedforward guides** into `.adp/guides/`.
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

### `.adp/guides/security.md`
- **Dependency health:** Pinned versions in lock file? Known vulnerabilities from `npm audit` / `cargo audit` / `pip-audit`?
- **Secret handling:** Env vars, vault references, or hardcoded? Scan for patterns: API keys, tokens, passwords in source
- **Input validation:** Where does user input enter the system? Sanitization at boundaries?
- **Auth & authz patterns:** How are routes protected? Token format, session handling, RBAC patterns
- **OWASP surface:** Injection points (SQL, command, template), XSS vectors, CSRF protections, CORS config
- **Dependency pinning:** Are versions locked in package.json/Cargo.toml/requirements.txt? Lock file committed?
- **N+1 / performance risks:** DB queries in loops, unbounded list fetches, missing pagination
- **Race conditions:** Shared mutable state, concurrent writes, transaction isolation
- **Error exposure:** Stack traces, internal paths, or sensitive data in error responses

**Guide rules:**
- Specific to THIS codebase. Not generic advice.
- Include `file:line` references as evidence.
- Concise — optimized for token budget.
- Descriptive (what IS) not prescriptive (what SHOULD BE).

---

## adp run [feature]

Execute the full pipeline for a feature. This is the core loop.

**IMPORTANT — Continuous execution:** Do NOT pause between sprints to ask
"Proceed to Sprint N?" or similar. Execute ALL tasks back-to-back without
stopping unless: (1) a sensor fails 3 times (blocker), (2) a gated action is
denied, or (3) a clarifying question has no obvious answer. The user has
already approved the full run by invoking `adp run`.

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

**Execution mode** (from `harness.yaml → mode`):
- `sprint` (default) — Decompose into sprints, evaluate each. Best for Large/Complex.
- `continuous` — Build all tasks in one pass, evaluate once at end. Best with Opus 4.6+ on Medium scope.

---

#### Sprint Mode (`mode: sprint`)

For each task:

1. **Sprint contract (bidirectional):**
   Write the contract to `.specs/features/{feature}/contracts/sprint-N.md`:

   ```markdown
   # Sprint N: TASK-XX {summary}

   ## What I'll build
   {description of deliverables}

   ## Files to touch
   - `src/foo/bar.ts` — new: {purpose}
   - `src/foo/baz.ts` — modify: {what changes}

   ## Acceptance criteria
   - [ ] {concrete, verifiable criterion from tasks.md}
   - [ ] {another criterion}

   ## Verification
   - Sensor: typecheck passes with new code
   - Sensor: test X covers Y
   - Manual: {if applicable}

   ## Requirements traced
   REQ-01, REQ-01.1
   ```

   **Contract review** (before building):
   - If `evaluator.enabled: true`, spawn a sub-agent to review the contract.
     Provide: task definition from `tasks.md` + the contract you just wrote.
     Sub-agent checks: does the contract fully address acceptance criteria?
     Are verification methods concrete? Any gaps vs. the task spec?
   - If the evaluator flags issues → revise the contract → re-review.
   - If evaluator is disabled → self-review: re-read the task, confirm coverage.
   - Log to activity: `sprint_start: "Sprint N: TASK-XX {summary}"`

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

7. **Evaluator QA** (if `evaluator.enabled: true`):
   Spawn a **separate sub-agent** with fresh context. Provide it ONLY:
   - The sprint contract (`contracts/sprint-N.md`)
   - The diff of files changed (`git diff` from before sprint start)
   - The sensor results (pass/fail + output)
   - The evaluator criteria from `harness.yaml`
   - If `live_test: true`: launch the app and interact with it

   The evaluator grades each criterion (0–100) and writes a verdict:
   ```json
   {
     "sprint": 1,
     "verdict": "pass",
     "scores": {
       "correctness": 92,
       "completeness": 88,
       "code_quality": 85,
       "test_coverage": 80,
       "security": 78,
       "resilience": 72
     },
     "issues": [],
     "suggestions": []
   }
   ```

   **Hard fail:** If ANY criterion < its threshold in `harness.yaml → evaluator.criteria`,
   the sprint FAILS. The evaluator's `issues[]` become the fix instructions.
   - Attempt 1: Fix issues using evaluator feedback, re-run sensors, re-evaluate.
   - Attempt 2: Fix with broader context (re-read guides + evaluator critique).
   - Attempt 3: Log blocker, halt.

   **Soft pass:** All criteria above threshold. The evaluator's `suggestions[]` are
   logged but do NOT block the sprint.

8. **On pass — Score and commit:**
   - Final score = average of evaluator's criterion scores (NOT self-assessed).
   - If evaluator is disabled, **self-assess** using the same 6 criteria:
     - Re-read the sprint contract and diff. For each criterion:
       `correctness`: Does the code actually do what the contract says?
       `completeness`: Are ALL acceptance criteria checked off?
       `code_quality`: Clean, follows guides, no dead code or hacks?
       `test_coverage`: Are happy paths + key error paths tested?
       `security`: No injection vectors, secrets in code, or unpinned deps?
       `resilience`: Errors handled, timeouts set, retry logic where needed?
     - Score each 0–100. Final score = average of all scored criteria.
     - Write `evaluator_scores` to `state.json` even in self-assess mode.
   - **Hard threshold:** If score < `harness.yaml → min_score`, sprint fails.
     Return to step 7 fix loop.
   - Commit atomically using **Conventional Commits 1.0.0** + ADP trace tag:
     ```
     feat(scope): short summary [ADP-TASK-01]

     Implements: REQ-01, REQ-01.1
     {what was implemented}
     Sensors: typecheck ✓ lint ✓ test ✓ audit ✓
     Evaluator: correctness 92 | completeness 88 | quality 85 | tests 80 | security 78 | resilience 72
     Score: 84/100
     ```
     Type prefixes: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `build` / `ci`.

9. **Update artifacts:**
   - `tasks.md` — check `- [x]` boxes on completed items, bump `Progress: N/total`
   - `state.json` — record sprint result:
     ```json
     {
       "id": 1,
       "task": "TASK-01 {summary}",
       "status": "done",
       "contract": "{what was agreed}",
       "score": 84,
       "evaluator_scores": { "correctness": 92, "completeness": 88, "code_quality": 85, "test_coverage": 80, "security": 78, "resilience": 72 },
       "requirements": ["REQ-01", "REQ-01.1"],
       "commit": "abc123f",
       "cost": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 }
     }
     ```

10. **Next task** — Immediately proceed. Do NOT ask the user to confirm.
    Fresh context: re-read only files relevant to the next task.
    For heavy research or parallelizable independent tasks, consider
    [Sub-Agent Delegation](#sub-agent-delegation).

---

#### Continuous Mode (`mode: continuous`)

For capable models (Opus 4.6+) on Medium scope, skip sprint decomposition:

1. Load ALL task definitions at once.
2. Build the entire feature as one continuous implementation pass.
3. Run sensors after completion. Fix any failures.
4. Run the **evaluator once at end-of-run** (full diff from feature start, all criteria).
5. If evaluator fails any criterion → iterate on the specific issues.
6. Commit when all criteria pass.

**Scoring in continuous mode:**
- The evaluator produces one set of scores covering the full feature.
- Record a single sprint entry in `state.json` with `id: 1`, `task: "continuous: {feature}"`.
- Map evaluator scores normally: `correctness`, `completeness`, `code_quality`, `test_coverage`.
- If `evaluator.timing` is `per_sprint`, override to `end_of_run` in continuous mode.
- `state.json` example:
  ```json
  {
    "id": 1, "task": "continuous: user-auth", "status": "done",
    "score": 85,
    "evaluator_scores": { "correctness": 92, "completeness": 85, "code_quality": 90, "test_coverage": 89, "security": 78, "resilience": 72 }
  }
  ```

This mode is faster and cheaper but offers less granular recovery.
Use sprint mode when: scope is Large/Complex, or when the feature has
high interdependency between tasks that benefit from incremental verification.

---

### Step 6: VALIDATE (feature-level UAT)

After all tasks `done`:

1. **Score safety net** — Check `state.json` for any sprints with `score: null`.
   If found, run `adp evaluate` logic for each (see [adp evaluate](#adp-evaluate)).
   This catches sprints that lost their evaluator step to context compaction.
2. **Requirement coverage check** — For each REQ in `spec.md`, confirm at least
   one task cited it and that task passed. Any REQ with zero passing tasks =
   validation failure. Log gaps to `STATE.md → Blockers`.
3. **Full sensor suite** — Run all sensors once more end-to-end.
4. **Evaluator final pass** — If evaluator is enabled, run one final evaluation
   against the complete feature (all files changed since feature start). The
   evaluator checks holistic quality: does it all fit together? Any integration
   gaps between individually-passing sprints?
5. **Live test (if configured)** — Launch the app with `evaluator.live_test_command`,
   interact with the feature's functionality, verify happy paths and error cases.
6. **Interactive UAT (Complex only)** — Walk the user through each MVP REQ,
   asking them to confirm expected behavior. Record confirmations in
   `.specs/features/{feature}/validation.md`.
7. Update state: `status: "idle"`, `phase: null`.

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

## adp evaluate

Retroactively score sprints that are missing scores (e.g., after context
compaction dropped the evaluator step). Also called **automatically** at the end
of `adp run` if any completed sprints have `score: null`.

**When this runs:**
- **Manual:** User invokes `adp evaluate` when they see "—" scores in the dashboard.
- **Auto (end of run):** Step 6 VALIDATE checks for unscored sprints and evaluates them
  before reporting the final summary. This is a safety net — sprints SHOULD be scored
  during execution, but context compaction may drop the instruction.
- **Auto (resume):** When `adp resume` loads state, if it finds unscored done sprints,
  evaluate them before continuing.

**Process:**

1. Read `.adp/state.json` — find all sprints with `score: null` and `status: "done"`.
2. Run sensors first — confirm the codebase is clean. If sensors fail, fix before scoring.
3. For each unscored sprint:
   a. Identify the commit (from `sprint.commit` or `git log --grep="ADP-TASK-{id}"`)
   b. Get the diff: `git show <commit> --stat` + `git show <commit>`
   c. Read the sprint contract (`.specs/features/{feature}/contracts/sprint-N.md`)
      or the task definition from `tasks.md` if no contract exists.
   d. **Spawn evaluator sub-agent** (if `evaluator.enabled`) with:
      - The contract/task definition
      - The commit diff
      - The `harness.yaml` criteria and thresholds
      Sub-agent grades using the standard evaluator prompt template.
   e. If evaluator is disabled, **self-assess** using the 6 criteria:
      - `correctness`: Does the code do what the task specified?
      - `completeness`: Are all parts of the task implemented?
      - `code_quality`: Clean code, no dead code, proper error handling?
      - `test_coverage`: Are the key paths tested?
      - `security`: No injection, secrets, or unpatched deps?
      - `resilience`: Errors handled, timeouts, retries?
   f. Grade each criterion 0–100. Final score = average of all scored criteria.
   g. Write verdict to `state.json`:
      ```json
      {
        "score": 87,
        "evaluator_scores": { "correctness": 94, "completeness": 90, "code_quality": 88, "test_coverage": 92, "security": 80, "resilience": 75 }
      }
      ```
   h. Log activity: `evaluator: "Sprint N scored: 91/100 (retroactive)"`
4. Report summary table of all newly scored sprints.
5. If any sprint falls below `min_score`, flag it in activity but do NOT revert.
   The user can decide whether to fix or accept.

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

For work that would bloat the orchestrator's context, delegate to a sub-agent.

**When to delegate:**
- **Evaluator QA** — Always a sub-agent. Fresh context prevents self-leniency.
- **Contract review** — Sub-agent reviews the sprint contract before building.
- **Research** — "Find all call sites of X, return a ranked list with file:line"
- **Parallel independent tasks** — `[P]`-marked tasks with no file overlap
- **Heavy brownfield analysis** — generating a single guide during `adp map`

**What to give the sub-agent:**
- Task definition (contract, task spec, or research question)
- Relevant guide(s) only — NOT the full context
- `harness.yaml` criteria (for evaluator sub-agents)
- Specific files or diffs (for review sub-agents)

**What NOT to give the sub-agent:**
- Full pipeline state or conversation history
- Other sprint contracts or results (avoid cross-contamination)
- Guides unrelated to their task

**Sub-agent return contract:**
- Evaluator → JSON verdict (`scores`, `issues`, `suggestions`)
- Research → structured list (file:line, relevance ranking)
- Parallel task → commit SHA + sensor results

The orchestrator keeps planning coherence + state management.
Sub-agents are disposable — their context is discarded after they return.

### Evaluator Agent

The evaluator is a **separate sub-agent with fresh context** that judges the
generator's work. Separation is critical — agents that evaluate their own output
are systematically lenient (Anthropic, "Harness Design for Long-Running Apps").

**When to run the evaluator:**
- `per_sprint` — After each sprint passes sensors. Catches issues early.
  Only applies in sprint mode. In continuous mode, falls back to `end_of_run`.
- `end_of_run` — Once after all tasks complete. Cheaper, less granular.
  This is the only option in continuous mode.
- `adaptive` — Per-sprint for the first 3 sprints, then end-of-run if all pass.
  In continuous mode, equivalent to `end_of_run`.

**Evaluator prompt template:**

```
You are a QA evaluator. You did NOT write this code. Review it critically.

## Sprint Contract
{contract content}

## Files Changed
{git diff}

## Sensor Results
{sensor output}

## Grading Criteria (hard thresholds)
- Correctness (min {threshold}): Does the implementation match the contract?
- Completeness (min {threshold}): Are ALL acceptance criteria addressed?
- Code Quality (min {threshold}): Clean, idiomatic, follows project conventions?
- Test Coverage (min {threshold}): Are important paths tested? Edge cases?
- Security (min {threshold}): No injection, XSS, secrets in code, pinned deps, safe patterns?
- Resilience (min {threshold}): Error recovery, timeouts, retries, graceful degradation?

## Instructions
1. Read the contract carefully. Note every acceptance criterion.
2. Review every changed file against the contract. Check for gaps.
3. If live_test is enabled:
   a. Run the `live_test_command` to start the app.
   b. Test each acceptance criterion from the contract: hit the endpoint,
      submit the form, trigger the workflow. Verify the response/behavior.
   c. Test at least one error case (invalid input, missing auth, bad ID).
   d. If the app fails to start, score correctness ≤ 50 and list the startup
      error in issues[].
4. Score each criterion 0-100. Be skeptical — do not praise mediocre work.
5. List concrete ISSUES (things that must be fixed to pass).
6. List SUGGESTIONS (improvements that won't block the sprint).
7. Verdict: "pass" if ALL scores >= thresholds, otherwise "fail".

Output JSON only.
```

**Evaluator tuning:**
- The evaluator should be calibrated over time. If it's too lenient (passing
  work that later breaks), tighten thresholds or add criteria.
- If it's too strict (blocking good work on pedantic issues), loosen thresholds
  or clarify criteria descriptions.
- Log evaluator verdicts to `state.json → sprints[].evaluator_scores` for
  retrospective analysis.

**Key principle from Anthropic:** "Every component in a harness encodes an
assumption about what the model can't do on its own. Those assumptions are worth
stress testing — they may be incorrect, and they can go stale as models improve."

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

## Engineering Hardening

Every sprint must pass not just functional tests but also security, performance,
and resilience checks. These are enforced through sensors, evaluator criteria,
and guides.

### Performance

During Execute, watch for these patterns and flag them:

- **N+1 queries:** DB calls inside loops. Fix: batch/join/preload. The evaluator
  checks for this under `code_quality` — repeated DB calls in a loop score ≤60.
- **Unbounded fetches:** List endpoints without pagination. Fix: add `limit`/`offset`
  or cursor-based pagination at system boundaries.
- **Race conditions:** Shared mutable state without synchronization. Fix: use
  transactions for DB writes, mutexes for in-memory state, optimistic locking
  for concurrent updates.
- **Memory leaks:** Event listeners never removed, growing caches without eviction,
  unclosed streams/connections. Fix: cleanup in `finally`/`defer`/destructors.

### Security

Enforced by security sensors and the `security` evaluator criterion:

- **Input validation at boundaries:** Every user input (HTTP body, query params,
  CLI args, file uploads) must be validated/sanitized before processing.
  Use schema validation (zod, pydantic, serde) not manual checks.
- **No secrets in source:** API keys, tokens, passwords must come from env vars
  or a secrets manager. The `secret_scan` sensor catches leaked credentials.
- **Dependency auditing:** The `audit` sensor runs `npm audit` / `cargo audit` /
  `pip-audit` on every sensor gate. Moderate+ vulnerabilities block the sprint.
- **Version pinning:** Dependencies must have pinned versions in the lock file.
  Unpinned `"latest"` or `"*"` ranges fail the security evaluator criterion.
- **OWASP Top 10:** During code review, check for SQL injection (parameterized
  queries only), XSS (escape output), command injection (no shell interpolation),
  path traversal (normalize + allowlist), SSRF (allowlist outbound hosts).

### Resilience

Enforced by the `resilience` evaluator criterion:

- **Error boundaries:** Every external call (HTTP, DB, file I/O) must have
  error handling. Unhandled promise rejections / panics fail the criterion.
- **Timeouts:** Network calls must have explicit timeouts. No unbounded waits.
- **Retries with backoff:** Transient failures (429, 503, connection reset) must
  use exponential backoff with jitter. Max 3 retries.
- **Graceful degradation:** If a non-critical dependency fails, the system should
  degrade (return cached data, skip optional enrichment) not crash.
- **Circuit breakers:** For services that call multiple downstream APIs, implement
  circuit breaker pattern to prevent cascade failures.

### Contingency Planning

During Design (Step 3), explicitly document:

- **What if the primary approach fails?** Name a fallback for each architectural
  decision. Record in `design.md → Contingencies`.
- **What are the known tradeoffs?** Record in `.specs/project/STATE.md → Decisions`
  with date, choice, and rationale.
- **What breaks if this dependency goes down?** For each external service, document
  the degradation path.

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
