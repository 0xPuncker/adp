export interface Task {
  id: string;
  summary: string;
  requirements: string[];
  files: string[];
  dependsOn: string[];
  parallel: boolean;
  doneWhen: string;
  testCommand?: string;
  commit: string;
}

const TASK_HEADER = /^##\s+(TASK-\d+):\s+(.+)$/;
const FIELD = /^\s*-\s*\[\s*[x ]?\s*\]\s*\*\*([\w\s-]+?):\*\*\s*(.+)$/i;

/**
 * Parse a tasks.md file into Task[].
 * Each task starts with `## TASK-NN: <summary>` and has bullet fields:
 *   - **Requirement:** REQ-01, REQ-01.1
 *   - **Files:** path/a.ts, path/b.ts
 *   - **Depends:** TASK-02 (or "none")
 *   - **Parallel:** [P]  (presence of [P] sets parallel=true)
 *   - **Done when:** ...
 *   - **Test:** ...
 *   - **Commit:** ...
 */
export function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split(/\r?\n/);

  let current: Partial<Task> | null = null;

  const finalize = () => {
    if (current && current.id && current.summary) {
      tasks.push({
        id: current.id,
        summary: current.summary,
        requirements: current.requirements ?? [],
        files: current.files ?? [],
        dependsOn: current.dependsOn ?? [],
        parallel: current.parallel ?? false,
        doneWhen: current.doneWhen ?? "",
        testCommand: current.testCommand,
        commit: current.commit ?? "",
      });
    }
    current = null;
  };

  for (const line of lines) {
    const header = line.match(TASK_HEADER);
    if (header) {
      finalize();
      current = { id: header[1], summary: header[2].trim() };
      continue;
    }

    if (!current) continue;

    const field = line.match(FIELD);
    if (!field) continue;

    const key = field[1].trim().toLowerCase();
    const value = field[2].trim();

    switch (key) {
      case "requirement":
      case "requirements":
        current.requirements = parseList(value);
        break;
      case "files":
        current.files = parseList(value);
        break;
      case "depends":
      case "depends_on":
        current.dependsOn = parseDepends(value);
        break;
      case "parallel":
        current.parallel = /\[P\]/i.test(value);
        break;
      case "done":
      case "done when":
        current.doneWhen = value;
        break;
      case "test":
        current.testCommand = value;
        break;
      case "commit":
        current.commit = value.replace(/^`(.*)`$/, "$1");
        break;
    }
  }

  finalize();
  return tasks;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s !== "—" && s !== "-");
}

function parseDepends(value: string): string[] {
  if (/^(none|—|-)$/i.test(value.trim())) return [];
  return parseList(value);
}
