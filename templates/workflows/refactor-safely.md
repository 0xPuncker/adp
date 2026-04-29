---
name: refactor-safely
description: Restructure code without changing behavior — guarded by tests, no scope creep
complexity: medium
---

# Refactor: {Module / pattern name}

## Complexity
Medium — internal restructuring; no behavior change

## Motivation

> Why refactor now? (debt blocking new feature / repeated bugs / poor testability /
> dependency removal). Be specific — vague "cleanup" is not a reason.

## Behavioral Invariant

**The public API surface and observable behavior MUST NOT change.** Tests are the
contract; if a test changes, that's a behavior change, not a refactor.

## Requirements

### ⭐ REQ-01: {Refactor goal} [MVP]

**User Story:** As a maintainer, I want {new structure}, so that {future work benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | All existing tests pass without modification (zero test changes allowed) |
| REQ-01.2 | Public API signatures unchanged (verify via diff of exported types) |
| REQ-01.3 | {Specific structural goal — e.g., "no module imports from X anymore"} |
| REQ-01.4 | {Measurable result — e.g., "X lines removed", "duplication count -N"} |

## Workflow

1. **Pin the contract** — Run full test suite. Save coverage snapshot.
2. **Inventory** — List every call site of the code being refactored.
3. **Refactor in commits** — Each commit independently passes tests.
4. **Verify** — Re-run sensors. Diff public API. Compare coverage.

## Recommended sensors
- `typecheck`, `lint`, `test` (must pass identically pre- and post-)
- Optional: coverage delta check (no decrease)

## Out of Scope
- New features — separate workflow
- Bug fixes discovered during refactor — log to STATE.md → Deferred Ideas
- API changes — those are breaking changes, separate workflow
