---
name: adp
description: >
  Autonomous Development Pipeline — harness-driven spec-to-code execution.
  Wraps coding work with feedforward guides (auto-generated from codebase analysis)
  and feedback sensors (lint, typecheck, test) enforced at every boundary.
  Phases: Specify → Design → Tasks → Execute, auto-sized by complexity.
  Triggers on: "adp init", "adp map", "adp feature", "adp run",
  "adp auto-mode", "adp status", "adp verify", "adp pause", "adp resume".
license: MIT
metadata:
  author: 0xPuncker
  version: 0.3.0
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
5. **NO NARRATION.** Do not explain what you are about to do, what you just did,
   or why you made a choice. Output only: sprint start lines, sensor results,
   commit SHAs, sprint end scores, and blocker reports. Nothing else.
6. **NO RECAPS.** Never summarize previous sprints before starting the next one.
   Never say "Here's what I've done so far." State transitions are implicit in
   the activity log — not in user-facing output.
7. **NEVER HEDGE.** Do not say "I'll try to..." or "I think the best approach is..."
   or "Let me know if you'd like me to continue." Decide and build. Reserve
   uncertainty for the formal blocker protocol (see below).

### Prohibited output patterns (treated as rule violations)

- "Here's what I just did..."
- "Let me summarize the progress..."
- "Should I continue with Sprint N?"
- "I'll now proceed to..."
- "Let me know if this looks good before I move on."
- "I'm going to start by..."
- Any paragraph of prose between sprints

### Permitted output during execution

```
→ Sprint N: TASK-NN {summary}
  typecheck ✓  lint ✓  test ✓  (2.1s)
  [abc123f] feat(scope): summary
← Sprint N ✓ — score 91/100

→ Sprint N+1: TASK-NN+1 {summary}
...
```

### Blocker report format (the ONLY time ADP stops mid-run)

When ADP must halt for user input, output exactly this structure — nothing more:

```
⛔ BLOCKER
  Type:   {sensor-fail | gated-denied | git-conflict | dep-required}
  Task:   TASK-NN {summary}
  Error:  {exact error message or output, ≤5 lines}
  Tried:  {what was attempted, 1-3 bullet points}
  Needs:  {what the user must do to unblock, one sentence}
```

Then stop. Do not speculate, apologize, or suggest alternatives — give the
user the facts and wait.

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
| `adp mobile init` | Detect mobile platform (iOS/Android/Flutter/React Native), create mobile harness, generate mobile guides |
| `adp map` | Analyze codebase, produce `.adp/guides/` markdown files (7 docs) |
| `adp mobile map` | Analyze mobile codebase, produce platform-specific guides (iOS/Android/flutter guides) |
| `adp feature [request]` | Create/switch to `feat/{feature-slug}`, seed feature spec, set phase to Specify |
| `adp run [feature]` | Execute full pipeline E2E for a feature |
| `adp mobile run [feature]` | Execute mobile pipeline for a feature (mobile sensors, mobile evaluator criteria) |
| `adp auto-mode [feature]` | Maximum-autonomy variant of `adp run` — runtime + e2e sensors, auto-retry, no clarification questions, gated push/PR at the end |
| `adp status` | Read `.adp/state.json` and report |
| `adp mobile status` | Read mobile state.json and report platform-specific pipeline status |
| `adp verify` | Run all sensors, report pass/fail |
| `adp mobile verify` | Run mobile sensors (compile/lint/UI tests), report pass/fail |
| `adp evaluate` | Retroactively score unscored sprints using evaluator criteria |
| `adp mobile evaluate` | Score mobile sprints using mobile-specific criteria (mobile_ui, performance, accessibility) |
| `adp design extract [feat]` | Extract design tokens + component inventory from project files |
| `adp design intake <feat>` | Parse a Claude Design handoff and save as design bundle |
| `adp design show <feat>` | Display the design bundle for a feature |
| `adp design run <feat>` | Design-first pipeline: intake handoff → specify → design → tasks → execute |
| `adp templates list` | Show available workflow templates (fix-bug, add-feature, refactor-safely, etc.) |
| `adp templates show <name>` | Display the full template content |
| `adp templates use <name> <feat>` | Scaffold `.specs/features/<feat>/spec.md` from a template |
| `adp validate [feature]` | Run sensors + DAG validation on tasks.md (unresolved refs, cycles, parallel layers) |
| `adp worktree list` | List active sprint worktrees |
| `adp worktree clean` | Force-remove all sprint worktrees |
| `adp worktree add/remove <N>` | Manage individual sprint worktrees |
| `adp update [--branch X]` | Re-run installer to upgrade (auto-detects platform: PowerShell on Windows, bash elsewhere) |
| `adp uninstall [-y]` | Remove ADP completely: skill files, npm CLI, standalone binary |
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
│       ├── design-bundle/     # Design tokens + component inventory
│       │   └── bundle.json    # From Claude Design handoff or project extraction
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
   min_score: 85                     # Hard threshold — sprint fails below this

   sensors:
     typecheck: { command: tsc --noEmit }
     lint:      { command: npm run lint }
     test:      { command: npm test }

   order: [typecheck, lint, test]

   evaluator:                        # QA evaluator configuration
     enabled: true                   # Separate agent judges each sprint
     timing: per_sprint              # "per_sprint" | "end_of_run" | "adaptive"
     criteria:                       # Hard-fail thresholds (0-100 each)
       correctness: 93              # Does it actually work as specified?
       completeness: 89             # Are all acceptance criteria met?
       code_quality: 90             # Clean, idiomatic, follows guides?
       test_coverage: 93            # Are the important paths tested?
       security: 90                 # No injection, XSS, secrets, safe patterns?
       resilience: 85               # Error recovery, timeouts, retries, degradation?
     live_test: false               # If true, evaluator launches app and interacts
     live_test_command: npm start   # Command to start the app for live testing
     live_test_timeout: 30          # Seconds before the app process is force-killed

   autonomy:
     clarify: critical              # "never" | "critical" (default) | "always"
     output: minimal                # "minimal" (default) | "verbose"

   git:                              # built-in — no declaration needed
     branch: feat/{feature-slug}     # created at Step 0, all commits land here
     push:  gated                    # git push -u origin feat/* (ask once at end)
     pr:    gated                    # gh pr create (ask once at end)

   actions:                          # external-world commands — see Action Zones
     db_up:
       command: docker compose up -d postgres
       zone: gated
       auto_approve: false
     migrate:
       command: npx prisma migrate dev
       zone: gated
       depends_on: [db_up]
     deploy:
       command: flyctl deploy
       zone: always_ask
   ```

   **Sensor command safety constraint:** `command:` values in `sensors:` and `actions:`
   must not contain shell metacharacters: `|`, `&&`, `||`, `;`, `$()`, backtick substitution,
   or redirects (`>`, `<`, `>>`). Each command must be a single, self-contained invocation
   (e.g. `tsc --noEmit`). Reject any harness.yaml where these patterns appear and inform
   the user — never execute a sensor command containing them.

   Defaults by stack (sensors — core):
   - TypeScript: `tsc --noEmit`, `npm run lint`, `npm test`
   - Rust: `cargo check`, `cargo clippy -- -D warnings`, `cargo test`
   - Python: `mypy .`, `ruff check .`, `pytest`
   - Go: `go vet ./...`, `golangci-lint run`, `go test ./...`

   Defaults by stack (sensors — security):
   - TypeScript: `npm audit --audit-level=moderate`, `npm audit signatures` (registry signature verification — npm 8.14+)
   - Rust: `cargo audit`, `cargo deny check advisories` (supply chain + license policies; requires `deny.toml`)
   - Python: `pip-audit`, `bandit -r . -c pyproject.toml`, `pip check` (installed dependency consistency)
   - Go: `govulncheck ./...`, `go mod verify` (module checksum verification against sum database)
   - All stacks: `npx secretlint '**/*'` (secret scanning)

   **Supply chain note:** `npm audit` / `cargo audit` / `pip-audit` only catch *known* CVEs.
   They will NOT catch a hijacked package whose malicious version was published before an advisory
   was filed (e.g. account-compromise attacks). The registry signature sensors (`npm audit signatures`,
   `go mod verify`) add a second layer by verifying cryptographic provenance of downloaded packages.
   For high-risk projects (crypto, finance, auth), also consider `socket check --ci` (Socket.dev)
   which detects new-maintainer changes, obfuscated code, and install-script additions at PR time.

   Defaults (evaluator):
   - `enabled: true` unless user explicitly disables
   - `timing: per_sprint` for Large/Complex, `end_of_run` for Medium
   - `min_score: 85` (global threshold — average of all criteria must meet this)
   - `live_test: false` unless the project has a running server (Express, FastAPI, etc.)
   - `live_test_timeout: 30` — kill the process after 30 s regardless of outcome; never leave it running
   - `criteria` thresholds start at 75-90; tighten after first successful feature run
   - `security: 85` — catches injection, XSS, hardcoded secrets, unpinned deps
   - `resilience: 75` — checks error handling, timeouts, retries, graceful degradation

   Defaults (actions) — only populated when evidence is found in the repo
   (Dockerfile, docker-compose.yaml, prisma/ dir, fly.toml, etc.). Never invent.

   **Auto-mode reference templates** — for users who plan to run `adp auto-mode`
   (the maximum-autonomy variant), a more complete harness lives at
   `templates/harness/auto-mode-<stack>.yaml`. These add runtime sensors
   (`deps_check`, `smoke`, `e2e`, `build`) using stack-native patterns:

   - **TypeScript:** `templates/harness/auto-mode-typescript.yaml` — uses
     `start-server-and-test` (single command, no shell metachars) to spawn
     the dev server, probe `http://localhost:PORT`, run Playwright, and tear
     down. Substitute PM prefixes per the lockfile (`pnpm` is the template default).
   - **Python:** `templates/harness/auto-mode-python.yaml` — uses pytest with
     FastAPI's `TestClient` (or pytest-xprocess for real servers) so smoke
     and e2e are just `pytest tests/smoke` and `pytest tests/e2e`. Defaults
     to `uv`; swap `uv run` for `poetry run` / `pipenv run` / no prefix as
     appropriate.
   - **Rust:** `templates/harness/auto-mode-rust.yaml` — uses a
     `cargo test --test smoke` integration test that spawns the server in a
     tokio task on a random port and probes it. No external wrapper needed.
   - **Go:** `templates/harness/auto-mode-go.yaml` — uses `httptest.NewServer`
     inside a Go test for smoke. `go test ./internal/smoke` is the whole probe.

   When generating `harness.yaml` during `adp init`, ask the user: *"Run
   auto-mode-style harness (runtime + e2e sensors included) or minimal
   harness (typecheck + lint + test only)?"* Default to minimal unless they
   explicitly opt in. Auto-mode harnesses require additional tooling that
   `adp auto-mode` will provision lazily at first invocation.

