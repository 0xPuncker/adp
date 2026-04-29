# Sprint 1: TASK-01 Workflow templates — content

## What I'll build
6 markdown workflow templates in `templates/workflows/` that users can apply via
`adp templates use <name> <feature>`. Each template scaffolds a spec.md tailored
to its workflow type (bug fix, feature add, refactor, security audit, perf, deps).

## Files to touch
- `templates/workflows/fix-bug.md` — new
- `templates/workflows/add-feature.md` — new
- `templates/workflows/refactor-safely.md` — new
- `templates/workflows/security-audit.md` — new
- `templates/workflows/perf-investigation.md` — new
- `templates/workflows/dependency-upgrade.md` — new

## Acceptance criteria
- [ ] 6 templates exist
- [ ] Each has frontmatter: `name`, `description`, `complexity`
- [ ] Each contains REQ scaffolding consistent with `templates/SPEC.md`
- [ ] Each lists recommended sensors and acceptance criteria patterns

## Verification
- Sensor: typecheck (no TS changes — should pass clean)
- Sensor: lint (no JS/TS changes — should pass)
- Sensor: test (no test changes — should pass)
- Manual: each template self-contained, follows SPEC.md style

## Requirements traced
REQ-01.4, REQ-01.5
