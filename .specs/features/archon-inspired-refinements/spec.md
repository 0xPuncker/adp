# Archon-Inspired Refinements

## Complexity
Large — 3 distinct subsystems (workflow templates, DAG validation, worktree parallelism)
inspired by Archon's deterministic workflow engine, expressed in ADP's spec-driven model.

## Background

[Archon](https://github.com/coleam00/Archon) — "first open-source harness builder for AI coding"
— ships 17 YAML workflow templates, runs each workflow in an isolated git worktree
(parallel execution without conflicts), and uses explicit DAG node dependencies.

ADP currently has a single fixed pipeline (Specify→Design→Tasks→Execute), no template
catalog beyond the spec/contract templates, marks tasks as `[P]` parallel-eligible
without a mechanism to actually run them in parallel, and validates `Depends:` text-only
without DAG cycle detection.

## Requirements

### ⭐ REQ-01: Workflow templates library [MVP]

**User Story:** As a developer using ADP, I want a catalog of pre-built workflow templates
(fix-bug, add-feature, refactor, security-audit, perf-investigation) so that I don't
have to spec from scratch every time and the methodology stays consistent across teams.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN running `adp templates list` THEN displays available templates with name, description, complexity |
| REQ-01.2 | WHEN running `adp templates show <name>` THEN displays the template's spec scaffold |
| REQ-01.3 | WHEN running `adp templates use <name> <feature>` THEN copies the template into `.specs/features/<feature>/spec.md` |
| REQ-01.4 | Library MUST include at least: `fix-bug`, `add-feature`, `refactor-safely`, `security-audit`, `perf-investigation`, `dependency-upgrade` |
| REQ-01.5 | Each template MUST have: title, complexity, REQ scaffolding, common acceptance criteria, sensors recommendation |

### ⭐ REQ-02: DAG validation for task dependencies [MVP]

**User Story:** As a developer running `adp run`, I want the task DAG validated before
Execute starts so that cycles, dangling references, or impossible orderings are caught
upfront — not mid-sprint.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN parsing tasks.md THEN extracts {id, depends_on[], parallel} from each task |
| REQ-02.2 | WHEN a task references a non-existent task in `Depends:` THEN reports the unresolved reference and fails validation |
| REQ-02.3 | WHEN tasks form a cycle (A→B→A) THEN reports the cycle and fails validation |
| REQ-02.4 | WHEN DAG is valid THEN computes a topological order and reports parallel-eligible groups |
| REQ-02.5 | `adp validate` command MUST exist and run DAG validation + sensor check |
| REQ-02.6 | Pipeline Execute step MUST run DAG validation before sprint 1 |

### REQ-03: Worktree-based parallel execution [P1]

**User Story:** As a developer with `[P]`-marked tasks, I want them to actually run in
parallel via git worktrees so that independent work proceeds concurrently without merge
conflicts.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN tasks marked `[P]` exist in the same DAG layer THEN they may run in worktrees concurrently |
| REQ-03.2 | WHEN spawning a parallel sprint THEN creates `.adp/worktrees/sprint-N/` via `git worktree add` |
| REQ-03.3 | WHEN parallel sprint completes THEN merges its branch back, removes the worktree |
| REQ-03.4 | WHEN a parallel sprint fails THEN preserves the worktree for inspection (does NOT auto-remove) |
| REQ-03.5 | `adp worktree list` command MUST show active worktrees with sprint id, branch, status |
| REQ-03.6 | `adp worktree clean` MUST remove orphaned worktrees (after confirmation) |

### REQ-04: Documentation and skill update [P1]

**User Story:** As a user, I want SKILL.md to document the new commands and workflows
so that the methodology is self-describing.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | SKILL.md commands table includes `adp templates`, `adp validate`, `adp worktree` |
| REQ-04.2 | New section "Workflow Templates" documents the catalog and authoring guide |
| REQ-04.3 | New section "DAG Validation" documents the validation step in Execute |
| REQ-04.4 | New section "Worktree Parallelism" documents how `[P]` tasks become concurrent |

## Non-Goals

- Full DAG-based pipeline replacement (ADP keeps its 4-phase methodology)
- Multi-platform adapters (Slack, Telegram, web UI) — ADP stays Claude Code-native
- Async fire-and-forget execution — ADP stays synchronous
- Loop-with-`until` semantics — ADP's existing 3-attempt fix loops are sufficient

## Prerequisites

None — all changes are local code/docs. No new external services.
