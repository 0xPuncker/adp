import { describe, it, expect } from "vitest";
import { AdversaryRunner, runAdversary } from "./runner.js";
import { computeResilienceScore, deriveVerdict } from "./verdict.js";
import type { AdversaryConfig, AdversaryFinding, Sprint } from "../types.js";

const baseConfig: AdversaryConfig = {
  enabled: true,
  strategies: ["property-test"],
  timeout_ms: 60_000,
  fail_on_severity: "high",
  parallel: true,
};

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 7,
    task: "TASK-07 add merge",
    status: "qa",
    contract: "merge two sorted lists",
    score: null,
    evaluator_scores: null,
    requirements: ["REQ-merge"],
    commit: null,
    cost: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<{ diff: string; contractText: string; changedFiles: string[]; testFiles: string[] }> = {}): Parameters<AdversaryRunner["buildPrompt"]>[0] {
  return {
    sprint: makeSprint(),
    diff: overrides.diff ?? "diff --git a/src/merge.ts b/src/merge.ts\n+export function merge() {}\n",
    contractText: overrides.contractText ?? "merge two sorted lists, preserving order",
    changedFiles: overrides.changedFiles ?? ["src/merge.ts"],
    testFiles: overrides.testFiles ?? ["src/merge.test.ts"],
  };
}

describe("AdversaryRunner.buildPrompt", () => {
  it("includes diff, contract, and the property-test instruction (REQ-02.1)", () => {
    const runner = new AdversaryRunner(baseConfig);
    const prompt = runner.buildPrompt(makeCtx());
    expect(prompt).toContain("merge two sorted lists, preserving order");
    expect(prompt).toContain("export function merge()");
    expect(prompt).toContain("Property-based test synthesis");
    expect(prompt).toContain("3 invariants");
  });

  it("truncates diffs longer than 8000 chars (REQ-02.2)", () => {
    const runner = new AdversaryRunner(baseConfig);
    const bigDiff = "x".repeat(9000);
    const prompt = runner.buildPrompt(makeCtx({ diff: bigDiff }));
    expect(prompt).toContain("[...truncated]");
    expect(prompt.length).toBeLessThan(bigDiff.length + 4000);
  });

  it("throws when no strategies are enabled (REQ-02.3)", () => {
    const runner = new AdversaryRunner({ ...baseConfig, strategies: [] });
    expect(() => runner.buildPrompt(makeCtx())).toThrow(/no adversary strategies/i);
  });

  it("instructs the subagent to return JSON only matching AdversaryReport (REQ-02.4)", () => {
    const runner = new AdversaryRunner(baseConfig);
    const prompt = runner.buildPrompt(makeCtx());
    expect(prompt).toContain("Return JSON ONLY");
    expect(prompt).toContain("\"sprintId\"");
    expect(prompt).toContain("\"findings\"");
    expect(prompt).toContain("\"resilienceScore\"");
    expect(prompt).toContain("\"verdict\"");
  });
});

describe("AdversaryRunner.parseReport", () => {
  const runner = new AdversaryRunner(baseConfig);

  it("parses a valid JSON report (REQ-03.1)", () => {
    const raw = JSON.stringify({
      sprintId: 7,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      strategies: ["property-test"],
      findings: [
        { strategy: "property-test", severity: "medium", title: "off-by-one", reproduction: "[1]", affectedFile: "src/merge.ts" },
      ],
      resilienceScore: 93,
      verdict: "robust",
    });
    const report = runner.parseReport(raw, 7);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].severity).toBe("medium");
    expect(report.resilienceScore).toBe(93);
    expect(report.verdict).toBe("robust");
  });

  it("strips ```json fences before parsing (REQ-03.2)", () => {
    const raw = "```json\n" + JSON.stringify({ findings: [] }) + "\n```";
    const report = runner.parseReport(raw, 1);
    expect(report.findings).toEqual([]);
    expect(report.verdict).toBe("robust");
  });

  it("returns verdict 'robust' with empty findings when findings is missing (REQ-03.3)", () => {
    const raw = JSON.stringify({ sprintId: 1 });
    const report = runner.parseReport(raw, 1);
    expect(report.findings).toEqual([]);
    expect(report.verdict).toBe("robust");
    expect(report.resilienceScore).toBe(100);
  });

  it("recomputes resilienceScore from severity weights when absent (REQ-03.4)", () => {
    const raw = JSON.stringify({
      findings: [
        { strategy: "property-test", severity: "high", title: "x", reproduction: "y", affectedFile: "z" },
        { strategy: "property-test", severity: "medium", title: "x", reproduction: "y", affectedFile: "z" },
      ],
    });
    const report = runner.parseReport(raw, 1);
    expect(report.resilienceScore).toBe(100 - 15 - 7);
    expect(report.verdict).toBe("fragile");
  });

  it("throws with the raw excerpt on unparseable input (REQ-03.5)", () => {
    expect(() => runner.parseReport("not json {{{", 1)).toThrow(/unparseable JSON.*not json/);
  });

  it("filters findings with invalid severity or strategy", () => {
    const raw = JSON.stringify({
      findings: [
        { strategy: "property-test", severity: "high", title: "ok", reproduction: "r", affectedFile: "f" },
        { strategy: "property-test", severity: "catastrophic", title: "bad-severity", reproduction: "r", affectedFile: "f" },
        { strategy: "not-real", severity: "high", title: "bad-strategy", reproduction: "r", affectedFile: "f" },
      ],
    });
    const report = runner.parseReport(raw, 1);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].title).toBe("ok");
  });
});