5. **Initialize `state.json`:**

```json
{
  "status": "idle",
  "phase": null,
  "feature": null,
  "branch": null,
  "complexity": null,
  "sprints": [],
  "activity": [],
  "startedAt": null,
  "blockers": []
}
```

6. **Seed `STATE.md`** as empty scaffold (see [State Management](#state-management)).

7. **Add ADP paths to the global `.gitignore`** so they stay local across all projects
   without polluting any project's tracked `.gitignore`.

   **Locate the global gitignore file:**
   ```bash
   git config --global core.excludesFile
   ```
   If that returns a path, use it. Otherwise default to `~/.gitignore`
   (Windows: `C:\Users\<user>\.gitignore`).

   If the file does not exist, create it. Append (deduplicate first) a managed block:

   ```gitignore
   # ADP — local pipeline state, feature specs, and skill artifacts (do not commit)
   .adp/
   .specs/
   .claude/skills/adp/
   ```

   If the global gitignore file has no `core.excludesFile` entry yet, register it:
   ```bash
   git config --global core.excludesFile ~/.gitignore
   ```
   (Use the actual resolved path, not `~`, so git picks it up on all platforms.)

   Rationale: `.adp/state.json`, sprint contracts, evaluator scratch, and generated
   feedforward guides are local working memory — they're noisy in PRs and may contain
   ephemeral commit references that don't survive squash/rebase. The `.specs/` tree
   holds the user's draft spec/design/tasks per feature, also local. Using the global
   gitignore keeps per-project `.gitignore` files clean and avoids committing ADP's
   internal paths to shared repos. The `.claude/skills/adp/` line covers the case
   where ADP is installed per-project rather than globally — same reasoning applies.

   If those lines already exist in the global gitignore, do nothing.

8. **Bootstrap Notion memory pointer** so the dual-write protocol activates automatically
   for this project (see [Notion Memory Sync](#notion-memory-sync-dual-write-protocol)).

   **Derive the project slug:**
   - The current working directory maps to a Claude project slug.
   - On Windows the slug is derived from the absolute path by replacing `\` with `-` and
     dropping the leading separator: `C:\Users\User\Documents\Claude\my-proj` →
     `C--Users-User-Documents-Claude-my-proj`.
   - The memory directory is: `~/.claude/projects/<slug>/memory/`
     (on Windows: `C:\Users\User\.claude\projects\<slug>\memory\`)

   **Create the pointer file** at `<memory-dir>/reference_notion_memory.md` — but only
   if it does not already exist:

   ```markdown
   ---
   name: notion-memory-db
   description: "Notion \"ADP Memory\" database is the online memory store for cross-session facts"
   metadata:
     node_type: memory
     type: reference
   ---

   Notion page "Claude Code Memory": https://www.notion.so/361980a04837810f987ce2a865d61eec

   Database "ADP Memory" (data source ID: `2d1ac8c4-819a-4562-a57b-944dc613b18f`):
   https://www.notion.so/6638ba8a3a224e6fb3c9a3dd5c63c61f

   Schema: Name (Title), Type (user/feedback/project/reference), Project (text), Body (text), Why (text), How to apply (text), Created (auto), Last verified (date), Status (active/stale/superseded).

   **How to apply:** When adding a new memory, create a page in this database via
   `mcp__claude_ai_Notion__notion-create-pages` with
   `data_source_id: 2d1ac8c4-819a-4562-a57b-944dc613b18f` and `Project: "<slug>"`.
   When recalling or searching, use `notion-search` + `notion-fetch` (not `notion-query-database-view` — requires Business plan).
   Update `Last verified` via `notion-update-page` whenever a memory is confirmed accurate (see Notion Memory Sync section).
   Keep local `.md` files and Notion in sync — both should reflect the same set of memories.
   ```

   **Create or update `MEMORY.md`** in `<memory-dir>/` — ensure it contains the index
   entry for the pointer file. If `MEMORY.md` already exists and the entry is present,
   skip. Otherwise append:

   ```markdown
   - [notion-memory-db](reference_notion_memory.md) — Notion "ADP Memory" database for cross-session memory (project: <slug>)
   ```

   After writing the pointer file, also add a row to the Notion "ADP Memory" DB to
   record that this project is now tracked. Use `mcp__claude_ai_Notion__notion-create-pages`
   with `data_source_id: 2d1ac8c4-819a-4562-a57b-944dc613b18f` and these fields:
   - `Name`: `notion-memory-db`
   - `Type`: `reference`
   - `Project`: `<slug>`
   - `Body`: `ADP Memory Notion DB pointer bootstrapped by adp init`
   - `Status`: `active`

   If the Notion MCP is unavailable, skip silently — the local pointer file is enough
   to enable dual-write in future memory operations.

9. **Install the `commit-msg` git hook** to enforce commit conventions deterministically.

   Copy `templates/hooks/commit-msg` (from the ADP skill directory) to `.git/hooks/commit-msg`
   in the target project, then make it executable:

   ```bash
   cp <adp-skill-dir>/templates/hooks/commit-msg .git/hooks/commit-msg
   chmod +x .git/hooks/commit-msg
   ```

   On Windows with Git for Windows / MINGW, `chmod +x` is not needed — git reads the executable
   bit from the file header. The hook is a POSIX sh script that runs in Git Bash automatically.

   If `.git/hooks/commit-msg` already exists and is not the ADP hook (check for the
   `# Enforces ADP commit convention` header), skip without overwriting — inform the user
   they have a custom hook and should merge the ADP rules into it manually.

   The hook enforces:
   - No `[ADP-TASK-NN]` / `[ADP-QUICK-NNN]` trailers
   - Subject must match `<type>(<scope>): <summary>` (Conventional Commits)
   - No body paragraph (subject-line only)

10. **Immediately run `adp map`** to generate guides.

---

## adp mobile init

Mobile-specific initialization for iOS, Android, Flutter, and React Native projects.

1. **Detect mobile platform** by reading project files:
   - **iOS**: `Package.swift`, `Project.swift` (Tuist), `*.xcodeproj`, `Info.plist`
   - **Android**: `build.gradle.kts`, `build.gradle`, `AndroidManifest.xml`
   - **Flutter**: `pubspec.yaml`
   - **React Native**: `package.json` with React Native dependencies

2. **Create `.adp/` structure** (mobile-specific):

```
.adp/
├── state.json        # Pipeline runtime state with platform field
├── harness.yaml      # Mobile sensor configuration
└── guides/
    └── mobile/       # Platform-specific guides
        ├── mobile-stack.md
        ├── ios-architecture.md OR android-architecture.md
        ├── ios-conventions.md OR android-conventions.md
        ├── ios-testing.md OR android-testing.md
        ├── ios-integrations.md OR android-integrations.md
        ├── ios-concerns.md OR android-concerns.md
        └── ios-security.md OR android-security.md
```

3. **Generate `harness.yaml`** with mobile sensors:

**iOS sensors:**
```yaml
sensors:
  compile:   tuist build --target {APP_NAME}
  swiftlint: swiftlint lint --strict
  test:      tuist test --test-targets {TEST_TARGETS}
  metal:     python Scripts/validate_metal.py  # if Metal shaders present
  snapshot:  fastlane snapshot                  # optional
```

**Android sensors:**
```yaml
sensors:
  compile:    ./gradlew assembleDebug
  detekt:    ./gradlew detekt
  test:       ./gradlew test
  android_test: ./gradlew connectedAndroidTest
  lint:       ./gradlew lint
```

**Flutter sensors:**
```yaml
sensors:
  analyze:    flutter analyze
  test:       flutter test
  build:      flutter build apk
  ios_build:  flutter build ios
```

**React Native sensors:**
```yaml
sensors:
  compile:     npm run android
  ios_compile: npm run ios
  test:        npm test
  lint:        npm run lint
```

4. **Initialize mobile `state.json`:**

```json
{
  "status": "idle",
  "phase": null,
  "feature": null,
  "complexity": null,
  "platform": "ios",  // or "android", "flutter", "react-native"
  "sprints": [],
  "activity": [],
  "startedAt": null,
  "blockers": []
}
```

5. **Generate platform-specific guides** (8 mobile guides):
   - `mobile-stack.md` — Platform detection, frameworks, build tools
   - `ios-architecture.md` OR `android-architecture.md` — Module layout, patterns
   - `ios-conventions.md` OR `android-conventions.md` — Naming, patterns, error handling
   - `ios-testing.md` OR `android-testing.md` — Test framework, patterns
   - `ios-integrations.md` OR `android-integrations.md` — External services, APIs
   - `ios-concerns.md` OR `android-concerns.md` — Tech debt, hotspots, risks
   - `ios-security.md` OR `android-security.md` — Secrets, storage, permissions

6. **Add ADP mobile paths to `.gitignore`:**

```gitignore
# ADP Mobile — local pipeline state, feature specs, and skill artifacts (do not commit)
.adp/
.specs/
.claude/skills/adp/
```

7. **Create mobile workflow templates** (4 templates):
   - `mobile-feature.md` — Multi-screen feature with navigation
   - `mobile-screen.md` — Single screen implementation
   - `mobile-animation.md` — Animation/transition work
   - `mobile-platform-integration.md` — Platform APIs (camera, location, etc.)

8. **Immediately run `adp mobile map`** to populate guides from actual codebase.

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
- **Supply chain posture:** Is `npm audit signatures` / `go mod verify` / `cargo deny` in the sensor suite?
  Are all `npm install` calls using `--ignore-scripts`? Is the lockfile committed and does CI use `npm ci`?
  Any deps installed from a URL or git ref instead of the official registry?
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

## adp mobile map

Mobile-specific codebase analysis that generates platform-specific guides from an existing mobile codebase.

**Read mobile project files to extract actual patterns:**

### iOS Project Files
- Package manifest (`Package.swift`) and Tuist config (`Project.swift`)
- Xcode project structure (`*.xcodeproj`, `*.xcworkspace`)
- Swift source files (`Source/**/*.swift`)
- Test files (`**/*Test*.swift`, `**/*Tests.swift`)
- Info.plist for app configuration

### Android Project Files
- Gradle build files (`build.gradle.kts`, `settings.gradle.kts`)
- Android manifest (`AndroidManifest.xml`)
- Kotlin source files (`app/src/main/**/*.kt`)
- Test files (`app/src/test/**/*.kt`, `app/src/androidTest/**/*.kt`)
- ProGuard/R8 configuration

### Flutter Project Files
- Package manifest (`pubspec.yaml`)
- Dart source files (`lib/**/*.dart`)
- Test files (`test/**/*_test.dart`)
- Platform-specific files (`ios/`, `android/`)

### React Native Project Files
- Package manifest (`package.json`)
- JavaScript/TypeScript source files (`src/**/*.{js,ts,tsx}`)
- Native module files (`ios/`, `android/`)
- Test files (`**/*.test.{js,ts}`)

**Write platform-specific guides** (8 mobile guides):

### `.adp/guides/mobile/mobile-stack.md`
- Platform detection (iOS/Android/Flutter/React Native)
- Language version (Swift, Kotlin, Dart, JS/TS)
- Frameworks and their roles (SwiftUI, UIKit, Jetpack Compose, etc.)
- Build tool, package manager (Tuist, Gradle, Flutter CLI, npm)
- CI commands (from workflow files)
- Key dependencies and their versions

### `.adp/guides/mobile/ios-architecture.md` OR `android-architecture.md`
- Module layout and responsibilities (features, screens, components)
- Dependency direction (which modules import which)
- Data flow (state management, repositories, networking)
- Public API surface per module
- Navigation patterns (NavigationStack, Activity/Fragment, Navigator)

### `.adp/guides/mobile/ios-conventions.md` OR `android-conventions.md`
- Naming patterns (camelCase, PascalCase, snake_case — what's actually used)
- File naming (kebab-case? PascalCase? Match existing)
- Import ordering (framework, project, third-party)
- Error handling patterns (Result types, exceptions, nil-safety)
- State management patterns (ViewModel, StateFlow, LiveData)
- Export style (public, internal, private)
- Include `file:line` references for each observation

### `.adp/guides/mobile/ios-testing.md` OR `android-testing.md`
- Test framework and assertion style (XCTest, JUnit, Jest)
- Test file location (co-located or separate)
- Mocking/stubbing patterns (dependency injection, fakes)
- UI testing approach (XCUITest, Espresso, React Native Testing)
- What gets tested and what doesn't
- Performance testing strategies

### `.adp/guides/mobile/ios-integrations.md` OR `android-integrations.md`
- External services, APIs, SDKs in use
- Firebase services (Auth, Analytics, Crashlytics, Messaging)
- Platform SDKs (Google Play Services, Apple frameworks)
- Auth/credential mechanisms (Keychain, Keystore, OAuth)
- Rate limits, retry patterns observed
- Mock/stub strategies for integration tests

### `.adp/guides/mobile/ios-concerns.md` OR `android-concerns.md`
- Tech debt hotspots, fragile modules
- Known bugs, TODOs, FIXMEs with `file:line`
- Performance hot paths (main thread blocking, memory leaks)
- Risk areas to treat carefully
- Platform-specific issues (ANRs, background app limits)

### `.adp/guides/mobile/ios-security.md` OR `android-security.md`
- **Dependency health:** Pinned versions in lock file, known vulnerabilities
- **Secret handling:** Keychain (iOS), Keystore (Android), env vars, hardcoded secrets
- **Input validation:** Where user input enters the system, sanitization at boundaries
- **Auth & authz patterns:** Biometric auth, OAuth, session management, token handling
- **OWASP mobile:** Insecure storage, hardcoded keys, insecure communication, root detection
- **Platform security:** Code signing (iOS), ProGuard (Android), app transport security
- **N+1 / performance risks:** DB queries in loops, unbounded list fetches
- **Memory issues:** Leaks, retain cycles, large allocations, bitmap handling

**Mobile guide rules:**
- Specific to THIS mobile codebase. Not generic advice.
- Include `file:line` references as evidence.
- Concise — optimized for token budget.
- Descriptive (what IS) not prescriptive (what SHOULD BE).

---

## adp run [feature]

Execute the full pipeline for a feature. This is the core loop.

**Autonomous execution contract:** Once `adp run` is invoked, ADP owns the
pipeline. It executes every sprint in order without stopping. It does not
produce prose, recaps, or progress narration. The only permitted outputs are
the sprint status lines and the final summary table. The user has pre-approved
the full run. ADP halts only when the formal blocker protocol is triggered
(see CRITICAL RULES → Blocker report format).

**The three halt conditions:**
1. A sensor fails 3 times on the same task with the same error
2. A gated action is denied by the user
3. A git conflict cannot be auto-resolved

Nothing else stops the pipeline mid-run.

### Step 0: Load State + Project Context

1. Read `.adp/state.json` AND `.specs/project/STATE.md` (if present).
   If resuming (`status: "running"` or `"paused"`), skip to the stopped task.
2. **Auto-generate PROJECT.md** if `.specs/project/PROJECT.md` does not exist
   (see [Project-Level Spec](#project-level-spec-auto-generation)).
3. Load PROJECT.md into context — it informs SPECIFY and reduces clarification needs.
4. **Feature branch** — All work happens on a dedicated branch, never directly on main:
   - Derive slug: lowercase, hyphens only — e.g. `feat/user-auth`, `feat/live-agents`
   - If `state.json → branch` exists (resuming), check it out: `git checkout {branch}`
   - Otherwise create it from current HEAD: `git checkout -b feat/{feature-slug}`
   - Record in `state.json → branch: "feat/{feature-slug}"`

### Step 1: Auto-Size Complexity

Assess the feature scope:

| Scope | Criteria | Phases |
|-------|----------|--------|
| **Small** | ≤3 files, ≤1h, no new deps, no design decisions | Quick mode (see below) |
| **Medium** | Clear feature, <10 tasks | Specify → Execute |
| **Large** | Multi-component, 10+ tasks | Specify → Design → Tasks → Execute |
| **Complex** | Ambiguous, new domain | All + gray-area discussion + UAT |

### Step 2: SPECIFY

**Load guides:** `conventions.md`, `architecture.md`, `PROJECT.md`

**Clarification gate — critical-only (default `autonomy.clarify: critical`):**

Before writing spec, scan the feature request for ambiguity. For each gray area,
apply this decision tree in order:

1. **Is the answer in the codebase?** (existing patterns, file names, function signatures)
   → Resolve from code. Log the decision to `context.md`. Do NOT ask.

2. **Is the answer in project docs?** (PROJECT.md, README, guides, ROADMAP)
   → Resolve from docs. Log the decision to `context.md`. Do NOT ask.

3. **Does a best-practice / industry-standard answer exist?**
   → Apply it. Log the decision to `context.md`. Do NOT ask.

4. **Would a wrong assumption cause the ENTIRE feature to be built incorrectly?**
   (e.g. wrong data model, wrong auth strategy, wrong API contract)
   → Ask exactly ONE question. Phrase it as a concrete choice:
   "A or B: [description A] vs [description B]?"
   Wait for the answer. Record it in `context.md`.

5. **Is it a secondary detail that can be revisited?**
   → Make a reasonable default choice. Log it to `context.md`. Do NOT ask.

**Maximum one question per run.** If you find multiple critical ambiguities,
pick the most blocking one and make autonomous decisions for the rest.

If `autonomy.clarify: never`, skip step 4 — always resolve autonomously.
If `autonomy.clarify: always`, ask a question for every gray area found.

If context.md would be empty (no logged decisions), do not create it.

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

**Design input — Claude Design handoff (optional):**

If the user provides a Claude Design handoff (prototype export from claude.ai):
1. Run `DesignLoader.parseHandoff(content)` to extract tokens + component structure.
2. Save the bundle: `.specs/features/{feature}/design-bundle/bundle.json`
3. The prototype becomes the **source of truth** for component structure, layout, and styling.
4. `design.md` references the bundle instead of inventing a component architecture.

If no handoff exists, extract design context from the project:
1. Run `DesignExtractor.extract()` — reads Tailwind config, CSS variables, shadcn config,
   and scans component directories for existing components.
2. Optionally save: `adp design extract {feature}` to persist the bundle.
3. Use extracted tokens and component inventory to inform design decisions.

**Action:** Create `.specs/features/{feature}/design.md` with:
- Component architecture (how new modules fit existing layout)
- Data flow + sequence for key REQs
- Interface contracts (function signatures, endpoint shapes)
- Reuse map — existing code referenced, at `file:line`
- How it maps to existing patterns from guides
- **If design bundle exists:** reference extracted tokens (colors, spacing, typography)
  and map new components to existing component inventory

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
- [ ] **Commit:** `feat(tasks): add POST /tasks endpoint`

## TASK-02: {summary}
- [ ] **Requirement:** REQ-01.2
- [ ] **Files:** src/routes/tasks.ts
- [ ] **Reuses:** —
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** — (edits same file as TASK-01 follow-ups)
- [ ] **Done when:** {verification criteria}
- [ ] **Test:** {what test to write/verify}
- [ ] **Commit:** `feat(tasks): validate quantity`
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

**Pre-flight: DAG validation.** Before sprint 1 starts, run `adp validate <feature>`.
This parses `tasks.md`, checks for unresolved `Depends:` references and cycles, and
computes parallel-eligible layers. If validation fails, halt and surface the errors —
do not proceed with a broken DAG. The layer output also tells you which `[P]`-marked
tasks may run concurrently in worktrees (see [Worktree Parallelism](#worktree-parallelism)).

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
   - Commit atomically using **Conventional Commits 1.0.0**:
     ```
     feat(scope): short summary of what changed
     ```
     **Subject line only — no body.** The `commit-msg` hook enforces this. If you feel
     the need to explain more, that explanation belongs in the PR description or
     `.specs/features/{feature}/spec.md`, not in git history.
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

Output the final summary table — no prose, no narrative:

```
ADP Complete: {feature}
══════════════════════════════════════════════════════
 #   Task                       Score   REQs          Commit
 1   TASK-01 Setup              90/100  REQ-01        abc123f
 2   TASK-02 JWT parsing        88/100  REQ-02        def456g
 3   TASK-03 Token validation   91/100  REQ-02.1      789abcd
──────────────────────────────────────────────────────
 Avg score: 89/100   REQ coverage: 3/3 ✓   Sensors: all ✓

Specs: .specs/features/{feature}/
Branch: feat/{feature-slug}
```

**Then push + open PR/MR (Gated — ask once):**

Always write a real review description to the hosting service. Do not open a
GitHub PR or GitLab MR with an empty body, `--fill` only, or a placeholder.
The description must cover the full branch diff in short prose:

- What changed and the user/developer impact.
- Why it changed, or the root cause when this is a fix.
- Docs, tests, and validation performed.
- Any manual review steps or residual risks.

Use the provider available in the project:
- GitHub: `gh pr create --body-file <file>` or `--body "<markdown>"`.
- GitLab: `glab mr create --description-file <file>` or equivalent API field.

PR/MR body style:

```markdown
Adds `adp feature <request>` so the CLI can slug a request, create or check out
`feat/<slug>`, seed `.specs/features/<slug>/spec.md`, and move state into Specify.

It records the active branch in pipeline state/status output and exports the new
feature helpers for library consumers.

Docs now list the command, and tests cover slugging, branch reuse, spec
preservation, and state updates.

Validation: `npm run typecheck`, `npm run lint`, `npm test`.
```

```bash
git push -u origin feat/{feature-slug}
gh pr create \
  --title "{feature}: {one-line summary of what was built}" \
  --body-file .specs/features/{feature}/pr-body.md
```

Log the PR/MR URL to `state.json → activity[]` as `type: "pr_opened"`.

That is the entire output. No "I hope this helps." No "Let me know if you have questions."

---

## adp mobile run [feature]

Mobile-specific pipeline execution for iOS, Android, Flutter, and React Native projects. Follows the same phases as standard ADP but with mobile-specific sensors, evaluator criteria, and implementation patterns.

**Platform detection:** The command automatically detects the mobile platform from the `.adp/state.json → platform` field set during `adp mobile init`.

### Step 0: Load Mobile Context

1. Read `.adp/state.json` with platform context (`platform: "ios" | "android" | "flutter" | "react-native"`)
2. Auto-generate `.specs/project/PROJECT.md` for mobile (see [Project-Level Spec Auto-Generation](#project-level-spec-auto-generation))
3. Load mobile guides (`.adp/guides/mobile/`) — platform-specific architecture, conventions, testing
4. Create mobile feature branch: `feat/mobile-{feature-slug}`
5. Record platform in `state.json → platform`

### Step 1: Auto-Size Mobile Complexity

| Scope | Criteria | Phases |
|-------|----------|--------|
| **Small** | Single screen, ≤3 files, no new libs, standard UI | Quick mode |
| **Medium** | Multi-screen feature, <8 tasks, standard navigation | Specify → Execute |
| **Large** | New feature module, 8+ tasks, custom animations | All phases |
| **Complex** | Platform integrations, custom shaders, complex state | All + platform testing |

### Step 2: SPECIFY (Mobile Requirements)

**Load mobile guides:** `mobile-conventions.md`, `ios-architecture.md` OR `android-architecture.md`, `PROJECT.md`

**Mobile REQ patterns:**

```markdown
### ⭐ REQ-01: {Feature} main screen [MVP]
**User Story:** As a user, I want to view {feature content}, so that I can {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN screen loads THEN show loading state |
| REQ-01.2 | WHEN data loads successfully THEN display {content} |
| REQ-01.3 | WHEN user taps {item} THEN navigate to detail |
| REQ-01.4 | WHEN network fails THEN show error with retry |
| REQ-01.5 | WHEN user pulls to refresh THEN reload data |
| REQ-01.6 | WHEN device rotates THEN layout adapts |
| REQ-01.7 | WHEN Reduce Motion enabled THEN skip animations |
```

### Step 3: DESIGN (Mobile Architecture)

**Load mobile guides:** `ios-architecture.md` OR `android-architecture.md`, `mobile-integrations.md`

**Mobile architecture patterns:**

**iOS Architecture:**
- Feature-based structure (three-file pattern for TCA, MVVM for SwiftUI)
- SwiftUI/UIKit integration patterns
- Navigation patterns (NavigationStack, custom transitions)
- Platform-specific UI components

**Android Architecture:**
- MVVM architecture with ViewModels
- Jetpack Compose UI patterns
- StateFlow/Flow for reactive state
- Material Design 3 components

**Cross-Platform:**
- Framework-specific architecture (Flutter widgets, React Native components)
- Platform abstraction layers
- Shared business logic

### Step 4: TASKS (Mobile Implementation)

**Mobile task patterns:**

```markdown
## TASK-01: {Feature} screen scaffold
- [ ] **Requirement:** REQ-01
- [ ] **Files:** app/src/main/java/com/app/features/{Feature}Activity.kt
- [ ] **UI Pattern:** Jetpack Compose with Material 3
- [ ] **Done when:** Screen renders with loading state
- [ ] **Test:** UI test verifies screen elements

## TASK-02: {Feature} state management
- [ ] **Requirement:** REQ-02
- [ ] **Files:** {Feature}ViewModel.kt, {Feature}State.kt
- [ ] **State Pattern:** StateFlow for UI state, sealed class for states
- [ ] **Done when:** State updates trigger UI re-composition
- [ ] **Test:** Unit test verifies state transitions
```

### Step 5: EXECUTE (Mobile Sprint Mode)

**Mobile sensors** (from `.adp/harness.yaml`):

**iOS sensors:**
- `compile: tuist build --target {APP_NAME}`
- `swiftlint: swiftlint lint --strict`
- `test: tuist test --test-targets {TEST_TARGETS}`
- `metal: python Scripts/validate_metal.py` (if shaders present)
- `snapshot: fastlane snapshot` (optional)

**Android sensors:**
- `compile: ./gradlew assembleDebug`
- `detekt: ./gradlew detekt`
- `test: ./gradlew test`
- `android_test: ./gradlew connectedAndroidTest`
- `lint: ./gradlew lint`

**Flutter sensors:**
- `analyze: flutter analyze`
- `test: flutter test`
- `build: flutter build apk`
- `ios_build: flutter build ios`

**React Native sensors:**
- `compile: npm run android`
- `ios_compile: npm run ios`
- `test: npm test`
- `lint: npm run lint`

**Mobile evaluator criteria:**

```yaml
evaluator:
  enabled: true
  timing: per_sprint
  criteria:
    correctness: 90      # Feature works as specified
    completeness: 85    # All acceptance criteria met
    code_quality: 85    # Clean code, follows platform conventions
    test_coverage: 90   # Unit + UI tests
    mobile_ui: 88       # Platform UI patterns, navigation, lifecycle
    performance: 82     # 60fps animations, no main thread blocking
    security: 85        # No secrets, secure storage
    accessibility: 80   # Dynamic Type, Reduce Motion, screen readers
```

**Mobile sprint contract example:**

```markdown
# Sprint 2: TASK-02 {Feature} state management

## What I'll build
ViewModel with StateFlow for {feature} screen, sealed class state pattern

## Files to touch
- `app/src/main/java/com/app/features/{feature}/{Feature}ViewModel.kt` — new
- `app/src/main/java/com/app/features/{feature}/{Feature}State.kt` — new
- `app/src/main/java/com/app/features/{feature}/{Feature}Screen.kt` — modify

## State Pattern
- Loading, Success, Error sealed classes
- StateFlow<State> for UI observation
- CoroutineScope for async operations

## Acceptance criteria
- [ ] WHEN ViewModel initializes THEN state is Loading
- [ ] WHEN data loads successfully THEN state is Success(data)
- [ ] WHEN network fails THEN state is Error(message)
- [ ] WHEN screen rotates THEN state is preserved
- [ ] WHEN user navigates away THEN coroutines cancel

## Verification
- Sensor: compile passes (./gradlew assembleDebug)
- Sensor: detekt passes (no warnings)
- Sensor: test passes (unit tests for state transitions)
- Manual: Test on device with rotation and network off

## Requirements traced
REQ-02.1, REQ-02.2, REQ-02.3
```

### Step 6: VALIDATE (Feature-Level UAT)

After all tasks `done`:

1. **Score safety net** — Check `state.json` for unscored sprints
2. **Requirement coverage check** — All REQs have passing tasks
3. **Full mobile sensor suite** — Run all platform sensors end-to-end
4. **Mobile evaluator final pass** — Full feature evaluation with mobile criteria
5. **Mobile-specific checks:**
   - **iOS:** 60fps animations, no memory leaks, VoiceOver support
   - **Android:** No ANRs, battery optimization, TalkBack support
   - **Cross-platform:** Performance on both platforms, accessibility
6. Update state: `status: "idle"`, `phase: null`

### Step 7: Complete

Output the mobile-specific final summary table:

```
ADP Mobile Complete: {feature} ({platform})
══════════════════════════════════════════════════════
 #   Task                       Score   REQs          Commit
 1   TASK-01 Screen setup       90/100  REQ-01        abc123f
 2   TASK-02 State management   88/100  REQ-02        def456g
 3   TASK-03 Navigation        91/100  REQ-03        789abcd
──────────────────────────────────────────────────────
 Avg score: 89/100   REQ coverage: 3/3 ✓   Sensors: all ✓

Platform: {platform} | Mobile UI: ✓ | Performance: ✓ | Accessibility: ✓

Specs: .specs/features/{feature}/
Branch: feat/mobile-{feature-slug}
```

**Then push + open PR (Gated — ask once):**

```bash
git push -u origin feat/mobile-{feature-slug}
gh pr create \
  --title "{feature}: {one-line summary}" \
  --body "## Summary
- {bullet: what REQs were implemented}
- {bullet: platform-specific implementation details}

## Test plan
- Mobile sensors: compile ✓ lint ✓ test ✓
- Platform: {platform}
- Manual testing: {device-specific steps}"
```

---

---

## Project-Level Spec Auto-Generation

Triggered by: `adp run` Step 0, when `.specs/project/PROJECT.md` does not exist.

**Purpose:** Give every feature run a rich project context so that the clarification
gate can resolve more ambiguities autonomously and the spec is more informed.

**Read these sources:**
- `package.json` / `Cargo.toml` / `pyproject.toml` — name, description, version, scripts
- `README.md` — project overview and purpose
- `git remote -v` — repo origin (used for project URL in PROJECT.md)
- `.adp/guides/` — if guides exist, use stack/architecture summaries
- `CLAUDE.md` — any project-level instructions

**Write `.specs/project/PROJECT.md`:**

```markdown
# {project-name}

## Purpose
{one paragraph — what the project does and who it's for, from README/package.json description}

## Stack
- Language: {from package.json/Cargo.toml}
- Framework: {primary framework}
- Runtime: {node version / rust edition / python version}
- Key dependencies: {list top 5 from package.json/Cargo.toml}

## Dev Commands
- Build: {from scripts.build}
- Test: {from scripts.test}
- Lint: {from scripts.lint}
- Typecheck: {from scripts.typecheck}

## Architecture Summary
{2-3 sentences describing the major modules and data flow, from guides/architecture.md or file structure}

## Key Constraints
- {list any hard constraints found: rate limits, auth requirements, DB schema, API compatibility}

## Decisions Already Made
- {list any major tech decisions visible in code or docs: ORM choice, auth strategy, etc.}

## Repo
{git remote origin URL}
```

**Rules:**
- Only populate fields you can evidence from the files. Leave out blank sections.
- Do NOT invent constraints or decisions.
- Keep it under 80 lines — this is context injection, not documentation.
- Once created, PROJECT.md is **user-owned**: never overwrite it on subsequent runs.
  Only read it for context.

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
2. `git checkout -b feat/{slug}` (Free).
3. Implement.
4. Run sensors.
5. Commit: `fix(scope): summary` (or `feat`, `refactor`, etc.).
6. Write `.specs/quick/NNN-slug/SUMMARY.md` — one paragraph + commit SHA.
7. `git push -u origin feat/{slug}` + `gh pr create` (Gated — ask once).

Skip Specify/Design/Tasks phases entirely.

---

## Design-First Workflow (Claude Design → ADP)

Triggered by: `adp design run <feature>` or when a design bundle exists at pipeline start.

This is for the **prototype → production** workflow: design in Claude Design, then
ADP implements it. The design bundle drives the entire pipeline — components become
requirements, tokens become the style guide, the prototype is the source of truth.

### End-to-end flow

```
Claude Design (claude.ai)          ADP (Claude Code)
─────────────────────────          ──────────────────
1. Design UI prototype        ───→  2. adp design intake <feature>
   - Components, layout                 Parses handoff → bundle.json
   - Colors, typography                 Tokens + components extracted
   - Interactive states
                                    3. adp design run <feature>
                                       (or: adp run <feature> — auto-detects bundle)
                                       ┌────────────────────────────────┐
                                       │ SPECIFY (from design bundle)   │
                                       │  - Each component → REQ        │
                                       │  - Tokens → style constraints  │
                                       │  - Interactions → acceptance   │
                                       ├────────────────────────────────┤
                                       │ DESIGN (bundle is the design)  │
                                       │  - Map components to project   │
                                       │  - Identify reusable pieces    │
                                       │  - Define file locations       │
                                       ├────────────────────────────────┤
                                       │ TASKS (per component)          │
                                       │  - 1 task per component/route  │
                                       │  - Shared tokens task first    │
                                       │  - Tests per component         │
                                       ├────────────────────────────────┤
                                       │ EXECUTE (sprint per task)      │
                                       │  - Build matching prototype    │
                                       │  - Use extracted tokens        │
                                       │  - Sensors verify each sprint  │
                                       └────────────────────────────────┘
```

### Step-by-step

**1. Intake the handoff**

The user exports from Claude Design and provides the content. Parse it:

```
adp design intake <feature>
```

This creates `.specs/features/{feature}/design-bundle/bundle.json` with:
- `tokens` — colors, spacing, typography, radii from the prototype
- `components` — name, description, props, variants for each designed component
- `prototype` — the raw handoff content (HTML/React prototype code)

**2. Design-aware SPECIFY**

When a design bundle exists, the Specify phase generates requirements FROM the design:

```markdown
# {Feature Name}

## Complexity
Large — {N} components from Claude Design prototype

## Design Source
Claude Design handoff — {timestamp}
Tokens: {N} colors, {N} spacing, {N} typography
Components: {list}

## Requirements

### ⭐ REQ-01: Design tokens & shared styles [MVP]
**User Story:** As a developer, I want consistent design tokens so that all
components match the prototype.
| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN rendering any component THEN colors match design tokens |
| REQ-01.2 | WHEN rendering any component THEN typography matches design tokens |

### ⭐ REQ-02: {ComponentName} component [MVP]
**User Story:** As a user, I want {component purpose} so that {benefit}.
| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN {interaction} THEN {behavior from prototype} |
| REQ-02.2 | WHEN {state change} THEN {visual change from prototype} |

(one REQ per designed component)
```

**Key rules for design-first SPECIFY:**
- **Every design component gets a REQ.** No component left unspecified.
- **REQ-01 is always design tokens.** This is the foundation task.
- **Acceptance criteria come from the prototype.** Interactions, states, responsive behavior.
- **If the prototype has routes/pages**, each page gets a REQ.
- **Don't invent requirements** not in the design. The prototype is the scope.

**3. Design-aware TASKS**

Task generation follows the component dependency order:

```markdown
## TASK-01: Setup design tokens and shared styles
- [ ] **Requirement:** REQ-01
- [ ] **Files:** tailwind.config.ts, app/globals.css, lib/design-tokens.ts
- [ ] **Design tokens:** {colors from bundle}, {typography from bundle}
- [ ] **Done when:** tokens match bundle.json values

## TASK-02: {ComponentName} component
- [ ] **Requirement:** REQ-02
- [ ] **Files:** components/{path}/{ComponentName}.tsx, (test file)
- [ ] **Design ref:** bundle component "{name}" — {description}
- [ ] **Props:** {from bundle.components[].props}
- [ ] **Variants:** {from bundle.components[].variants}
- [ ] **Done when:** component renders matching prototype, props work
```

**Task ordering rules:**
1. Tokens/shared styles first (TASK-01 always)
2. Leaf components (no deps on other new components) next
3. Composite components (depend on leaf components) after
4. Pages/routes that compose components last
5. Mark independent components as `[P]` (parallel-eligible)

**4. Execute with design context**

During Execute, every sprint has access to:
- The design bundle tokens (injected via `ContextLoader.loadFullContext()`)
- The specific component spec from the bundle
- The prototype code (if available) as reference

**Sprint contracts reference the design:**
```markdown
# Sprint 2: TASK-02 LoginForm component

## Design reference
Component: LoginForm (from Claude Design handoff)
Props: onSubmit, error
Tokens: primary (#2563eb), destructive (#dc2626), radius (0.5rem)

## What I'll build
LoginForm component matching the prototype...
```

**5. Validation against design**

During VALIDATE, check:
- Every design component has a corresponding implemented component
- Design tokens are used (not hardcoded colors/spacing)
- Component props match the design bundle specification
- If prototype HTML exists, visual structure matches

### Auto-detection

When `adp run <feature>` starts and finds an existing design bundle at
`.specs/features/{feature}/design-bundle/bundle.json`, it automatically
enters design-first mode. No need for `adp design run` separately.

Also, during `adp run`, if the user says "I have a Claude Design prototype for this"
or provides handoff content, parse it with `DesignLoader.parseHandoff()` and save
the bundle before proceeding to Specify.

---

## adp auto-mode [feature]

Maximum-autonomy variant of `adp run`. Same pipeline, but optimised for
unattended execution inside an isolated worktree (Conductor, sandbox, CI).

**Use when:** the user wants the agent to take a feature request and return
a green PR with no interactive interruptions.

**Differences from `adp run`:**

| Concern | `adp run` | `adp auto-mode` |
|---|---|---|
| Clarification gate | `autonomy.clarify` from harness (default `critical`) | Force `clarify: never` for this invocation |
| Sensor set | `typecheck + lint + test` (+ whatever's in `order`) | Adds `deps_check`, `build`, `smoke`, `e2e` if available |
| Failed-sensor retry | Block after 3 identical failures | Up to 3 *adaptive* retries: re-evaluate the diff and try a different fix each time, then block |
| Evaluator below `min_score` | Block | Generate a fix-up sprint and retry once before blocking |
| Output | `output` from harness | Force `output: minimal` |
| Push / PR | Per harness `git.push` / `git.pr` | Same — both stay `gated`. The run ends with the prompt; the user clicks once |

### Step 0: Pre-flight

Before entering the run loop, detect the stack, verify the harness is
auto-mode-shaped, and provision missing tooling:

1. **Stack + package-manager detection** — read root files in this order. The
   *first* match wins (for polyglot repos, the root-level manifest is the
   driver; sub-package stacks are handled by the parent harness):

   | Detection file | Stack | PM selection signal | Reference template |
   |---|---|---|---|
   | `package.json` + `tsconfig.json` | **TypeScript** | `pnpm-lock.yaml` → pnpm; `package-lock.json` → npm; `yarn.lock` → yarn; `bun.lockb` → bun. `packageManager` field in `package.json` overrides lockfile. | `templates/harness/auto-mode-typescript.yaml` |
   | `pyproject.toml` / `requirements.txt` | **Python** | `uv.lock` → uv; `poetry.lock` → poetry; `Pipfile.lock` → pipenv; else pip | `templates/harness/auto-mode-python.yaml` |
   | `Cargo.toml` | **Rust** | cargo (canonical) | `templates/harness/auto-mode-rust.yaml` |
   | `go.mod` | **Go** | go (canonical) | `templates/harness/auto-mode-go.yaml` |

   Record the detected stack + PM in `state.json` under `stack` and `pm` so
   subsequent sprints don't re-run detection.

2. **Harness check** — read `.adp/harness.yaml`. If `order` is missing the
   runtime sensors (`deps_check`, `smoke`, plus `build`/`e2e` where applicable),
   offer to install the matching reference template from Step 1. If declined,
   run with the existing sensors and note the gap in the final summary.

3. **Rewrite command prefixes for the detected PM** — when loading the template,
   substitute the PM-specific prefix throughout (don't write four near-identical
   templates):

   | Stack | PM | Substitution |
   |---|---|---|
   | TS | npm   | `npm run <script>`, `npx <bin>` |
   | TS | pnpm  | `pnpm run <script>`, `pnpm exec <bin>` |
   | TS | yarn  | `yarn <script>`, `yarn run <bin>` |
   | TS | bun   | `bun run <script>`, `bunx <bin>` |
   | Py | uv    | `uv run <bin>` |
   | Py | poetry| `poetry run <bin>` |
   | Py | pipenv| `pipenv run <bin>` |
   | Py | pip   | `<bin>` (no prefix; assume venv active) |

4. **Tooling check** — confirm the stack's runtime sensors can actually run.
   If anything is missing, install it **once** as a Gated action (after install,
   never re-trigger `dep-required` blockers for the same package in this run):

   - **TypeScript:** `start-server-and-test` + `@playwright/test` in devDeps;
     `playwright install --with-deps chromium` already executed.
   - **Python:** `pytest`, `pytest-playwright`, `pytest-xprocess` in dev deps;
     `playwright install --with-deps chromium` executed.
   - **Rust:** `cargo-audit`, `cargo-deny` available on PATH; `deny.toml` at repo root.
   - **Go:** `golangci-lint`, `govulncheck` available on PATH.

5. **Port isolation** — if running inside a worktree numbered N (state.json
   `worktree_index` or derived from path), set `PORT = 3000 + N` (TS),
   `8000 + N` (Python), or the stack-default + N for Rust/Go in the sprint's
   process env so parallel sprints don't collide. Rewrite `smoke` and `e2e`
   URLs accordingly.

6. **Override autonomy for this run only** — do not write to harness.yaml;
   hold the overrides in memory: `clarify=never`, `output=minimal`. Restore on exit.

### Step 1: Execute the pipeline

Run the full `adp run` flow (Specify → Design → Tasks → Execute) with the
behavioral changes above. State management, sprint contracts, evaluator
scoring, commit cadence — all identical to `adp run`.

### Step 2: Adaptive retry policy

For each sensor failure, follow this loop instead of the standard 3-strikes rule:

```
attempt = 1
while attempt <= 3:
  diagnose:  read sensor output, diff since last attempt, last 20 lines of stderr
  hypothesize: pick ONE concrete cause (missing import, wrong env var,
               flaky timing, lint rule, type mismatch). Record in state.json
               under sprints[N].auto_mode.attempts[attempt].
  fix:       apply the targeted change. Do NOT shotgun-edit multiple files
             unless the diagnosis explicitly requires it.
  re-run:    re-run only the failing sensor first. If it passes, re-run the
             full order to catch regressions.
  if pass: break
  attempt += 1
if attempt > 3:
  emit ⛔ BLOCKER (Type: sensor-fail) with all three attempts attached
```

The same shape applies to evaluator score < `min_score`: one fix-up sprint
that targets the lowest-scoring criterion, then block if still below.

### Step 3: End of run

When all sprints are done and sensors green:

1. Update `state.json` → `status: "completed"`.
2. **Gated push** — surface a single prompt: *"Push `feat/{slug}` to origin?"*
3. **Gated PR** — on push approval, surface: *"Open PR with this title/body?"*
   (Title from the feature slug, body assembled from spec.md + sprint scores +
   evaluator notes — see PR template logic in `adp run` Step 5.)
4. Emit the final summary table (sprints × scores) and exit cleanly.

### Halt conditions (same as `adp run`, with adaptive retry baked in)

1. A sensor fails 3 *adaptive* attempts on the same task with diverging causes ruled out.
2. A gated action is denied by the user.
3. A git conflict cannot be auto-resolved.
4. The evaluator scores below `min_score` after one fix-up sprint.

Anything else: keep going.

### What auto-mode does NOT do

- It does not bypass the commit-msg hook (subject-line still enforced).
- It does not force-push, rebase published commits, or merge the PR. Merging is always a human action.
- It does not flip `auto_approve` on actions that ship as `always_ask` (e.g. `migrate_deploy`, deploys).
- It does not skip the evaluator. If `evaluator.enabled: false`, refuse to enter auto-mode and tell the user to enable it first — autonomy without a quality gate is just fast wrong code.

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
  15:18  ● feat(auth): add JWT parsing
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
   a. Identify the commit (from `sprint.commit` in `state.json`)
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
**Branch:** feat/{feature-slug}
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
3. Commit any clean in-progress work as `wip(scope): checkpoint` if safe.

## adp resume

1. Read `.specs/HANDOFF.md` + `.adp/state.json`.
2. Run `adp verify` to confirm nothing drifted.
3. **Re-verify sensor state** — for any sprint marked `status: "done"` in `state.json`,
   re-run the sensor suite against the current working tree before trusting its recorded
   score. If sensors now fail, treat the sprint as incomplete and fix before continuing.
4. Re-read the in-progress task's files and guides.
5. Continue from "Next Session" instructions.
6. Do NOT restart from Specify.

---

## adp update

Re-runs the installer, pulling from the **latest published GitHub release** (not
`main` branch) so the skill and CLI always land on a tagged, tested version.

**Auto-detect platform and run the appropriate installer:**

On **Windows** (PowerShell):
```powershell
$env:ADP_FORCE = "1"
iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.ps1 | iex
```

On **macOS / Linux** (bash):
```bash
ADP_FORCE=1 curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
```

**With `--branch X`** — install from a specific branch instead of the latest release:
```bash
ADP_BRANCH=feat/my-feature ADP_FORCE=1 curl -fsSL \
  https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
```

**How to detect platform:**
- Check `process.platform` or `$env:OS` — `win32` or `Windows_NT` → PowerShell path
- Otherwise → bash path
- Use Bash tool for bash, PowerShell tool for PowerShell

**After update:**
- Verify installed version matches the latest release: `adp --version` (if CLI is installed)
- The skill file at `~/.claude/skills/adp/SKILL.md` will contain the updated methodology

---

## adp uninstall

Remove ADP completely: skill files, npm CLI, and standalone binary.

```
adp uninstall [-y]   # -y skips confirmation prompt
```

**Steps:**
1. **Confirm** (unless `-y`) — ask the user once: "Remove ADP skill, CLI, and all
   pipeline artifacts? [y/N]". If N, abort.
2. **Remove skill directory:** `~/.claude/skills/adp/`
   - Windows: `$env:USERPROFILE\.claude\skills\adp\`
   - macOS/Linux: `~/.claude/skills/adp/`
3. **Remove npm global package:** `npm uninstall -g adp`
4. **Remove standalone binary** (if present): look for `adp` or `adp.exe` in common
   locations (`~/.local/bin/`, `~/bin/`, `C:\Users\<user>\AppData\Local\Programs\`)
5. **Revert global gitignore config** — if `adp init` set `core.excludesFile` and the
   current value points to the ADP-managed file (`~/.gitignore` or the path ADP wrote),
   unset it: `git config --global --unset core.excludesFile`.
   Do NOT unset if the user had an existing `core.excludesFile` that predates ADP
   (check by reading the file for the ADP-managed comment block before unsetting).
6. **Do NOT remove** `.adp/` or `.specs/` in target projects — those are user data.
   Inform the user they can delete those per-project if desired.

**Output:**
```
✓ Skill removed: ~/.claude/skills/adp/
✓ npm global package uninstalled
✓ Global gitignore config reverted (or: already set by user — left intact)
✓ ADP removed. Per-project .adp/ and .specs/ dirs are left intact.
```

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
{ "timestamp": "ISO", "type": "commit", "message": "feat(auth): add middleware skeleton" }
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

### Blocker Protocol

ADP halts and emits a structured blocker report in exactly **four cases**:

| Type | Condition |
|------|-----------|
| `sensor-fail` | Same sensor fails 3× on the same task with the same error |
| `gated-denied` | User denies a gated action |
| `git-conflict` | Merge conflict that cannot be auto-resolved |
| `dep-required` | A Gated dep install was proposed and the user denied it |

**When triggered:**
1. Stop ALL work on the affected task
2. Log to `state.json → blockers[]` AND `STATE.md → Blockers`
3. Output the structured blocker report (format in CRITICAL RULES section) — nothing else
4. Wait for user input

**Dependency installation — follow this exact flow, never skip to blocker:**

When a missing package is detected during build:
1. Identify each package and whether it's a prod dep or devDep.
2. Propose a Gated install — ask once, clearly:
   - Runtime: `npm install --ignore-scripts <pkg>`
   - Dev: `npm install --ignore-scripts --save-dev <pkg>`
   - Do NOT chain with `&&` — issue each as a separate call.
3. **If approved** — run the install, then **run a post-install security check**
   before continuing:
   - Node: `npm audit --audit-level=high` + `npm audit signatures`
   - Rust: `cargo audit`
   - Python: `pip-audit`
   - Go: `go mod verify`
   If the post-install check fails with a high/critical finding, treat it as a
   `sensor-fail` (attempt 1 of 3). Do NOT commit the new dep until the audit passes.
4. **If denied** — ONLY NOW emit a `dep-required` blocker.

Do not emit `dep-required` before attempting the Gated install.
npm install for a newly-required dep is Gated by convention and does NOT
need to be declared in `harness.yaml → actions:`.

**Supply chain hygiene on install:**
- Always use `--ignore-scripts` — prevents malicious `postinstall` hooks from running.
- Never install from a URL (`npm install https://...`) — always from the official registry.
- If the package was published or updated within the last 7 days, flag it to the user
  before installing: rapid new releases are a common indicator of a hijack.

**Not a blocker — resolve autonomously:**
- Sensor fails 1–2 times: fix and retry
- Test assertion mismatch: read the actual vs expected, fix the code or the test
- TypeScript type errors: fix the code
- Lint errors: fix the code
- Import path issues: resolve from codebase
- Missing files listed in a task: create them
- Any issue where the fix is inferable from the error output

**Never do this:**
- "I'm not sure how to fix this — could you help?"
- "There seem to be multiple approaches, which would you prefer?"
- Asking for help after only 1 or 2 attempts

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

### Code Minimalism

Write the minimum code that satisfies the acceptance criteria. Nothing more.

- **No speculative features** — don't add what the REQ doesn't specify. Future requirements belong in the spec, not the implementation.
- **No premature abstractions** — if a helper is used in only one place, inline it.
- **No impossible-scenario error handling** — only validate at real system boundaries (user input, external APIs). Trust internal code and framework guarantees.
- **Surgical edits only** — don't improve adjacent code, comments, or formatting unless they are directly required by this task.
- **Match existing style** — even if you'd choose differently. Consistency outweighs personal preference.
- **Clean up only your own mess** — remove only imports, variables, or functions that YOUR changes made unused.

If a senior engineer would say "this is more than the task required" — remove it.

### Goal-Driven Verification

Transform each task from an imperative instruction into a verifiable outcome before building.

Instead of: "Add email validation"
Think: "Email validation rejects invalid addresses per REQ-01.2 — proven by a unit test that fails without the change and passes after it."

The sprint contract's **Acceptance Criteria** are the definition of done. Build until every criterion is checkable. If a criterion can't be verified by a sensor or a concrete manual step, rewrite it until it can. Do not stop at "it seems to work" — run the sensor suite and confirm each criterion passes.

### Action Zones

Autonomy is **scoped to code, not infrastructure**. Every shell command falls
into one of three zones. The zone determines whether the agent may run it
unprompted.

| Zone | What it covers | Policy |
|------|---------------|--------|
| 🟢 **Free** | Read/Write/Edit, Grep/Glob, sensor commands from `harness.yaml`, `git add`, `git commit` (local), `git checkout -b feat/*` (feature branch creation) | Run without asking |
| 🟡 **Gated** | `docker run` / `docker compose up`, `prisma migrate dev`, `npm install --ignore-scripts <new-dep>`, `git push origin feat/*` (feature branch push), `gh pr create` (open PR), external-API calls with cost or rate-limit impact | Ask once per session OR obeys `auto_approve: true`. `git push` + `gh pr create` are built-in end-of-run actions — no `harness.yaml` declaration needed |
| 🔴 **Always ask** | `git push --force`, `git reset --hard`, `git push origin main` (direct main push), `prisma migrate reset`, merging/closing PRs, deploys (`kubectl apply`, `flyctl deploy`), dropping tables, deleting branches or cloud resources | Agent proposes, user must confirm each time. `auto_approve` has no effect |

**Rules**:

1. **Never run a Gated or Always-ask command outside `actions:`** — with two
   built-in exceptions that are Gated by convention and need no declaration:
   - `npm install --ignore-scripts <pkg>` (missing dep discovered during build)
   - `git push -u origin feat/*` + `gh pr create` (end-of-run)
   Any other undeclared Gated command: propose adding it to `harness.yaml` first.
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

All commits follow standard Conventional Commits 1.0.0:

```
<type>(<scope>): <summary>
```

**Subject line only — no body.** The `commit-msg` hook enforces this and will reject
any non-blank content after the subject. Write a subject that is self-explanatory without
a body — if it isn't, the scope or summary needs to be more precise, not longer.

Good: `feat(auth): add JWT expiry check`
Bad: `feat(auth): various auth improvements`

The PR description (not the commit) is where multi-point explanations belong.
Traceability lives in `state.json` (sprint → commit SHA) and `tasks.md`, not in commit messages.

**No ADP-specific trailers** (`[ADP-TASK-NN]`, `[ADP-QUICK-NNN]`, etc.).

Types: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `build` / `ci`.

### Requirement Traceability

```
spec.md (REQ-NN)
   ↓
tasks.md (TASK-NN cites REQ-NN in "Requirement:" field)
   ↓
commit SHA recorded in state.json (sprint → commit → task → REQ)
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
- **Supply chain verification:** CVE databases lag behind hijack events by hours
  or days. A second layer of defense is required:
  - **Node:** `npm audit signatures` verifies that every installed package was
    signed by the official registry. Fails if a package was tampered with after
    publication. Add to `harness.yaml` as a `security_signatures` sensor.
  - **Rust:** `cargo deny check advisories` enforces a local policy (`deny.toml`)
    covering advisories, banned crates, and license constraints.
  - **Python:** `pip check` verifies installed packages have mutually compatible
    requirements; `pip-audit` checks against OSV/PyPI advisory database.
  - **Go:** `go mod verify` recomputes checksums for all downloaded modules and
    compares against the module cache — detects tampered downloads.
  - **All stacks (high-risk projects):** `socket check --ci` (Socket.dev) analyzes
    each new package PR for: new maintainer, added install scripts, obfuscated code,
    dependency confusion risk. Requires a Socket.dev account; skip for internal tools.
- **Lockfile integrity:** Always commit `package-lock.json` / `Cargo.lock` /
  `requirements.txt` hash pins. In CI, run `npm ci` (not `npm install`) — it reads
  the lockfile exactly and refuses to install if it diverges from `package.json`.
  An unlocked lockfile lets `npm install` silently upgrade to a malicious patch release.
- **Install-time hygiene:** All `npm install` calls use `--ignore-scripts` to prevent
  `postinstall` hooks from executing arbitrary code. No installs from URLs or git
  refs — only from the official registry with an explicit semver range.
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

## Workflow Templates

ADP ships with a catalog of **pre-built workflow templates** for common engineering
scenarios. Use them to bootstrap `spec.md` instead of starting from a blank file.

```bash
adp templates list                          # show catalog
adp templates show fix-bug                  # preview a template
adp templates use security-audit my-audit   # scaffold .specs/features/my-audit/spec.md
```

Templates live in `templates/workflows/*.md` (in the package or skill install).
Each has YAML frontmatter (`name`, `description`, `complexity`) and a body with
REQ scaffolding, recommended sensors, and out-of-scope notes.

**Built-in catalog:**
- **fix-bug** (small) — reproduce → isolate → patch with regression test
- **add-feature** (medium) — new feature end-to-end with REQ + NFR
- **refactor-safely** (medium) — restructure with behavioral invariant guard
- **security-audit** (large) — deps, secrets, OWASP, input validation, auth
- **perf-investigation** (medium) — measure-first, profile, fix, verify
- **dependency-upgrade** (medium) — review changelog, lock, audit, adapt

**Authoring guide:** copy any template, edit frontmatter + body, drop into
`templates/workflows/`. The catalog auto-discovers it on next `templates list`.

## DAG Validation

Before executing sprints, ADP validates the **task dependency graph** to catch
broken setups upfront — not mid-sprint.

```bash
adp validate <feature>
```

Runs:
1. **Sensors** — typecheck, lint, test, audit, secret_scan
2. **DAG parsing** of `.specs/features/<feature>/tasks.md`
3. **Unresolved reference check** — every `Depends:` must point to a real TASK-NN
4. **Cycle detection** — DFS-based, reports the cycle path on failure
5. **Topological layering** — Kahn's algorithm groups tasks into layers; tasks
   in the same layer have all dependencies resolved by previous layers and are
   eligible for parallel execution (subject to the `[P]` marker)

Output:
```
✓ DAG: 9 tasks, 4 layers
   L1: TASK-01, TASK-03, TASK-05 [parallel]
   L2: TASK-02, TASK-04 [parallel]
   L3: TASK-06, TASK-07, TASK-08 [parallel]
   L4: TASK-09
```

The pipeline's Execute step calls `adp validate` before sprint 1 — a broken DAG
halts the run.

## Worktree Parallelism

Tasks marked `[P]` in `tasks.md` whose layers contain ≥2 tasks are eligible for
**concurrent execution in isolated git worktrees**.

```bash
adp worktree list                  # show active sprint worktrees
adp worktree add 3                 # create .adp/worktrees/sprint-3 + adp/sprint-3 branch
adp worktree remove 3              # clean up after completion
adp worktree clean                 # force-remove all sprint worktrees
```

**How parallelism works:**

For each DAG layer with multiple `[P]` tasks:
1. Spawn one worktree per task — `git worktree add .adp/worktrees/sprint-N -b adp/sprint-N`
2. Run the sprint (sensors, evaluator, commit) inside the worktree, in parallel
3. On success — merge the branch back (`merge --no-ff`), remove the worktree
4. On failure — preserve the worktree for inspection, log to `STATE.md → Blockers`

Worktrees provide true isolation: each parallel sprint sees a clean working tree
on its own branch, so concurrent file edits don't conflict.

**Tracked in `state.json`:**
```json
{
  "worktrees": [
    { "sprint": 3, "branch": "adp/sprint-3", "path": ".adp/worktrees/sprint-3", "status": "active" }
  ]
}
```

**Constraints:**
- Only `[P]`-marked tasks at the same DAG layer run in parallel
- Sequential tasks (no `[P]`) always run in the main worktree
- Failed parallel sprints halt the pipeline; the user resolves before continuing

## ADK Layers

ADP implements the **Agent Development Kit** (ADK) five-layer architecture. Each layer has a distinct role; together they form a deterministic guardrail stack around Claude Code.

| Layer | Name | What it does | ADP artifact |
|-------|------|--------------|--------------|
| **L1** | CLAUDE.md (Memory Layer) | Naming rules, architecture expectations, project-level instructions | `CLAUDE.md` + `adp/CLAUDE.md` |
| **L2** | Skills (Knowledge Layer) | Methodology surfaced to Claude Code, auto-invoked | `SKILL.md` + installer |
| **L3** | Hooks (Guardrail Layer) | Shell scripts that run before/after tool calls and at session start — **deterministic, not AI** | `.claude/hooks/` |
| **L4** | Subagents (Delegation Layer) | Named agent specs with explicit tool allowlists and permission scopes | `.claude/agents/` |
| **L5** | Plugins (Distribution Layer) | Bundled install (skill + hooks + agents) for team-wide alignment | `templates/hooks/`, `templates/agents/`, `bin/install.*` |

### L3 — Hooks

Four hooks are installed by `adp init`:

**`.claude/hooks/PreToolUse.sh`** — fires before every tool call. Blocks:
- `rm -rf` targeting anything outside `.adp/worktrees/`
- `git reset --hard`
- `git checkout --` (discards uncommitted file edits)
- `git clean -fd` (deletes untracked files)
- `git push --force` to `main`/`master`
- Direct `git push origin main` (must use a feature branch)
- Write or Edit tool calls originating from the `evaluator` sub-agent

**`.claude/hooks/PostToolUse.sh`** — fires after Write/Edit tool calls. When `ADP_POST_TYPECHECK=1` is set in the environment, runs `tsc --noEmit --skipLibCheck` to catch type errors immediately after each file write. Opt-in; no-op by default.

**`.claude/hooks/SessionStart.sh`** — fires at the start of every Claude Code session. Reads `.adp/state.json` and prints the current pipeline status (feature, phase, sprint count) so Claude is immediately oriented without needing to read state manually.

**`.git/hooks/commit-msg`** — git-native hook that fires before every commit is finalized. Enforces three rules deterministically (no AI involved):
1. **No ADP trailers** — rejects any message containing `[ADP-` (blocks `[ADP-TASK-NN]`, `[ADP-QUICK-NNN]` suffixes)
2. **Conventional Commits format** — subject must match `<type>(<scope>): <summary>`
3. **Subject-line only** — rejects any body paragraph after the subject (blank lines and standard git footers like `Co-authored-by:` are allowed)

Exit code 1 aborts the commit with a clear diagnostic. Source: `templates/hooks/commit-msg`.

To install the git hook in any project: copy `templates/hooks/commit-msg` to `.git/hooks/commit-msg` and make it executable (`chmod +x .git/hooks/commit-msg`). `adp init` does this automatically.

To enable Claude Code hooks: Claude Code → Settings → Hooks → add `.claude/hooks/PreToolUse.sh`, `PostToolUse.sh`, `SessionStart.sh` by path.

### L4 — Formal Agent Specs

Three agent definitions are installed by `adp init` into `.claude/agents/`:

**`evaluator.md`** — Use when grading a sprint after sensors pass.
- `allowedTools: [Read, Grep, Glob, Bash]` — Bash restricted to read-only commands (`git diff`, `git log`, `cat`)
- No Write/Edit — the evaluator never modifies code; the PreToolUse hook must block any Write or Edit call from this agent
- Receives: sprint contract + git diff + sensor results + harness.yaml criteria
- Returns: JSON verdict with per-criterion scores

**`contract-reviewer.md`** — Use before building a sprint (contract review step).
- Tools: Read, Grep, Glob only
- No writes, no Bash
- Receives: task definition + draft sprint contract
- Returns: `APPROVED | NEEDS_REVISION` with gaps and ambiguities

**`worktree-agent.md`** — Use for `[P]`-marked tasks running in parallel worktrees.
- Tools: all (including Write, Edit, Bash)
- Scoped to one worktree branch — cannot touch main or other sprint branches
- Receives: one task definition + sprint contract + relevant guides
- Returns: commit SHA + sensor results

**When to use which agent:**
- Sprint build → spawn `worktree-agent` (parallel tasks) or build in main context (sequential)
- Pre-build review → spawn `contract-reviewer`
- Post-build QA → spawn `evaluator`

## Notion Memory Sync (dual-write protocol)

Every time you write a local memory `.md` file (via Write or Edit), also sync it to
the "ADP Memory" Notion database — **in the same operation, not later**.

### When to sync

- **Write:** New memory file created → create a new Notion page.
- **Edit/Update:** Existing memory file changed → search Notion for the page by
  `Name` + `Project`, then update it via `notion-update-page`.
- **Delete/Supersede:** Memory marked stale or deleted → update the Notion page's
  `Status` field to `stale` or `superseded`.
- **Recall:** Memory read during an ADP operation and its content confirmed still accurate →
  update `Last verified` to today. Batch at the end of the operation (end of `adp run`,
  `adp init`, `adp resume`) — not on every individual read.
- **Skip sync for:** `MEMORY.md` (index file), `reference_notion_memory.md` (pointer file).
  Only sync files that contain actual memories (have `metadata.type` frontmatter).

### How to sync

**Step 1 — Read the pointer file** from the current project's memory directory:
```
~/.claude/projects/<project-slug>/memory/reference_notion_memory.md
```
Extract:
- `data_source_id` (e.g. `2d1ac8c4-819a-4562-a57b-944dc613b18f`)
- The `Project` value to tag the entry with (e.g. `"adp"`, `"rooted-life"`)

The project slug is derived from the directory name `C--Users-User-Documents-Claude-<slug>`.

If `reference_notion_memory.md` does not exist, skip Notion sync silently — do not
error, do not create the pointer file automatically.

**Step 2 — Sanitize before syncing (privacy / internal-path protection):**

Before mapping fields to Notion, strip the following from `Body`, `Why`, and `How to apply`:
- Absolute file paths (e.g. `C:\Users\...`, `/home/...`, `/c/Users/...`)
- `file:line` references (e.g. `src/foo.ts:42`)
- Any content sourced from `security.md` — that guide contains vulnerability details and dependency audit output that must never leave the local environment
- Replace stripped references with a generic description (e.g. "see codebase" instead of a path)

**Step 3 — Map frontmatter to Notion schema:**

| Local frontmatter field | Notion DB property | Notes |
|------------------------|-------------------|-------|
| `name` slug            | `Name` (TITLE)    | Use the slug as-is |
| `metadata.type`        | `Type` (SELECT)   | user / feedback / project / reference |
| _(current project)_    | `Project` (SELECT)| From pointer file |
| Body paragraph(s)      | `Body` (text)     | Everything after frontmatter, before **Why:** (sanitized) |
| `**Why:** ...` line    | `Why` (text)      | Strip the `**Why:** ` prefix (sanitized) |
| `**How to apply:** ...` line | `How to apply` (text) | Strip the `**How to apply:** ` prefix (sanitized) |
| _(always)_             | `Status`          | Set to `"active"` on create; update explicitly when stale |
| _(recall-confirm only)_ | `Last verified` (date) | `date:Last verified:start` = ISO date (e.g. `2026-05-17`). Update on recall-confirm, NOT on write. |

**Step 4 — Create or update:**

For a **new** memory:
```
mcp__claude_ai_Notion__notion-create-pages
  parent.data_source_id: <data_source_id>
  pages[0].properties:
    Name:           <slug>
    Type:           <type>
    Project:        <project>
    Body:           <body text>
    Why:            <why text>
    How to apply:   <how to apply text>
    Status:         active
```

For an **updated** memory, first search for the existing page:
```
mcp__claude_ai_Notion__notion-search
  query: <slug>
  data_source_url: collection://<data_source_id>
  query_type: internal
```
Then call `notion-update-page` on the matching result's `id`.

### Last verified — recall-confirm protocol

`Last verified` tracks when a memory was last read and confirmed still accurate.
It is distinct from `Created` (set once at write-time, auto-managed by Notion).

**Update Last verified when:**
- End of `adp run` — for every memory whose content matched observed state during the run.
- `adp init` — update the `notion-memory-db` pointer entry to confirm the DB is reachable.
- `adp resume` — for every memory re-read and confirmed during orientation.
- On explicit user request to verify or refresh memories.

**Do NOT update Last verified when:**
- A memory is first created (that's `Created`).
- A memory's content is corrected (the correction signals it was stale — update `Status: stale` instead, then write a fresh entry).
- A memory is read but not confirmed against current state (e.g. skimming MEMORY.md index).

**How to update (per page):**
```
notion-update-page
  page_id:  <id from prior search or create>
  command:  update_properties
  properties:
    date:Last verified:start: <YYYY-MM-DD>
```

Batch across multiple pages — one `notion-update-page` call per page, in sequence.
On failure, log a one-line warning and continue — never block on a Last verified update.

### Failure handling

If the Notion MCP call fails (network error, auth, schema mismatch), log a one-line
warning to the user and continue — the local `.md` file is the source of truth.
Never block a memory write because Notion sync failed.

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
