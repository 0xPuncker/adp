import type { Task } from "./parser.js";

export interface DagError {
  type: "unresolved" | "cycle";
  taskId: string;
  message: string;
  cycle?: string[];
}

export interface DagResult {
  valid: boolean;
  errors: DagError[];
  layers: string[][];
}

/**
 * Validate the task DAG and compute parallel-eligible layers.
 *
 * Reports:
 *   - "unresolved": Depends references a task id that doesn't exist
 *   - "cycle": A → B → ... → A
 *
 * Layers are computed via Kahn's topological sort. Tasks in the same layer
 * have all dependencies satisfied by previous layers, so they can run in
 * parallel (subject to the [P] marker for actual concurrency).
 */
export function validateDag(tasks: Task[]): DagResult {
  const errors: DagError[] = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  // 1. Detect unresolved dependencies
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) {
        errors.push({
          type: "unresolved",
          taskId: task.id,
          message: `${task.id} depends on ${dep}, which does not exist`,
        });
      }
    }
  }

  // 2. Detect cycles via DFS
  const cycle = findCycle(tasks);
  if (cycle) {
    errors.push({
      type: "cycle",
      taskId: cycle[0],
      message: `Cycle detected: ${cycle.join(" → ")}`,
      cycle,
    });
  }

  // 3. Topological layers (Kahn's algorithm)
  const layers = errors.length === 0 ? topoLayers(tasks) : [];

  return {
    valid: errors.length === 0,
    errors,
    layers,
  };
}

function findCycle(tasks: Task[]): string[] | null {
  const adj = new Map<string, string[]>();
  for (const t of tasks) adj.set(t.id, t.dependsOn);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const t of tasks) color.set(t.id, WHITE);

  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    color.set(id, GRAY);
    stack.push(id);

    for (const dep of adj.get(id) ?? []) {
      if (!color.has(dep)) continue; // unresolved — handled separately
      if (color.get(dep) === GRAY) {
        const cycleStart = stack.indexOf(dep);
        return [...stack.slice(cycleStart), dep];
      }
      if (color.get(dep) === WHITE) {
        const c = visit(dep);
        if (c) return c;
      }
    }

    stack.pop();
    color.set(id, BLACK);
    return null;
  };

  for (const t of tasks) {
    if (color.get(t.id) === WHITE) {
      const c = visit(t.id);
      if (c) return c;
    }
  }
  return null;
}

function topoLayers(tasks: Task[]): string[][] {
  const inDegree = new Map<string, number>();
  const adjOut = new Map<string, string[]>();

  for (const t of tasks) {
    inDegree.set(t.id, t.dependsOn.length);
    adjOut.set(t.id, []);
  }
  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      adjOut.get(dep)?.push(t.id);
    }
  }

  const layers: string[][] = [];
  let frontier = tasks.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);

  while (frontier.length > 0) {
    layers.push([...frontier].sort());
    const next: string[] = [];
    for (const id of frontier) {
      for (const child of adjOut.get(id) ?? []) {
        const d = (inDegree.get(child) ?? 0) - 1;
        inDegree.set(child, d);
        if (d === 0) next.push(child);
      }
    }
    frontier = next;
  }

  return layers;
}
