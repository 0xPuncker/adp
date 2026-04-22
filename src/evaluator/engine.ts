import type {
  EvaluatorConfig,
  EvaluatorScores,
  EvaluatorVerdict,
  EvaluatorTiming,
  ExecutionMode,
} from "../types.js";

/**
 * Parameters for building an evaluator prompt.
 */
export interface EvaluatorPromptParams {
  contract: string;
  diff: string;
  sensorOutput: string;
  criteria: EvaluatorScores;
  liveTest: boolean;
  liveTestCommand?: string;
}

/**
 * Result of checking verdict against thresholds.
 */
export interface ThresholdResult {
  pass: boolean;
  failures: Array<{ criterion: string; score: number; threshold: number }>;
}

/**
 * Build the evaluator prompt from the SKILL.md template.
 * This is what gets sent to the evaluator sub-agent.
 */
export function buildEvaluatorPrompt(params: EvaluatorPromptParams): string {
  const { contract, diff, sensorOutput, criteria, liveTest, liveTestCommand } = params;

  const securityLine = criteria.security != null
    ? `\n- Security (min ${criteria.security}): No injection, XSS, secrets in code, pinned deps, safe patterns?`
    : "";
  const resilienceLine = criteria.resilience != null
    ? `\n- Resilience (min ${criteria.resilience}): Error recovery, timeouts, retries, graceful degradation?`
    : "";

  const securityScoreField = criteria.security != null ? `, "security": <0-100>` : "";
  const resilienceScoreField = criteria.resilience != null ? `, "resilience": <0-100>` : "";

  return `You are a QA evaluator. You did NOT write this code. Review it critically.

## Sprint Contract
${contract}

## Files Changed
${diff}

## Sensor Results
${sensorOutput}

## Grading Criteria (hard thresholds)
- Correctness (min ${criteria.correctness}): Does the implementation match the contract?
- Completeness (min ${criteria.completeness}): Are ALL acceptance criteria addressed?
- Code Quality (min ${criteria.code_quality}): Clean, idiomatic, follows project conventions?
- Test Coverage (min ${criteria.test_coverage}): Are important paths tested? Edge cases?${securityLine}${resilienceLine}

## Instructions
1. Read the contract carefully. Note every acceptance criterion.
2. Review every changed file against the contract. Check for gaps.${liveTest ? `
3. If live_test is enabled, run \`${liveTestCommand ?? "npm start"}\` to start the app.
   a. Test each acceptance criterion: hit the endpoint, submit the form, trigger the workflow.
   b. Test at least one error case (invalid input, missing auth, bad ID).
   c. If the app fails to start, score correctness ≤ 50 and list the startup error in issues[].` : ""}
${liveTest ? "4" : "3"}. Score each criterion 0-100. Be skeptical — do not praise mediocre work.
${liveTest ? "5" : "4"}. List concrete ISSUES (things that must be fixed to pass).
${liveTest ? "6" : "5"}. List SUGGESTIONS (improvements that won't block the sprint).
${liveTest ? "7" : "6"}. Verdict: "pass" if ALL scores >= thresholds, otherwise "fail".

Output JSON only:
{
  "sprint": <number>,
  "verdict": "pass" | "fail",
  "scores": { "correctness": <0-100>, "completeness": <0-100>, "code_quality": <0-100>, "test_coverage": <0-100>${securityScoreField}${resilienceScoreField} },
  "issues": ["..."],
  "suggestions": ["..."]
}`;
}

/**
 * Parse evaluator sub-agent output into a structured verdict.
 * Handles JSON embedded in markdown code blocks.
 */
export function parseEvaluatorVerdict(raw: string): EvaluatorVerdict {
  // Strip markdown code fences if present
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required fields
  if (!parsed.scores || typeof parsed.scores.correctness !== "number") {
    throw new Error("Invalid evaluator verdict: missing scores");
  }

  const scores: EvaluatorScores = {
    correctness: parsed.scores.correctness,
    completeness: parsed.scores.completeness ?? 0,
    code_quality: parsed.scores.code_quality ?? 0,
    test_coverage: parsed.scores.test_coverage ?? 0,
  };
  if (typeof parsed.scores.security === "number") scores.security = parsed.scores.security;
  if (typeof parsed.scores.resilience === "number") scores.resilience = parsed.scores.resilience;

  return {
    sprint: parsed.sprint ?? 0,
    verdict: parsed.verdict === "pass" ? "pass" : "fail",
    scores,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}

/**
 * Check each criterion score against the configured threshold.
 */
export function checkThresholds(
  scores: EvaluatorScores,
  criteria: EvaluatorScores,
): ThresholdResult {
  const failures: ThresholdResult["failures"] = [];

  const checks: Array<[string, number, number]> = [
    ["correctness", scores.correctness, criteria.correctness],
    ["completeness", scores.completeness, criteria.completeness],
    ["code_quality", scores.code_quality, criteria.code_quality],
    ["test_coverage", scores.test_coverage, criteria.test_coverage],
  ];

  // Check optional extended criteria only when both score and threshold exist
  if (scores.security != null && criteria.security != null) {
    checks.push(["security", scores.security, criteria.security]);
  }
  if (scores.resilience != null && criteria.resilience != null) {
    checks.push(["resilience", scores.resilience, criteria.resilience]);
  }

  for (const [criterion, score, threshold] of checks) {
    if (score < threshold) {
      failures.push({ criterion, score, threshold });
    }
  }

  return { pass: failures.length === 0, failures };
}

/**
 * Compute the final score as the average of all available criteria.
 * Base 4 criteria are always present. Security and resilience are optional.
 */
export function computeFinalScore(scores: EvaluatorScores): number {
  const values = [scores.correctness, scores.completeness, scores.code_quality, scores.test_coverage];
  if (scores.security != null) values.push(scores.security);
  if (scores.resilience != null) values.push(scores.resilience);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Determine whether to run the evaluator for a given sprint.
 */
export function shouldRunEvaluator(
  config: EvaluatorConfig,
  sprintNumber: number,
  mode: ExecutionMode,
): boolean {
  if (!config.enabled) return false;

  // Continuous mode always uses end_of_run
  if (mode === "continuous") return false; // caller handles end-of-run separately

  const timing: EvaluatorTiming = config.timing;

  switch (timing) {
    case "per_sprint":
      return true;
    case "end_of_run":
      return false; // caller handles end-of-run
    case "adaptive":
      // Per-sprint for first 3, then end-of-run
      return sprintNumber <= 3;
    default:
      return true;
  }
}

/**
 * Check if the final score meets the minimum threshold.
 */
export function meetsMinScore(score: number, minScore: number): boolean {
  return score >= minScore;
}
