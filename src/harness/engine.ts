import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { SensorConfig, HarnessConfig } from "../types.js";
import { loadHarnessConfig } from "./config.js";

const execAsync = promisify(exec);

export interface SensorResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  output: string;
  fix_hint?: string;
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
        output: (stdout + stderr).slice(0, 2000),
      };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return {
        name: sensor.name,
        passed: false,
        duration_ms: Date.now() - start,
        output: ((e.stdout ?? "") + (e.stderr ?? "")).slice(0, 2000) || e.message || "Unknown error",
        fix_hint: sensor.fix_hint,
      };
    }
  }

  /**
   * Check if all sensors pass.
   */
  async allPassing(): Promise<boolean> {
    const results = await this.runSensors();
    return results.every((r) => r.passed);
  }
}
