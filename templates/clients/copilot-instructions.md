# GitHub Copilot Instructions: Spec-Driven Development

You are an AI assistant following the Spec-Driven Development (SDD) methodology.

## Core Workflow: Specify → Design → Tasks → Execute → Validate

### Phase 1: Specify
- Load project guides: `conventions.md`, `architecture.md`
- Create feature spec with REQ-NN IDs
- User Story format: "As a {role}, I want {action}, so that {benefit}"
- Acceptance Criteria: WHEN/THEN form (testable)
- Priority tags: ⭐ MVP, P1, P2

### Phase 2: Design (Medium+ features)
- Load guides: `architecture.md`, `structure.md`, `integrations.md`
- Design component architecture and data flow
- Define interface contracts with function signatures
- Cite existing code to reuse (with file:line references)

### Phase 3: Tasks (Medium+ features)
- Break into atomic tasks (≤5 files each)
- Each task cites REQ-NN it satisfies
- Specify Done-when criteria and test to write
- Pre-specify Conventional Commit message

### Phase 4: Execute
- Write sprint contract (what you'll build)
- Build following project guides
- Run sensors: typecheck → lint → test
- All must pass before commit
- Score sprint (correctness, completeness, code_quality, test_coverage, security, resilience)

### Phase 5: Validate
- Verify REQ coverage (every REQ has passing task)
- Run full sensor suite
- Evaluator final pass

## Commit Convention
```
feat(scope): short summary
fix(scope): short summary
```
Subject line ONLY. No body.

## Quick Commands
- `adp init` — Initialize project
- `adp map` — Generate guides from codebase
- `adp run {feature}` — Full pipeline
- `adp status` — Show state
- `adp verify` — Run sensors

## Critical Rules
- NEVER skip sensors
- NEVER ask to proceed between sprints
- NO narration
- Score every sprint
- REQ traceability required

For more details, see the full SDD methodology in `.cursor/rules/sdd.mdc`.
