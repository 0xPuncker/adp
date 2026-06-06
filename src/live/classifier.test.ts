import { describe, it, expect } from "vitest";
import { classify } from "./classifier.js";
import type { Worktree } from "../worktree/manager.js";

const wt = (sprint: number, path: string): Worktree => ({
  sprint,
  branch: `adp/sprint-${sprint}`,
  path,
  status: "active",
});

describe("classify", () => {
  it("returns 'evaluator' when prompt mentions QA evaluator", () => {
    expect(classify("You are a QA evaluator. Grade this sprint.", null, []).type).toBe(
      "evaluator",
    );
  });

  it("matches evaluator on Grading Criteria phrasing", () => {
    expect(classify("Grading Criteria: correctness, completeness", null, []).type).toBe(
      "evaluator",
    );
  });

  it("returns 'contract-review' when prompt mentions sprint contract review", () => {
    expect(
      classify("Please review the contract for this sprint and address acceptance criteria.", null, []).type,
    ).toBe("contract-review");
  });

  it("returns 'worktree' when cwd matches an active worktree path", () => {
    const wts = [wt(3, "C:\\repo\\.adp\\worktrees\\sprint-3")];
    const result = classify("do thing", "C:\\repo\\.adp\\worktrees\\sprint-3", wts);
    expect(result.type).toBe("worktree");
    expect(result.sprintId).toBe(3);
  });

  it("normalizes path separators when matching worktrees", () => {
    const wts = [wt(7, "/repo/.adp/worktrees/sprint-7")];
    const result = classify("do thing", "\\repo\\.adp\\worktrees\\sprint-7\\src", wts);
    expect(result.type).toBe("worktree");
    expect(result.sprintId).toBe(7);
  });

  it("prefers prompt classification over worktree match", () => {
    const wts = [wt(1, "C:\\repo\\.adp\\worktrees\\sprint-1")];
    const result = classify(
      "QA evaluator — score this sprint.",
      "C:\\repo\\.adp\\worktrees\\sprint-1",
      wts,
    );
    expect(result.type).toBe("evaluator");
    expect(result.sprintId).toBeNull();
  });

  it("returns 'unknown' when nothing matches", () => {
    expect(classify("just do something", "C:\\elsewhere", []).type).toBe("unknown");
  });

  it("treats null cwd as no worktree match", () => {
    const wts = [wt(2, "C:\\repo\\.adp\\worktrees\\sprint-2")];
    expect(classify("hello", null, wts).type).toBe("unknown");
  });

  // ─── Adversary classification (REQ-05) ──────────────────────────

  it("classifies red-team adversary prompts (REQ-05.1)", () => {
    expect(classify("You are a red-team adversary", null, [])).toEqual({ type: "adversary", sprintId: null });
  });

  it("classifies on adversary vocabulary: adversarial, property-based, mutation, fault injection (REQ-05.3)", () => {
    expect(classify("Apply mutation testing to this diff", null, []).type).toBe("adversary");
    expect(classify("Propose property-based invariants for the changed functions", null, []).type).toBe("adversary");
    expect(classify("adversarial test cases please", null, []).type).toBe("adversary");
    expect(classify("Try fault injection on the API boundary", null, []).type).toBe("adversary");
    expect(classify("Generate edge-case fuzz inputs", null, []).type).toBe("adversary");
  });

  it("preserves evaluator precedence over adversary (REQ-05.2)", () => {
    const prompt = "You are a QA evaluator. Also propose property-based invariants.";
    expect(classify(prompt, null, []).type).toBe("evaluator");
  });
});
