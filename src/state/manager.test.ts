import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "./manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
});
