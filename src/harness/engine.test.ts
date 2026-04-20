import { describe, it, expect, vi } from "vitest";
import { HarnessEngine } from "./engine.js";

describe("HarnessEngine", () => {
  it("runSensor passes on exit code 0", async () => {
    const engine = new HarnessEngine();
    const result = await engine.runSensor({
      name: "echo",
      command: "echo ok",
      timeout: 5000,
    });
    expect(result.passed).toBe(true);
    expect(result.name).toBe("echo");
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("runSensor fails on exit code non-zero", async () => {
    const engine = new HarnessEngine();
    const result = await engine.runSensor({
      name: "fail",
      command: "exit 1",
      timeout: 5000,
      fix_hint: "Fix it",
    });
    expect(result.passed).toBe(false);
    expect(result.fix_hint).toBe("Fix it");
  });

  it("runSensor captures output", async () => {
    const engine = new HarnessEngine();
    const result = await engine.runSensor({
      name: "output",
      command: "echo hello-world",
      timeout: 5000,
    });
    expect(result.output).toContain("hello-world");
  });
});
