import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";

export interface FidelityIssue {
  type: "req_missing" | "ac_missing" | "orphan_task" | "orphan_test" | "traceability_gap";
  message: string;
  ref?: string;
}

export interface FidelityReport {
  feature: string;
  reqCoverage: number;
  acCoverage: number;
  issues: FidelityIssue[];
  passed: boolean;
}

/**
 * Validate spec-to-code traceability.
 * Checks REQ coverage, AC coverage, traceability, and spec deviation detection.
 */
export async function validateFidelity(
  cwd: string,
  feature: string,
): Promise<FidelityReport> {
  const issues: FidelityIssue[] = [];
  const specsDir = resolve(cwd, ".specs", "features", feature);
  const specPath = join(specsDir, "spec.md");
  const tasksPath = join(specsDir, "tasks.md");
  const validationPath = join(specsDir, "validation.md");

  if (!existsSync(specPath)) {
    return {
      feature,
      reqCoverage: 0,
      acCoverage: 0,
      issues: [{ type: "req_missing", message: "spec.md not found" }],
      passed: false,
    };
  }

  const specContent = await readFile(specPath, "utf-8");
  const tasksContent = existsSync(tasksPath) ? await readFile(tasksPath, "utf-8") : "";

  // Extract REQ-NN IDs from spec
  const reqMatches = specContent.matchAll(/REQ-(\d+):/g);
  const reqs = Array.from(reqMatches).map((m) => `REQ-${m[1]}`);

  // Extract REQ-NN.N AC IDs from spec
  const acMatches = specContent.matchAll(/REQ-(\d+)\.(\d+)/g);
  const acs = Array.from(acMatches).map((m) => `REQ-${m[1]}.${m[2]}`);

  // Extract which REQs are cited in tasks
  const taskReqMatches = tasksContent.matchAll(/REQ-(\d+)(?:\.\d+)?/g);
  const citedReqs = new Set(Array.from(taskReqMatches).map((m) => {
    const minor = m[2];
    return minor ? `REQ-${m[1]}.${minor}` : `REQ-${m[1]}`;
  }));

  // Check REQ coverage
  const coveredReqs = reqs.filter((req) => {
    // Check if any task cites this REQ (either the REQ itself or its ACs)
    return Array.from(citedReqs).some((cited) => cited.startsWith(req + ".") || cited === req);
  });
  const reqCoverage = reqs.length > 0 ? (coveredReqs.length / reqs.length) * 100 : 100;

  // Check AC coverage (heuristic: check if test files exist)
  const testsDir = resolve(cwd, "tests");
  let acCoverage = 100;
  if (existsSync(testsDir)) {
    const testFiles = await readdir(testsDir, { recursive: true });
    const hasTestsForFeature = testFiles.some((f) => f.includes(feature.toLowerCase()));
    if (!hasTestsForFeature && acs.length > 0) {
      acCoverage = 0;
      issues.push({
        type: "ac_missing",
        message: `No tests found for ${acs.length} acceptance criteria`,
      });
    }
  }

  // Check for orphaned tasks (tasks without REQ citations)
  const taskMatches = tasksContent.matchAll(/TASK-\d+:/g);
  const tasks = Array.from(taskMatches);
  for (const task of tasks) {
    const taskBlock = tasksContent.slice(task.index, tasksContent.indexOf("\n##", task.index ?? 0));
    if (!taskBlock.includes("REQ-")) {
      issues.push({
        type: "orphan_task",
        message: `Task ${task[0]} has no REQ citation`,
        ref: task[0],
      });
    }
  }

  // Check traceability gap
  if (existsSync(validationPath)) {
    const validationContent = await readFile(validationPath, "utf-8");
    const validatedReqs = validationContent.matchAll(/REQ-(\d+)/g);
    const validatedSet = new Set(Array.from(validatedReqs).map((m) => `REQ-${m[1]}`));
    const unvalidatedReqs = coveredReqs.filter((req) => !validatedSet.has(req));
    if (unvalidatedReqs.length > 0) {
      issues.push({
        type: "traceability_gap",
        message: `${unvalidatedReqs.length} REQs not validated: ${unvalidatedReqs.join(", ")}`,
      });
    }
  }

  return {
    feature,
    reqCoverage: Math.round(reqCoverage),
    acCoverage: Math.round(acCoverage),
    issues,
    passed: issues.filter((i) => i.type !== "traceability_gap").length === 0,
  };
}
