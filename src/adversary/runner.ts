import type {
  AdversaryConfig,
  AdversaryFinding,
  AdversaryReport,
  AdversaryStrategy,
} from "../types.js";
import { STRATEGIES, type AdversaryContext } from "./strategies.js";
import { computeResilienceScore, deriveVerdict, SEVERITY_RANK } from "./verdict.js";

const MAX_DIFF_CHARS = 8000;
const VALID_SEVERITIES = new Set<AdversaryFinding["severity"]>(["critical", "high", "medium", "low"]);
const VALID_STRATEGIES = new Set<AdversaryStrategy>(["property-test", "mutation", "fault-inject", "edge-fuzz"]);
const VALID_VERDICTS = new Set<AdversaryReport["verdict"]>(["robust", "fragile", "broken"]);

/**
 * Builds prompts, parses sub-agent output, and gates sprint closure for the
 * red-team adversary subagent. The runner itself does NOT execute Claude — the
 * orchestrator (SKILL.md) hands the prompt to the Task tool and feeds the raw
 * response back in.
 */
export class AdversaryRunner {
  constructor(private readonly config: AdversaryConfig) {}

  /**
   * Compose the prompt handed to the adversary subagent.
   *
   * The prompt's surface vocabulary ("red team", "adversarial", "property-based",
   * "mutation testing", "fault injection") is what `src/live/classifier.ts` keys
   * on to surface this agent in the Live Agents panel.
   */
  buildPrompt(ctx: AdversaryContext): string {
    if (this.config.strategies.length === 0) {
      throw new Error("no adversary strategies enabled");
    }

    const diff = ctx.diff.length > MAX_DIFF_CHARS
      ? `${ctx.diff.slice(0, MAX_DIFF_CHARS)}\n[...truncated]`
      : ctx.diff;

    const strategyBlocks = this.config.strategies.map((s) => STRATEGIES[s].promptSection(ctx));

    return [
      "You are a red-team adversary subagent in an Autonomous Development Pipeline (ADP).",
      "Your job is to break this sprint's code through adversarial / property-based testing.",
      "",
      "Do NOT verify the contract. Assume it is met by the author.",
      "Your only goal: find inputs, mutations, or failure modes that violate behavior the",
      "contract implies but does not explicitly state, OR that the existing tests fail to cover.",
      "",
      "## Sprint diff",
      diff,
      "",
      "## Sprint contract",
      ctx.contractText,
      "",
      "## Strategies to apply",
      strategyBlocks.join("\n\n"),
      "",
      "## Output",
      "Return JSON ONLY (no commentary, no markdown fences in the body, no prose).",
      "Match this shape exactly:",
      "{",
      `  "sprintId": ${ctx.sprint.id},`,
      `  "startedAt": "<ISO timestamp>",`,
      `  "completedAt": "<ISO timestamp>",`,
      `  "strategies": ${JSON.stringify(this.config.strategies)},`,
      `  "findings": [{ "strategy": "<strategy>", "severity": "critical|high|medium|low", "title": "...", "reproduction": "...", "affectedFile": "...", "suggestedFix": "..." }],`,
      `  "resilienceScore": <0..100>,`,
      `  "verdict": "robust|fragile|broken"`,
      "}",
      "",
      "Compute resilienceScore as: 100 - sum(severity_weights), where critical=30, high=15, medium=7, low=2.",
      "Floor at 0, cap at 100. Verdict: 'broken' if any critical, 'fragile' if any high, else 'robust'.",
      "Sort findings by severity descending.",
    ].join("\n");
  }

  /**
   * Parse the adversary's raw response into a validated AdversaryReport.
   *
   * Tolerates `\`\`\`json` fences, recomputes resilienceScore and verdict when
   * absent or invalid, and never silently accepts unknown enum values.
   */
  parseReport(raw: string, sprintId: number): AdversaryReport {
    const stripped = stripJsonFences(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      const excerpt = stripped.slice(0, 200);
      throw new Error(`adversary returned unparseable JSON: ${(err as Error).message} | raw[0..200]: ${excerpt}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("adversary response is not a JSON object");
    }

    const obj = parsed as Record<string, unknown>;
    const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];
    const findings: AdversaryFinding[] = [];
    for (const f of rawFindings) {
      if (!f || typeof f !== "object") continue;
      const entry = f as Record<string, unknown>;
      const severity = entry.severity as AdversaryFinding["severity"];
      const strategy = entry.strategy as AdversaryStrategy;
      if (!VALID_SEVERITIES.has(severity)) continue;
      if (!VALID_STRATEGIES.has(strategy)) continue;
      findings.push({
        strategy,
        severity,
        title: String(entry.title ?? "(untitled)"),
        reproduction: String(entry.reproduction ?? ""),
        affectedFile: String(entry.affectedFile ?? ""),
        suggestedFix: typeof entry.suggestedFix === "string" ? entry.suggestedFix : undefined,
      });
    }

    const computedScore = computeResilienceScore(findings);
    const rawScore = typeof obj.resilienceScore === "number" ? obj.resilienceScore : null;
    const resilienceScore = rawScore !== null && rawScore >= 0 && rawScore <= 100 ? rawScore : computedScore;

    const computedVerdict = deriveVerdict(findings);
    const verdict = VALID_VERDICTS.has(obj.verdict as AdversaryReport["verdict"])
      ? (obj.verdict as AdversaryReport["verdict"])
      : computedVerdict;

    const strategies = Array.isArray(obj.strategies)
      ? obj.strategies.filter((s): s is AdversaryStrategy => VALID_STRATEGIES.has(s as AdversaryStrategy))
      : [...this.config.strategies];

    const now = new Date().toISOString();
    return {
      sprintId,
      startedAt: typeof obj.startedAt === "string" ? obj.startedAt : now,
      completedAt: typeof obj.completedAt === "string" ? obj.completedAt : now,
      strategies,
      findings,
      resilienceScore,
      verdict,
    };
  }

  /**
   * Whether the report should block sprint completion.
   *
   * Disabled config → never blocks. Otherwise: any finding whose severity rank
   * meets or exceeds `fail_on_severity` triggers a block.
   */
  shouldBlock(report: AdversaryReport): boolean {
    if (!this.config.enabled) return false;
    const threshold = SEVERITY_RANK[this.config.fail_on_severity];
    return report.findings.some((f) => SEVERITY_RANK[f.severity] >= threshold);
  }
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Convenience helper: returns the prompt and a bound `parseReport` callback.
 * Orchestrator hands `prompt` to the Task tool; pipes the response back into `parse`.
 */
export function runAdversary(
  ctx: AdversaryContext,
  config: AdversaryConfig,
): { prompt: string; parse: (raw: string) => AdversaryReport; shouldBlock: (r: AdversaryReport) => boolean } {
  const runner = new AdversaryRunner(config);
  return {
    prompt: runner.buildPrompt(ctx),
    parse: (raw: string) => runner.parseReport(raw, ctx.sprint.id),
    shouldBlock: (r: AdversaryReport) => runner.shouldBlock(r),
  };
}
