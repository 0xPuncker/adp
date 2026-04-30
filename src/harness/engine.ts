import { exec, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import type { SensorConfig, HarnessConfig } from "../types.js";
import type { SensorChunk } from "../live/types.js";
import { loadHarnessConfig } from "./config.js";

const execAsync = promisify(exec);

/**
 * Cross-platform tree kill. On Windows, shell:true wraps the real command in cmd.exe,
 * so a plain `child.kill()` only takes out the wrapper and the child keeps running.
 * `taskkill /T /F` kills the whole tree.
 */
function killTree(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
  } else {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
}

export interface SensorResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  output: string;
  fix_hint?: string;
}

const MAX_OUTPUT = 2000;

// CSI escapes (color, cursor moves) — safe to strip from sensor logs.
const ANSI_REGEX = /\x1B\[[0-?]*[ -/]*[@-~]/g;

/**
 * Strip ANSI escape codes so streamed sensor output renders cleanly in Ink panels.
 */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

/**
 * Executes harness sensors (feedback controls).
 * Reads .adp/harness.yaml and runs each configured command.
 */
export class HarnessEngine {
  private config: HarnessConfig | null = null;
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  async loadConfig(): Promise<HarnessConfig> {
    if (!this.config) {
      this.config = await loadHarnessConfig(this.cwd);
    }
    return this.config;
  }

  /**
   * Run all configured sensors. Returns results array.
   */
  async runSensors(): Promise<SensorResult[]> {
    const config = await this.loadConfig();
    const sensors = config.sensors.execute.computational;
    const results: SensorResult[] = [];

    for (const sensor of sensors) {
      const result = await this.runSensor(sensor);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single sensor command.
   */
  async runSensor(sensor: SensorConfig): Promise<SensorResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync(sensor.command, {
        timeout: sensor.timeout ?? 60_000,
        cwd: this.cwd,
      });
      return {
        name: sensor.name,
        passed: true,
        duration_ms: Date.now() - start,
        output: (stdout + stderr).slice(0, MAX_OUTPUT),
      };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return {
        name: sensor.name,
        passed: false,
        duration_ms: Date.now() - start,
        output: ((e.stdout ?? "") + (e.stderr ?? "")).slice(0, MAX_OUTPUT) || e.message || "Unknown error",
        fix_hint: sensor.fix_hint,
      };
    }
  }

  /**
   * Stream-aware variant of `runSensors`.
   * Emits a SensorChunk for each stdout/stderr fragment as it arrives, then resolves with
   * the same SensorResult[] shape as runSensors so callers can use either API interchangeably.
   *
   * Pass `signal` to abort the in-flight sensor — its child process is killed and the loop stops.
   */
  async runSensorsStreaming(
    onChunk: (chunk: SensorChunk) => void,
    signal?: AbortSignal,
  ): Promise<SensorResult[]> {
    const config = await this.loadConfig();
    const sensors = config.sensors.execute.computational;
    const results: SensorResult[] = [];

    for (const sensor of sensors) {
      if (signal?.aborted) break;
      const result = await this.runSensorStreaming(sensor, onChunk, signal);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single sensor with streamed stdout/stderr. Public so the live UI can replay
   * one sensor without invoking the full sweep (e.g., on retry of a single failing gate).
   */
  async runSensorStreaming(
    sensor: SensorConfig,
    onChunk: (chunk: SensorChunk) => void,
    signal?: AbortSignal,
  ): Promise<SensorResult> {
    const start = Date.now();
    return new Promise<SensorResult>((resolveP) => {
      const child = spawn(sensor.command, {
        shell: true,
        cwd: this.cwd,
        env: process.env,
      });

      let buffer = "";
      let stderrBuffer = "";
      const timeoutMs = sensor.timeout ?? 60_000;
      const timer = setTimeout(() => {
        killTree(child);
      }, timeoutMs);

      const abortHandler = (): void => {
        killTree(child);
      };
      if (signal) signal.addEventListener("abort", abortHandler, { once: true });

      const handle = (raw: Buffer | string, stream: "stdout" | "stderr"): void => {
        const text = stripAnsi(raw.toString());
        if (stream === "stdout") buffer += text;
        else stderrBuffer += text;
        onChunk({
          sensor: sensor.name,
          stream,
          text,
          timestamp: new Date().toISOString(),
        });
      };

      child.stdout.on("data", (d) => handle(d, "stdout"));
      child.stderr.on("data", (d) => handle(d, "stderr"));

      child.on("error", (err) => {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", abortHandler);
        resolveP({
          name: sensor.name,
          passed: false,
          duration_ms: Date.now() - start,
          output: ((buffer + stderrBuffer) || err.message).slice(0, MAX_OUTPUT),
          fix_hint: sensor.fix_hint,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", abortHandler);
        const passed = code === 0;
        resolveP({
          name: sensor.name,
          passed,
          duration_ms: Date.now() - start,
          output: (buffer + stderrBuffer).slice(0, MAX_OUTPUT),
          ...(passed ? {} : { fix_hint: sensor.fix_hint }),
        });
      });
    });
  }

  /**
   * Check if all sensors pass.
   */
  async allPassing(): Promise<boolean> {
    const results = await this.runSensors();
    return results.every((r) => r.passed);
  }
}
