# ADP - Autonomous Development Pipeline

Harness-driven, spec-to-code execution for Claude Code.

ADP is a Claude Code **skill** that turns a spec file into shipped, committed code
through four adaptive phases — **Specify → Design → Tasks → Execute** — with
feedforward guides (generated from your codebase) and feedback sensors (lint,
typecheck, test) enforced at every boundary.

- **Skill layer** (`SKILL.md`) — methodology the agent follows.
- **Runtime layer** (`src/`) — TypeScript helpers for loading guides, running
  sensors, and persisting pipeline state.

> Inspired by **[TLC Spec-Driven](https://agent-skills.techleads.club/skills/tlc-spec-driven/)**.
> ADP adds a computational harness (live sensors, scoring, stuck detection) on top
> of the four-phase spec-driven methodology.

---

## Table of Contents

1. [Install](#install)
2. [Quick Start](#quick-start)
3. [Methodology](#methodology)
4. [Directory Layout](#directory-layout)
5. [Commands](#commands)
6. [Architecture](#architecture)
7. [Templates](#templates)
8. [Development](#development)

---

## Install

Install once per machine. The installer copies skill files to `~/.claude/skills/adp/`
**and** installs the `adp` CLI globally via npm. Claude Code picks up the skill
automatically in every project.

### macOS / Linux / Git Bash / WSL

```bash
curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
```

### Windows (native PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.ps1 | iex
```

> **PowerShell execution policy:** if `iex` is blocked, run with
> `Set-ExecutionPolicy -Scope Process Bypass` first, or invoke via
> `powershell -ExecutionPolicy Bypass -Command "iwr ... | iex"`.

### Skill only (no CLI)

If you don't have Node 22+ and only want the skill methodology files:

```bash
ADP_SKILL_ONLY=1 curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
```

PowerShell:

```powershell
$env:ADP_SKILL_ONLY = "1"
iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.ps1 | iex
```

### Standalone binary (no Node required)

If Node 22+ isn't available, build a standalone `adp` binary from a checkout:

```bash
git clone https://github.com/0xPuncker/adp.git
cd adp && npm install && npm run build
npm run build:standalone        # produces dist/adp-<plat>-<arch>[.exe]
```

> The standalone binary excludes the TUI (`adp tui` / `adp-i`). All other
> commands work normally.

### Update

To upgrade an existing install:

```bash
adp update                      # main branch
adp update --branch feat/foo    # specific branch
```

This re-runs the platform-appropriate installer. The `adp` command picks
PowerShell on native Windows, bash everywhere else.

### Uninstall

To remove ADP completely:

```bash
adp uninstall                   # confirms before removing
adp uninstall -y                # skip confirmation
```

Removes:
- `~/.claude/skills/adp/` — skill files and templates
- The global `adp` CLI (via `npm uninstall -g adp`)
- Any standalone binary at `~/.claude/skills/adp/bin/adp[.exe]`

### Verify

```bash
ls ~/.claude/skills/adp/SKILL.md && echo "ok"
```

Then open Claude Code in any project and say `adp init`.

### Installer overrides

Both installers honour these environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLAUDE_SKILLS_DIR` | `~/.claude/skills` | Alternate skills root |
| `ADP_BRANCH` | `main` | Branch, tag, or commit to install |
| `ADP_FORCE` | `0` | `1` overwrites existing install without prompting |
| `ADP_SKILL_ONLY` | `0` | `1` installs skill files only, skips CLI |
| `ADP_DRY_RUN` | `0` | `1` prints actions without executing |

### Requirements

- `git` and `curl` on `PATH` (for shell installer); `git` and `iwr` (PowerShell)
- Node.js ≥ 22 + `npm` (for CLI install — skill-only mode skips this)
- Claude Code with skill support (for the skill side)

### Developing against a local checkout

```bash
git clone https://github.com/0xPuncker/adp.git
cd adp
npm install
npm run build

# Symlink your local copy into Claude Code's skills dir:
ln -s "$(pwd)" ~/.claude/skills/adp
```

---

## Quick Start

Inside any target project:

```
You > adp init
Claude > detects stack, creates .adp/ + .specs/, writes harness.yaml, runs adp map

You > adp run payments
Claude > Specify → clarifying questions → spec.md
        → Design → design.md
        → Tasks → tasks.md (atomic, parallel-marked, REQ-traced)
        → Execute → build → sensors → commit, per task
        → Validate → REQ coverage + UAT
```

State persists between sessions. Stop with `adp pause`, continue with `adp resume`.

---

## Methodology

### The Four Phases

```mermaid
flowchart LR
    req([feature request]) --> size{complexity?}
    size -->|Small| quick[Quick Mode]
    size -->|Medium| specM[Specify]
    size -->|Large / Complex| specL[Specify]
    specM --> execM[Execute]
    specL --> design[Design]
    design --> tasks[Tasks]
    tasks --> execL[Execute]
    quick --> validate[Validate]
    execM --> validate
    execL --> validate
    validate --> done([shipped])
```

Phases auto-size to the scope of the work:

| Scope | Criteria | Phases |
|-------|----------|--------|
| **Small** | ≤3 files, ≤1h, no new deps | Quick Mode only |
| **Medium** | Clear feature, <10 tasks | Specify → Execute → Validate |
| **Large** | Multi-component, 10+ tasks | All phases |
| **Complex** | Ambiguous / new domain | All + gray-area discussion + interactive UAT |

### The ID Chain

Every piece of work is traceable end-to-end:

```mermaid
flowchart TD
    req["<b>REQ-01.2</b> <i>spec.md</i><br/>WHEN invalid email THEN 422"]
    task["<b>TASK-05</b> <i>tasks.md</i><br/>Requirement: REQ-01.2<br/>Files: src/routes/auth.ts"]
    sprint["<b>Sprint</b> <i>execution</i><br/>contract → build → sensors → score"]
    commit["<b>commit</b><br/>feat(auth): validate email format<br/>SHA recorded in state.json"]
    val["<b>validation.md</b><br/>REQ-01.2 ✓ covered by TASK-05"]
    req --> task --> sprint --> commit --> val
```

Break the chain = validation failure.

### The Harness

Two layers protect every task:

- **Feedforward — guides** (`.adp/guides/*.md`) are generated by `adp map` from
  your codebase. They are injected into context before each phase so the agent
  sees *this* project's conventions, not a generic model prior.
- **Feedback — sensors** (`.adp/harness.yaml`) are real shell commands
  (typecheck, lint, test) run after every build. No commit until they pass.
  3 failures on the same error ⇒ stuck detection ⇒ halt and ask the user.

### The Sprint Lifecycle

Every task inside Execute flows through the same gated loop:

```mermaid
stateDiagram-v2
    [*] --> Contract: sprint_start
    Contract --> Build: state goal + verification
    Build --> Sensors: code written
    Sensors --> Score: typecheck ✓ lint ✓ test ✓
    Sensors --> Fix: any sensor failed
    Fix --> Sensors: retry (≤3x)
    Fix --> Blocker: same error 3x
    Score --> Commit: score recorded
    Commit --> [*]: sprint_end
    Blocker --> [*]: halt + log STATE.md
```

A failing sensor never auto-merges — the pipeline either retries, escalates,
or halts and asks the user.

### Action Zones

Autonomy is scoped to code, not infrastructure. Every shell command falls
into one of three zones; the zone decides whether the agent may run it
unprompted:

```mermaid
sequenceDiagram
    participant A as Agent
    participant U as You
    participant S as Shell
    Note over A: 🟢 Free — code + sensors + local git
    A->>S: tsc --noEmit / eslint / vitest
    S-->>A: pass/fail
    A->>S: git add / git commit (local)

    Note over A,U: 🟡 Gated — declared in harness.yaml actions:
    A->>U: "run 'docker compose up -d postgres'?"
    U-->>A: approve (once per session)
    A->>S: docker compose up -d postgres

    Note over A,U: 🔴 Always ask — destructive or externally visible
    A->>U: "run 'flyctl deploy'?"
    U-->>A: approve (every call)
    A->>S: flyctl deploy
```

See `SKILL.md → Methodology Rules → Action Zones` for the full policy.

### Core Rules

1. **Never fabricate.** Resolve facts via Knowledge Verification Chain:
   codebase → project docs → Context7 MCP → web → *flag uncertain*.
2. **Scope lock.** Touch only files listed in the current task. Out-of-scope
   findings → `STATE.md → Deferred Ideas`.
3. **Fresh context per task.** Re-read what the next task needs; drop history.
4. **Conventional Commits 1.0.0** — no proprietary trailers; traceability via `state.json`.
5. **Don't skip sensors.** Never disable a check to make it pass — fix the code.
6. **Action zones.** Free for code, gated for infra, always-ask for destructive state.

---

## Directory Layout

### `.adp/` — runtime state and guides

```
.adp/
├── state.json        # Pipeline runtime state (machine-readable)
├── harness.yaml      # Sensor commands (typecheck / lint / test)
└── guides/           # 7 feedforward guides, generated by `adp map`
    ├── stack.md
    ├── architecture.md
    ├── structure.md
    ├── conventions.md
    ├── testing.md
    ├── integrations.md
    └── concerns.md
```

### `.specs/` — human-readable planning artifacts

```
.specs/
├── HANDOFF.md                     # created by `adp pause` — resume pointer
├── project/
│   ├── PROJECT.md                 # Vision, goals, constraints
│   ├── ROADMAP.md                 # Milestones, features, status
│   └── STATE.md                   # Decisions, blockers, deferred ideas
├── features/
│   └── {feature-name}/
│       ├── spec.md                # Requirements (REQ-NN with User Stories)
│       ├── context.md             # Gray-area decisions (only if needed)
│       ├── design.md              # Architecture (Large/Complex only)
│       ├── tasks.md               # Atomic tasks (Medium+ only)
│       └── validation.md          # REQ coverage check after Execute
└── quick/
    └── NNN-slug/
        ├── TASK.md                # Quick-mode task
        └── SUMMARY.md             # Quick-mode result
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `adp init` | Detect stack, create `.adp/` + `.specs/`, write `harness.yaml`, run `adp map` |
| `adp map` | Analyze codebase, generate the 7 feedforward guides |
| `adp run <feature>` | Execute full pipeline for a feature |
| `adp status` | Show current sprint, phase, recent activity |
| `adp verify` | Run all sensors; report pass/fail |
| `adp pause` | Snapshot to `HANDOFF.md`; stop gracefully |
| `adp resume` | Read handoff + state; continue from the exact stopping point |
| `adp tui` | Open the live dashboard (sprint table, activity log, live agent panel) |

All commands are triggered in natural conversation with Claude Code — the agent
reads `SKILL.md` and executes them using its built-in tools (Read, Write, Edit,
Bash, Glob, Grep). There is no standalone CLI binary required.

The optional runtime library (`src/`) is exported for programmatic use.

### Live agent panel

`adp tui` includes a **Live Agents** panel that tails the current Claude Code
session's `subagents/` JSONL files in real time (~100ms latency via `chokidar`).
Each sub-agent the orchestrator spawns — evaluator, contract reviewer, parallel
worktree workers — is classified, scored against your `harness.yaml` thresholds,
and rendered with elapsed time and prompt snippet.

- Wide terminal (≥120 cols): three-column dashboard (sprints | activity | live).
- Medium (90–119 cols): live panel hidden on the dashboard; press `4` or run
  `/live` to focus the panel.
- Narrow (<90 cols): live panel hidden entirely.

If the active session JSONL can't be located, the panel renders a degraded
banner and the rest of the dashboard keeps working.

---

## Architecture

```
adp/
├── SKILL.md                       # Methodology the agent follows
├── README.md                      # You are here
├── templates/
│   └── SPEC.md                    # Copy into .specs/features/{name}/spec.md
├── src/
│   ├── index.ts                   # Public exports
│   ├── types.ts                   # Domain types (Sprint, Activity, PipelineState…)
│   ├── cli.ts                     # CLI entry (adp sensors / status / guides…)
│   ├── interactive.ts             # Interactive REPL
│   ├── ui/                        # Ink/React status TUI
│   ├── harness/
│   │   ├── engine.ts              # Runs sensor commands, reports pass/fail
│   │   ├── config.ts              # Loads .adp/harness.yaml
│   │   └── engine.test.ts
│   ├── context/
│   │   └── loader.ts              # Loads guides + specs from .adp/ and .specs/
│   └── state/
│       ├── manager.ts             # Reads/writes .adp/state.json
│       └── manager.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Module responsibilities

- **`harness/`** executes sensors. `engine.ts` spawns the shell commands listed
  in `harness.yaml` in configured `order`, captures stdout/stderr/exit code,
  and returns a structured result the agent can act on.
- **`context/loader.ts`** reads `.adp/guides/` and `.specs/` into an object
  the agent can pass to a sub-agent — enabling targeted context-injection
  instead of loading the whole project.
- **`state/manager.ts`** owns `.adp/state.json` — sprint lifecycle, activity
  log, blockers. All writes go through it for consistency.

### Skill vs. Runtime

| Layer | Tells agent | Executes | File |
|-------|-------------|----------|------|
| **Skill** | *what* to do | agent itself (Read/Write/Bash/…) | `SKILL.md` |
| **Runtime** | *how* to do it reliably | Node process | `src/*.ts` |

The skill is authoritative. The runtime is a convenience.

---

## Templates

`templates/` contains pre-filled scaffolds for every artifact ADP expects.
Copy them when bootstrapping, or let the skill create them for you.

| Template | Copies to | Purpose |
|----------|-----------|---------|
| `PROJECT.md` | `.specs/project/PROJECT.md` | Vision, goals, non-goals, personas, stack, constraints |
| `ROADMAP.md` | `.specs/project/ROADMAP.md` | Now / Next / Later / Done milestones with status legend |
| `STATE.md` | `.specs/project/STATE.md` | Decisions, Blockers, Learnings, Deferred Ideas, Todos |
| `SPEC.md` | `.specs/features/{name}/spec.md` | Feature spec with REQ-NN User Stories + WHEN/THEN criteria |
| `tasks.md` | `.specs/features/{name}/tasks.md` | Atomic tasks with Requirement / Files / Reuses / Parallel / Commit |
| `HANDOFF.md` | `.specs/HANDOFF.md` | Pause/resume snapshot — progress, sensors, next steps |

Bootstrap a new feature manually:

```bash
mkdir -p .specs/features/my-feature
cp adp/templates/SPEC.md  .specs/features/my-feature/spec.md
cp adp/templates/tasks.md .specs/features/my-feature/tasks.md
```

Or the recommended path — let `adp run my-feature` generate them with the spec
filled in from your clarifying answers.

---

## Development

```bash
npm run build          # tsc → dist/
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
npm run test:watch     # vitest in watch mode
```

Single test:

```bash
npx vitest run src/harness/engine.test.ts
npx vitest run -t "passes on exit code 0"
```

---

## References

- **[TLC Spec-Driven](https://agent-skills.techleads.club/skills/tlc-spec-driven/)** — the four-phase spec-driven methodology (Specify → Design → Tasks → Execute) that ADP is built on. ADP extends it with a computational harness: live sensors, sprint scoring, stuck detection, and a feature-branch → PR workflow.
- **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/)** — commit message convention used by ADP.
- **[Anthropic — Harness Design for Long-Running Apps](https://www.anthropic.com/research/building-effective-agents)** — the evaluator-as-separate-agent principle that underpins ADP's QA layer.