describe("AdversaryRunner.shouldBlock", () => {
  it("blocks when finding severity meets threshold (REQ-04.1)", () => {
    const runner = new AdversaryRunner({ ...baseConfig, fail_on_severity: "high" });
    const findings: AdversaryFinding[] = [
      { strategy: "property-test", severity: "high", title: "x", reproduction: "y", affectedFile: "z" },
    ];
    expect(runner.shouldBlock(reportWith(findings))).toBe(true);
  });

  it("does not block when no findings exist (REQ-04.2)", () => {
    const runner = new AdversaryRunner(baseConfig);
    expect(runner.shouldBlock(reportWith([]))).toBe(false);
  });

  it("never blocks when gate is disabled (REQ-04.3)", () => {
    const runner = new AdversaryRunner({ ...baseConfig, enabled: false });
    const findings: AdversaryFinding[] = [
      { strategy: "property-test", severity: "critical", title: "x", reproduction: "y", affectedFile: "z" },
    ];
    expect(runner.shouldBlock(reportWith(findings))).toBe(false);
  });

  it("respects threshold ordering: medium-only findings do not block at fail_on_severity=high", () => {
    const runner = new AdversaryRunner({ ...baseConfig, fail_on_severity: "high" });
    const findings: AdversaryFinding[] = [
      { strategy: "property-test", severity: "medium", title: "x", reproduction: "y", affectedFile: "z" },
      { strategy: "property-test", severity: "low", title: "x", reproduction: "y", affectedFile: "z" },
    ];
    expect(runner.shouldBlock(reportWith(findings))).toBe(false);
  });
});

describe("verdict helpers", () => {
  it("computeResilienceScore floors at 0 with many critical findings", () => {
    const findings: AdversaryFinding[] = Array.from({ length: 5 }, () => ({
      strategy: "property-test",
      severity: "critical",
      title: "x",
      reproduction: "y",
      affectedFile: "z",
    }));
    expect(computeResilienceScore(findings)).toBe(0);
  });

  it("deriveVerdict prefers 'broken' over 'fragile'", () => {
    const findings: AdversaryFinding[] = [
      { strategy: "property-test", severity: "high", title: "x", reproduction: "y", affectedFile: "z" },
      { strategy: "property-test", severity: "critical", title: "x", reproduction: "y", affectedFile: "z" },
    ];
    expect(deriveVerdict(findings)).toBe("broken");
  });
});

describe("runAdversary helper", () => {
  it("returns prompt + parse + shouldBlock bound to the sprint", () => {
    const handle = runAdversary(makeCtx(), baseConfig);
    expect(handle.prompt).toContain("Property-based test synthesis");
    const report = handle.parse(JSON.stringify({ findings: [] }));
    expect(report.sprintId).toBe(7);
    expect(handle.shouldBlock(report)).toBe(false);
  });
});

function reportWith(findings: AdversaryFinding[]): import("../types.js").AdversaryReport {
  return {
    sprintId: 1,
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:01:00Z",
    strategies: ["property-test"],
    findings,
    resilienceScore: computeResilienceScore(findings),
    verdict: deriveVerdict(findings),
  };
}
