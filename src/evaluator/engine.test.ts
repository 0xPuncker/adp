import { describe, it, expect } from "vitest";
import {
  buildEvaluatorPrompt,
  parseEvaluatorVerdict,
  checkThresholds,
  computeFinalScore,
  shouldRunEvaluator,
  meetsMinScore,
} from "./engine.js";
import type { EvaluatorConfig } from "../types.js";

describe("buildEvaluatorPrompt", () => {
  it("generates a prompt with criteria thresholds", () => {
    const prompt = buildEvaluatorPrompt({
      contract: "Build auth module",
      diff: "+function login() {}",
      sensorOutput: "typecheck ✓ lint ✓ test ✓",
      criteria: { correctness: 90, completeness: 85, code_quality: 80, test_coverage: 75 },
      liveTest: false,
    });

    expect(prompt).toContain("Build auth module");
    expect(prompt).toContain("Correctness (min 90)");
    expect(prompt).toContain("Completeness (min 85)");
    expect(prompt).toContain("+function login() {}");
    expect(prompt).not.toContain("live_test");
  });

  it("includes live test instructions when enabled", () => {
    const prompt = buildEvaluatorPrompt({
      contract: "Build auth",
      diff: "diff",
      sensorOutput: "ok",
      criteria: { correctness: 80, completeness: 80, code_quality: 80, test_coverage: 80 },
      liveTest: true,
      liveTestCommand: "npm run dev",
    });

    expect(prompt).toContain("npm run dev");
    expect(prompt).toContain("startup error");
  });
});

describe("parseEvaluatorVerdict", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      sprint: 1,
      verdict: "pass",
      scores: { correctness: 92, completeness: 88, code_quality: 85, test_coverage: 80 },
      issues: [],
      suggestions: ["Add more edge cases"],
    });

    const verdict = parseEvaluatorVerdict(raw);
    expect(verdict.verdict).toBe("pass");
    expect(verdict.scores.correctness).toBe(92);
    expect(verdict.suggestions).toEqual(["Add more edge cases"]);
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const raw = '```json\n{"sprint":2,"verdict":"fail","scores":{"correctness":50,"completeness":60,"code_quality":70,"test_coverage":40},"issues":["Missing validation"],"suggestions":[]}\n```';

    const verdict = parseEvaluatorVerdict(raw);
    expect(verdict.verdict).toBe("fail");
    expect(verdict.scores.correctness).toBe(50);
    expect(verdict.issues).toEqual(["Missing validation"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseEvaluatorVerdict("not json")).toThrow();
  });

  it("throws on missing scores", () => {
    expect(() => parseEvaluatorVerdict('{"verdict":"pass"}')).toThrow("missing scores");
  });
});

describe("checkThresholds", () => {
  it("passes when all scores meet thresholds", () => {
    const result = checkThresholds(
      { correctness: 92, completeness: 88, code_quality: 85, test_coverage: 80 },
      { correctness: 90, completeness: 85, code_quality: 80, test_coverage: 75 },
    );
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when a score is below threshold", () => {
    const result = checkThresholds(
      { correctness: 70, completeness: 88, code_quality: 85, test_coverage: 60 },
      { correctness: 90, completeness: 85, code_quality: 80, test_coverage: 75 },
    );
    expect(result.pass).toBe(false);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].criterion).toBe("correctness");
    expect(result.failures[1].criterion).toBe("test_coverage");
  });

  it("fails on exact boundary (< not <=)", () => {
    const result = checkThresholds(
      { correctness: 79, completeness: 80, code_quality: 80, test_coverage: 80 },
      { correctness: 80, completeness: 80, code_quality: 80, test_coverage: 80 },
    );
    expect(result.pass).toBe(false);
    expect(result.failures).toHaveLength(1);
  });

  it("passes on exact threshold", () => {
    const result = checkThresholds(
      { correctness: 80, completeness: 80, code_quality: 80, test_coverage: 80 },
      { correctness: 80, completeness: 80, code_quality: 80, test_coverage: 80 },
    );
    expect(result.pass).toBe(true);
  });
});

describe("computeFinalScore", () => {
  it("averages four criteria", () => {
    expect(computeFinalScore({ correctness: 92, completeness: 88, code_quality: 84, test_coverage: 80 })).toBe(86);
  });

  it("rounds to nearest integer", () => {
    expect(computeFinalScore({ correctness: 91, completeness: 87, code_quality: 83, test_coverage: 80 })).toBe(85);
  });
});

describe("shouldRunEvaluator", () => {
  const baseConfig: EvaluatorConfig = {
    enabled: true,
    timing: "per_sprint",
    criteria: { correctness: 80, completeness: 80, code_quality: 80, test_coverage: 80 },
    live_test: false,
  };

  it("returns false when disabled", () => {
    expect(shouldRunEvaluator({ ...baseConfig, enabled: false }, 1, "sprint")).toBe(false);
  });

  it("returns true for per_sprint in sprint mode", () => {
    expect(shouldRunEvaluator({ ...baseConfig, timing: "per_sprint" }, 1, "sprint")).toBe(true);
    expect(shouldRunEvaluator({ ...baseConfig, timing: "per_sprint" }, 10, "sprint")).toBe(true);
  });

  it("returns false for end_of_run (caller handles)", () => {
    expect(shouldRunEvaluator({ ...baseConfig, timing: "end_of_run" }, 1, "sprint")).toBe(false);
  });

  it("adaptive: per_sprint for first 3, then off", () => {
    expect(shouldRunEvaluator({ ...baseConfig, timing: "adaptive" }, 1, "sprint")).toBe(true);
    expect(shouldRunEvaluator({ ...baseConfig, timing: "adaptive" }, 3, "sprint")).toBe(true);
    expect(shouldRunEvaluator({ ...baseConfig, timing: "adaptive" }, 4, "sprint")).toBe(false);
  });

  it("returns false for continuous mode (always end_of_run)", () => {
    expect(shouldRunEvaluator({ ...baseConfig, timing: "per_sprint" }, 1, "continuous")).toBe(false);
  });
});

describe("meetsMinScore", () => {
  it("passes at or above threshold", () => {
    expect(meetsMinScore(80, 80)).toBe(true);
    expect(meetsMinScore(95, 80)).toBe(true);
  });

  it("fails below threshold", () => {
    expect(meetsMinScore(79, 80)).toBe(false);
  });
});
