import { describe, it, expect } from "vitest";
import { HarnessEngine, stripAnsi } from "./engine.js";
import { validateSensorCommand, loadHarnessConfig } from "./config.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SensorChunk } from "../live/types.js";

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

describe("validateSensorCommand", () => {
  it("accepts clean commands", () => {
    expect(validateSensorCommand("tsc --noEmit")).toBe(true);
    expect(validateSensorCommand("npm run lint")).toBe(true);
    expect(validateSensorCommand("cargo test")).toBe(true);
    expect(validateSensorCommand("npx secretlint '**/*'")).toBe(true);
  });

  it("rejects pipe metacharacter", () => {
    expect(validateSensorCommand("tsc | grep error")).toBe(false);
  });

  it("rejects && chaining", () => {
    expect(validateSensorCommand("npm test && rm -rf dist")).toBe(false);
  });

  it("rejects || chaining", () => {
    expect(validateSensorCommand("npm test || exit 0")).toBe(false);
  });

  it("rejects semicolon", () => {
    expect(validateSensorCommand("npm test; echo done")).toBe(false);
  });

  it("rejects $() substitution", () => {
    expect(validateSensorCommand("echo $(whoami)")).toBe(false);
  });

  it("rejects backtick substitution", () => {
    expect(validateSensorCommand("echo `whoami`")).toBe(false);
  });

  it("rejects output redirect >", () => {
    expect(validateSensorCommand("npm test > /tmp/out")).toBe(false);
  });

  it("rejects input redirect <", () => {
    expect(validateSensorCommand("wc -l < file.txt")).toBe(false);
  });
});

describe("loadHarnessConfig — live_test_timeout", () => {
  it("defaults live_test_timeout to 30 when absent", async () => {
    const dir = join(tmpdir(), `adp-test-${Date.now()}`);
    await mkdir(join(dir, ".adp"), { recursive: true });
    await writeFile(join(dir, ".adp", "harness.yaml"), "mode: sprint\n");
    const cfg = await loadHarnessConfig(dir);
    expect(cfg.evaluator.live_test_timeout).toBe(30);
    await rm(dir, { recursive: true });
  });

  it("parses live_test_timeout from yaml", async () => {
    const dir = join(tmpdir(), `adp-test-${Date.now()}`);
    await mkdir(join(dir, ".adp"), { recursive: true });
    await writeFile(join(dir, ".adp", "harness.yaml"), "evaluator:\n  live_test_timeout: 60\n");
    const cfg = await loadHarnessConfig(dir);
    expect(cfg.evaluator.live_test_timeout).toBe(60);
    await rm(dir, { recursive: true });
  });
});

describe("loadHarnessConfig — sensor command validation", () => {
  it("omits sensors with shell metacharacters", async () => {
    const dir = join(tmpdir(), `adp-test-${Date.now()}`);
    await mkdir(join(dir, ".adp"), { recursive: true });
    const yaml = [
      "sensors:",
      "  good: { command: 'tsc --noEmit' }",
      "  bad:  { command: 'tsc | grep error' }",
      "order: [good, bad]",
    ].join("\n");
    await writeFile(join(dir, ".adp", "harness.yaml"), yaml);
    const cfg = await loadHarnessConfig(dir);
    const names = cfg.sensors.execute.computational.map((s) => s.name);
    expect(names).toContain("good");
    expect(names).not.toContain("bad");
    await rm(dir, { recursive: true });
  });
});

describe("stripAnsi", () => {
  it("removes color escapes", () => {
    expect(stripAnsi("\x1B[31mred\x1B[0m text")).toBe("red text");
  });

  it("leaves plain text unchanged", () => {
    expect(stripAnsi("plain")).toBe("plain");
  });
});

describe("HarnessEngine.runSensorStreaming", () => {
  it("emits chunks as the process writes and returns success on exit 0", async () => {
    const engine = new HarnessEngine();
    const chunks: SensorChunk[] = [];
    const result = await engine.runSensorStreaming(
      { name: "stream-ok", command: "echo a && echo b", timeout: 5000 },
      (c) => chunks.push(c),
    );
    expect(result.passed).toBe(true);
    expect(result.name).toBe("stream-ok");
    expect(chunks.length).toBeGreaterThan(0);
    const combined = chunks.map((c) => c.text).join("");
    expect(combined).toMatch(/a/);
    expect(combined).toMatch(/b/);
    expect(chunks.every((c) => c.sensor === "stream-ok")).toBe(true);
  });

  it("returns passed=false when the command exits non-zero", async () => {
    const engine = new HarnessEngine();
    const chunks: SensorChunk[] = [];
    const result = await engine.runSensorStreaming(
      { name: "stream-fail", command: "exit 1", timeout: 5000, fix_hint: "fix" },
      (c) => chunks.push(c),
    );
    expect(result.passed).toBe(false);
    expect(result.fix_hint).toBe("fix");
  });

  it("times out long-running sensors via the timeout option", async () => {
    const engine = new HarnessEngine();
    const cmd = `node -e "setInterval(()=>{},1000)"`;
    const start = Date.now();
    const result = await engine.runSensorStreaming(
      { name: "timeout", command: cmd, timeout: 300 },
      () => {},
    );
    expect(Date.now() - start).toBeLessThan(3000);
    expect(result.passed).toBe(false);
  }, 10_000);

  it("aborts the running child when the AbortSignal fires", async () => {
    const engine = new HarnessEngine();
    const ac = new AbortController();
    const cmd = `node -e "setInterval(()=>{},1000)"`;
    const start = Date.now();
    const promise = engine.runSensorStreaming(
      { name: "abort", command: cmd, timeout: 30_000 },
      () => {},
      ac.signal,
    );
    setTimeout(() => ac.abort(), 100);
    const result = await promise;
    expect(Date.now() - start).toBeLessThan(3000);
    expect(result.passed).toBe(false);
  }, 10_000);

  it("strips ANSI codes from streamed text", async () => {
    const engine = new HarnessEngine();
    const chunks: SensorChunk[] = [];
    // Use printf-style escape via node so it's portable across shells.
    const cmd = `node -e "process.stdout.write('\\u001b[31mred\\u001b[0m')"`;
    await engine.runSensorStreaming(
      { name: "ansi", command: cmd, timeout: 10_000 },
      (c) => chunks.push(c),
    );
    const combined = chunks.map((c) => c.text).join("");
    expect(combined).not.toMatch(/\x1B\[/);
    expect(combined).toMatch(/red/);
  });
});
