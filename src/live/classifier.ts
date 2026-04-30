import type { Worktree } from "../worktree/manager.js";
import type { SubagentClassification } from "./types.js";

export interface Classified {
  type: SubagentClassification;
  sprintId: number | null;
}

const PATTERNS: ReadonlyArray<{ type: SubagentClassification; regex: RegExp }> = [
  { type: "evaluator", regex: /QA evaluator|Grading Criteria|Output JSON only|EvaluatorVerdict/i },
  {
    type: "contract-review",
    regex: /sprint contract|review the contract|contract review|address acceptance criteria/i,
  },
];

/**
 * Classify a sub-agent invocation by its initial prompt and (optionally) cwd.
 *
 * Decision order:
 *   1. Prompt regex match wins (evaluator > contract-review).
 *   2. If the cwd points inside an active worktree path, classify as "worktree"
 *      and surface that worktree's sprint id.
 *   3. Otherwise "unknown".
 *
 * The `sprintId` field is null unless the classification gives us a concrete sprint
 * (currently only the worktree branch).
 */
export function classify(
  prompt: string,
  cwd: string | null,
  worktrees: Worktree[],
): Classified {
  const text = prompt ?? "";
  for (const { type, regex } of PATTERNS) {
    if (regex.test(text)) return { type, sprintId: null };
  }
  if (cwd) {
    const normalized = cwd.replace(/\\/g, "/");
    const wt = worktrees.find((w) => normalized.includes(w.path.replace(/\\/g, "/")));
    if (wt) return { type: "worktree", sprintId: wt.sprint };
  }
  return { type: "unknown", sprintId: null };
}
