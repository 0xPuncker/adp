import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "./manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AdversaryReport } from "../types.js";

describe("StateManager", () => {
  let dir: string;
  let manager: StateManager;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "adp-test-"));
    manager = new StateManager(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it("loads empty state when no file exists", async () => {
    const state = await manager.load();
    expect(state.status).toBe("idle");
    expect(state.sprints).toEqual([]);
  });

  it("starts pipeline", async () => {
    await manager.startPipeline("auth", "large");
    const state = await manager.load();
    expect(state.status).toBe("running");
    expect(state.feature).toBe("auth");
    expect(state.complexity).toBe("large");
    expect(state.phase).toBe("specify");
    expect(state.startedAt).not.toBeNull();
  });

  it("records the active feature branch", async () => {
    await manager.startPipeline("auth", "medium");
    await manager.setBranch("feat/auth");

    const state = await manager.load();
    expect(state.branch).toBe("feat/auth");
  });

  it("starts and completes a sprint", async () => {
    await manager.startPipeline("auth", "medium");
    const sprint = await manager.startSprint("TASK-01 Setup", "Create middleware skeleton");
    expect(sprint.id).toBe(1);
    expect(sprint.status).toBe("contract");

    await manager.updateSprint(1, { status: "done", score: 92 });
    const state = await manager.load();
    expect(state.sprints[0].status).toBe("done");
    expect(state.sprints[0].score).toBe(92);
    expect(state.sprints[0].completedAt).not.toBeNull();
  });

  it("logs activity", async () => {
    await manager.startPipeline("feat", "small");
    const state = await manager.load();
    expect(state.activity.length).toBeGreaterThan(0);
    expect(state.activity[0].type).toBe("info");
  });

  it("adds blocker", async () => {
    await manager.startPipeline("feat", "small");
    await manager.addBlocker("TASK-01", "test", "2 failures");
    const state = await manager.load();
    expect(state.status).toBe("blocked");
    expect(state.blockers).toHaveLength(1);
    expect(state.blockers[0].sensor).toBe("test");
  });

  it("attaches adversary report to sprint (REQ-06.1, REQ-06.4)", async () => {
    await manager.startPipeline("feat", "small");
    const sprint = await manager.startSprint("TASK-01", "do something");
    const report: AdversaryReport = {
      sprintId: sprint.id,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      strategies: ["property-test"],
      findings: [],
      resilienceScore: 85,
      verdict: "robust",
    };
    await manager.attachAdversaryReport(sprint.id, report);
    const state = await manager.load();
    expect(state.sprints[0].adversary).toEqual(report);
    // Persist roundtrip
    const reloaded = await new StateManager(dir).load();
    expect(reloaded.sprints[0].adversary).toEqual(report);
  });

  it("overwrites evaluator_scores.resilience when report has resilienceScore (REQ-06.2)", async () => {
    await manager.startPipeline("feat", "small");
    const sprint = await manager.startSprint("TASK-01", "do something");
    await manager.updateSprint(sprint.id, {
      evaluator_scores: {
        correctness: 90,
        completeness: 85,
        code_quality: 80,
        test_coverage: 75,
        resilience: 70, // self-assessed
      },
    });
    const report: AdversaryReport = {
      sprintId: sprint.id,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      strategies: ["property-test"],
      findings: [],
      resilienceScore: 55, // adversary found issues
      verdict: "fragile",
    };
    await manager.attachAdversaryReport(sprint.id, report);
    const state = await manager.load();
    expect(state.sprints[0].evaluator_scores?.resilience).toBe(55);
  });

  it("initializes evaluator_scores when missing before setting resilience", async () => {
    await manager.startPipeline("feat", "small");
    const sprint = await manager.startSprint("TASK-01", "do thing");
    const report: AdversaryReport = {
      sprintId: sprint.id,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      strategies: ["property-test"],
      findings: [],
      resilienceScore: 90,
      verdict: "robust",
    };
    await manager.attachAdversaryReport(sprint.id, report);
    const state = await manager.load();
    expect(state.sprints[0].evaluator_scores).toBeDefined();
    expect(state.sprints[0].evaluator_scores?.resilience).toBe(90);
  });

  it("is a no-op when sprint id does not exist (REQ-06.3)", async () => {
    await manager.startPipeline("feat", "small");
    const report: AdversaryReport = {
      sprintId: 999,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      strategies: ["property-test"],
      findings: [],
      resilienceScore: 100,
      verdict: "robust",
    };
    await expect(manager.attachAdversaryReport(999, report)).resolves.not.toThrow();
    const state = await manager.load();
    expect(state.sprints).toHaveLength(0);
  });
});
