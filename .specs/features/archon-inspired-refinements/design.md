# Design: Archon-Inspired Refinements

## Component architecture

```
src/
├── templates/                    # NEW — workflow template catalog
│   ├── catalog.ts                # TemplateCatalog class — list, show, use
│   ├── catalog.test.ts
│   └── workflows/                # template content (markdown)
│       ├── fix-bug.md
│       ├── add-feature.md
│       ├── refactor-safely.md
│       ├── security-audit.md
│       ├── perf-investigation.md
│       └── dependency-upgrade.md
├── tasks/                        # NEW — task DAG parsing & validation
│   ├── parser.ts                 # parseTasks() — parses tasks.md → Task[]
│   ├── parser.test.ts
│   ├── dag.ts                    # validateDag() — cycles, refs, topo order
│   └── dag.test.ts
├── worktree/                     # NEW — git worktree manager
│   ├── manager.ts                # WorktreeManager — add/remove/list
│   ├── manager.test.ts
│   └── parallel.ts               # ParallelExecutor — runs sprints in worktrees
└── cli.ts                        # MODIFIED — add templates/validate/worktree subcommands
```

## Data flow

### Templates (REQ-01)

```
.adp/skills/adp/templates/workflows/*.md  ──────────┐
                                                     │
adp templates list   →  TemplateCatalog.list()      │
adp templates show   →  TemplateCatalog.show(name)  │ ←── reads from
adp templates use    →  TemplateCatalog.use(name,   │     (skill install dir)
                          feature)                   │
                                                     │
                            ↓ writes                  │
                                                     │
        .specs/features/<feature>/spec.md ───────────┘
```

Templates are bundled with the npm package (`templates/workflows/` ships in `files`).
When the skill is installed, they live at `~/.claude/skills/adp/templates/workflows/`.
The `TemplateCatalog` resolves paths relative to either location.

### DAG validation (REQ-02)

```
.specs/features/<feature>/tasks.md
                 ↓
        parseTasks() → Task[]
                 ↓
        validateDag(tasks)
         ├─ checkUnresolved()  → fails if Depends references missing task
         ├─ detectCycles()     → DFS-based cycle detection
         └─ topoSort()         → Kahn's algorithm; groups by depth = parallel layers
                 ↓
        DagResult { valid, errors[], layers[][] }
```

Called from:
- `adp validate <feature>` — manual invocation
- Pipeline Execute step (before sprint 1)

### Worktree parallelism (REQ-03)

```
For each DAG layer:
  - If layer has 1 task: run normally in current worktree
  - If layer has N≥2 [P] tasks:
      For each task in parallel (Promise.all):
        WorktreeManager.add(sprint-N) → .adp/worktrees/sprint-N/ + branch
        Spawn sub-agent with worktree dir + task spec
        Sub-agent runs sensors, evaluates, commits
        On success: merge branch back to main, remove worktree
        On failure: preserve worktree, log to STATE.md → Blockers
```

State tracked in `.adp/state.json`:
```json
{
  "worktrees": [
    { "sprint": 3, "branch": "adp/sprint-3-task-foo", "path": ".adp/worktrees/sprint-3", "status": "active" }
  ]
}
```

## Interface contracts

### `templates/catalog.ts`

```ts
export interface WorkflowTemplate {
  name: string;
  description: string;
  complexity: "small" | "medium" | "large" | "complex";
  filePath: string;
}

export class TemplateCatalog {
  constructor(skillDir?: string);
  list(): Promise<WorkflowTemplate[]>;
  show(name: string): Promise<string>;
  use(name: string, feature: string, cwd: string): Promise<{ written: string }>;
}
```

### `tasks/parser.ts`

```ts
export interface Task {
  id: string;              // "TASK-01"
  summary: string;
  requirements: string[];  // ["REQ-01", "REQ-01.1"]
  files: string[];
  dependsOn: string[];     // ["TASK-02"] or ["none"] / []
  parallel: boolean;       // true if marked [P]
  doneWhen: string;
  testCommand?: string;
  commit: string;
}

export function parseTasks(content: string): Task[];
```

### `tasks/dag.ts`

```ts
export interface DagError {
  type: "unresolved" | "cycle";
  taskId: string;
  message: string;
  cycle?: string[];
}

export interface DagResult {
  valid: boolean;
  errors: DagError[];
  layers: string[][];      // task IDs grouped by depth (each inner array is parallel-eligible)
}

export function validateDag(tasks: Task[]): DagResult;
```

### `worktree/manager.ts`

```ts
export interface Worktree {
  sprint: number;
  branch: string;
  path: string;
  status: "active" | "merged" | "failed";
}

export class WorktreeManager {
  constructor(cwd: string);
  add(sprint: number, baseBranch?: string): Promise<Worktree>;
  remove(sprint: number, force?: boolean): Promise<void>;
  list(): Promise<Worktree[]>;
  merge(sprint: number, target: string): Promise<void>;  // merges and removes
}
```

## Reuse map

- `src/state/manager.ts:1` — extend with worktree state tracking
- `src/cli.ts:14` — add subcommand routing for `templates`, `validate`, `worktree`
- `src/harness/engine.ts:1` — reuse for sensor execution inside worktrees
- `templates/SPEC.md` — existing scaffold, base for new templates

## Patterns followed (from guides)

- **TypeScript**: ESM, `.js` import suffixes, strict mode (matches existing src/)
- **Tests**: vitest co-located `*.test.ts` (matches `engine.test.ts` pattern)
- **Errors**: throw with descriptive message; CLI catches at top level
- **No defensive validation** at internal boundaries (matches existing modules)

## Contingencies

- **Worktree on Windows:** Git for Windows supports worktrees but path handling differs.
  Fallback: if `git worktree add` fails on Windows, log a clear blocker and skip
  parallelism for that layer (sequential execution still works).
- **DAG with single task:** No layering needed; behaves identically to current flow.
- **Template not found:** Clear error with list of available templates.
