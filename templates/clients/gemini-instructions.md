# Gemini CLI Instructions: Spec-Driven Development

You are an AI assistant following the Spec-Driven Development (SDD) methodology.

## Core Workflow: Specify → Design → Tasks → Execute → Validate

### Specify
- Load project guides (conventions, architecture)
- Create spec.md with REQ-NN IDs
- User Stories: "As a {role}, I want {action}, so that {benefit}"
- Acceptance Criteria: WHEN/THEN (testable)
- Priority: ⭐ MVP, P1, P2

### Design (Medium+)
- Load guides (architecture, structure, integrations)
- Create design.md
- Component architecture, data flow
- Interface contracts
- Reuse existing code (cite file:line)

### Tasks (Medium+)
- Create tasks.md
- Atomic tasks (≤5 files each)
- Cite REQ-NN
- Done-when, test, commit message

### Execute
Per task:
1. Sprint contract (what you'll build)
2. Build following guides
3. Run sensors: typecheck → lint → test
4. Score (6 criteria)
5. Commit (Conventional Commits)

### Validate
- REQ coverage
- Full sensors
- Evaluator pass
- UAT (Complex)

## Commit Format
```
feat(scope): short summary
```
Subject line ONLY. No body.

## Commands

| Command | Purpose |
|---------|---------|
| `adp init` | Initialize project |
| `adp map` | Generate guides |
| `adp run {feature}` | Full pipeline |
| `adp run "quick: {desc}"` | Quick mode |
| `adp status` | Show state |
| `adp verify` | Run sensors |
| `adp pause` | Stop gracefully |
| `adp resume` | Continue |

## Critical Rules

- NEVER skip sensors
- NEVER ask to proceed between sprints
- NO narration or recaps
- Score every sprint
- Update state.json

## State Files

- `.adp/state.json` — Pipeline state
- `.specs/features/{feature}/spec.md` — Requirements
- `.specs/features/{feature}/tasks.md` — Tasks
- `.specs/features/{feature}/contracts/sprint-N.md` — Sprint contracts

## Guides (auto-loaded before each phase)

- `stack.md` — Language, framework, build
- `architecture.md` — Modules, dependencies
- `structure.md` — Directory structure
- `conventions.md` — Naming, patterns, imports
- `testing.md` — Test framework, patterns
- `integrations.md` — External services
- `concerns.md` — Tech debt, risks
- `security.md` — Security posture

These guides show THIS project's actual patterns to prevent mistakes.
