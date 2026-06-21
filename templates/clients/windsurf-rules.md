# Windsurf Rules: Spec-Driven Development

You are an AI assistant following the Spec-Driven Development (SDD) methodology.

## Core Principles

1. **Spec is source of truth** — REQ-NN drive everything
2. **Traceability** — Tasks cite REQs, commits cite tasks
3. **Sprint contracts** — Bidirectional agreement
4. **Sensor gates** — No commit without passing sensors
5. **Validation** — REQ coverage verified at end

## Workflow

### New Feature
```
1. adp feature "{request}"    → Create feature, seed spec
2. adp run {feature}          → Specify → Design → Tasks → Execute
3. adp status                 → Check state
4. adp pause                  → Stop gracefully
5. adp resume                 → Continue
```

### Quick Fix
```
1. adp run "quick: {desc}"    → Quick mode
```

### Existing Project
```
1. adp init                    → Initialize
2. adp map                     → Generate guides
```

## Phases

### Specify
- Load guides: conventions, architecture
- Create spec.md with REQ-NN
- User Stories: As a...I want...so that...
- Acceptance Criteria: WHEN/THEN
- Priority: ⭐ MVP, P1, P2

### Design (Medium+)
- Load guides: architecture, structure
- Create design.md
- Component architecture, data flow
- Interface contracts
- Reuse existing code (cite file:line)

### Tasks (Medium+)
- Create tasks.md
- Atomic tasks (≤5 files)
- Cite REQ-NN
- Done-when, test, commit message
- Mark [P] for parallel

### Execute
Per task:
1. Sprint contract (sprint-N.md)
2. Build following guides
3. Sensors: typecheck → lint → test
4. Score (6 criteria)
5. Commit

### Validate
- REQ coverage
- Full sensors
- Evaluator pass
- UAT (Complex)

## Commit Format
```
feat(scope): short summary
```
Subject line ONLY.

## Commands

| Command | Purpose |
|---------|---------|
| `adp init` | Initialize |
| `adp map` | Generate guides |
| `adp run {feature}` | Full pipeline |
| `adp run "quick: {desc}"` | Quick mode |
| `adp status` | State |
| `adp verify` | Run sensors |

## Critical Rules

- NEVER skip sensors
- NEVER ask to proceed
- NO narration
- Score every sprint
- Update state.json

## State Files

- `.adp/state.json` — Runtime state
- `.specs/features/{feature}/spec.md` — Requirements
- `.specs/features/{feature}/tasks.md` — Tasks
- `.specs/features/{feature}/contracts/sprint-N.md` — Contracts

## Guides (auto-loaded)

- `stack.md` — Language, framework
- `architecture.md` — Modules, dependencies
- `structure.md` — Directories
- `conventions.md` — Naming, patterns
- `testing.md` — Test framework
- `integrations.md` — External services
- `concerns.md` — Tech debt
- `security.md` — Security posture
