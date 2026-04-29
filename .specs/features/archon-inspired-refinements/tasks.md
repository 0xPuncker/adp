# Tasks: archon-inspired-refinements

Progress: 0/9 complete

## TASK-01: Workflow template catalog — content
- [ ] **Requirement:** REQ-01.4, REQ-01.5
- [ ] **Files:** templates/workflows/fix-bug.md, templates/workflows/add-feature.md, templates/workflows/refactor-safely.md, templates/workflows/security-audit.md, templates/workflows/perf-investigation.md, templates/workflows/dependency-upgrade.md
- [ ] **Reuses:** templates/SPEC.md (existing scaffold style)
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** 6 markdown templates exist with title, complexity, REQ scaffold, sensors note
- [ ] **Test:** Manual review — each template self-contained, follows SPEC.md style
- [ ] **Commit:** `feat(templates): add 6 workflow templates [ADP-TASK-01]`

## TASK-02: TemplateCatalog class
- [ ] **Requirement:** REQ-01.1, REQ-01.2, REQ-01.3
- [ ] **Files:** src/templates/catalog.ts, src/templates/catalog.test.ts
- [ ] **Reuses:** node:fs/promises patterns from src/context/loader.ts
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** —
- [ ] **Done when:** catalog can list/show/use templates; resolves both dev and skill-installed paths
- [ ] **Test:** vitest covers list (returns 6), show (reads file), use (writes spec.md)
- [ ] **Commit:** `feat(templates): add TemplateCatalog class [ADP-TASK-02]`

## TASK-03: Tasks parser
- [ ] **Requirement:** REQ-02.1
- [ ] **Files:** src/tasks/parser.ts, src/tasks/parser.test.ts
- [ ] **Reuses:** —
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** parseTasks(content) returns Task[] with id, depends_on, parallel flag, files
- [ ] **Test:** vitest covers a sample tasks.md with 3 tasks, mixed depends_on and [P] markers
- [ ] **Commit:** `feat(tasks): add tasks.md parser [ADP-TASK-03]`

## TASK-04: DAG validator
- [ ] **Requirement:** REQ-02.2, REQ-02.3, REQ-02.4
- [ ] **Files:** src/tasks/dag.ts, src/tasks/dag.test.ts
- [ ] **Reuses:** Task type from TASK-03
- [ ] **Depends:** TASK-03
- [ ] **Parallel:** —
- [ ] **Done when:** validateDag detects unresolved refs, cycles; returns topological layers
- [ ] **Test:** vitest covers valid DAG, cycle, unresolved ref, parallel layer detection
- [ ] **Commit:** `feat(tasks): add DAG validator [ADP-TASK-04]`

## TASK-05: WorktreeManager
- [ ] **Requirement:** REQ-03.2, REQ-03.3, REQ-03.4, REQ-03.5, REQ-03.6
- [ ] **Files:** src/worktree/manager.ts, src/worktree/manager.test.ts
- [ ] **Reuses:** child_process.spawn patterns
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** add/remove/list/merge git worktrees with sprint-N naming
- [ ] **Test:** vitest with mocked git commands, real fs interactions in tmp dir
- [ ] **Commit:** `feat(worktree): add WorktreeManager class [ADP-TASK-05]`

## TASK-06: CLI subcommands — templates, validate, worktree
- [ ] **Requirement:** REQ-01.1-3, REQ-02.5, REQ-03.5, REQ-03.6
- [ ] **Files:** src/cli.ts
- [ ] **Reuses:** existing switch(command) pattern at cli.ts:18
- [ ] **Depends:** TASK-02, TASK-04, TASK-05
- [ ] **Parallel:** —
- [ ] **Done when:** all new subcommands routed; help text updated
- [ ] **Test:** manual via npx adp templates list / adp validate / adp worktree list
- [ ] **Commit:** `feat(cli): add templates, validate, worktree subcommands [ADP-TASK-06]`

## TASK-07: Pipeline integration — DAG validation in Execute
- [ ] **Requirement:** REQ-02.6
- [ ] **Files:** SKILL.md
- [ ] **Reuses:** existing Execute section
- [ ] **Depends:** TASK-04
- [ ] **Parallel:** —
- [ ] **Done when:** SKILL.md Execute step references `adp validate` before sprint 1
- [ ] **Test:** manual — read SKILL.md flow
- [ ] **Commit:** `docs(skill): integrate DAG validation into Execute step [ADP-TASK-07]`

## TASK-08: Public exports & index.ts
- [ ] **Requirement:** —
- [ ] **Files:** src/index.ts
- [ ] **Reuses:** existing export pattern
- [ ] **Depends:** TASK-02, TASK-03, TASK-04, TASK-05
- [ ] **Parallel:** —
- [ ] **Done when:** TemplateCatalog, parseTasks, validateDag, WorktreeManager exported with types
- [ ] **Test:** typecheck passes; downstream consumers can import
- [ ] **Commit:** `feat(api): export new modules from index.ts [ADP-TASK-08]`

## TASK-09: SKILL.md documentation update
- [ ] **Requirement:** REQ-04.1, REQ-04.2, REQ-04.3, REQ-04.4
- [ ] **Files:** SKILL.md
- [ ] **Reuses:** existing command table, methodology sections
- [ ] **Depends:** TASK-06, TASK-07
- [ ] **Parallel:** —
- [ ] **Done when:** commands table updated; new sections "Workflow Templates", "DAG Validation", "Worktree Parallelism" added
- [ ] **Test:** manual review
- [ ] **Commit:** `docs(skill): document templates, DAG validation, worktree parallelism [ADP-TASK-09]`
