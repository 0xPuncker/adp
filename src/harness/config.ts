import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import YAML from "yaml";
import type { HarnessConfig, EvaluatorConfig, SensorConfig, ActionConfig, ActionZone, AutonomyConfig, ClarifyMode, OutputMode } from "../types.js";

const execAsync = promisify(exec);

/**
 * Checks whether the `rtk` binary is available on PATH.
 * Resolves false on any error so callers never need to catch.
 */
export async function detectRtk(): Promise<boolean> {
  const cmd = process.platform === "win32" ? "where rtk" : "which rtk";
  try {
    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_EVALUATOR: EvaluatorConfig = {
  enabled: true,
  timing: "per_sprint",
  criteria: {
    correctness: 90,
    completeness: 85,
    code_quality: 85,
    test_coverage: 90,
    security: 85,
    resilience: 75,
  },
  live_test: false,
  live_test_timeout: 30,
};

const SHELL_METACHAR_RE = /[|;&$`]|&&|\|\||>>?|<(?!<)|`/;

/**
 * Returns false if the command contains shell metacharacters that could be
 * exploited via a crafted harness.yaml (command injection).
 * Rejects: |, &&, ||, ;, $(), backticks, >, >>, <
 */
export function validateSensorCommand(command: string): boolean {
  return !SHELL_METACHAR_RE.test(command);
}

/**
 * Security sensor templates per stack. Used by SKILL.md during `adp init`
 * to populate harness.yaml with stack-appropriate security sensors.
 */
export const SECURITY_SENSORS: Record<string, SensorConfig[]> = {
  typescript: [
    { name: "audit", command: "npm audit --audit-level=moderate", fix_hint: "Run npm audit fix or update vulnerable packages" },
    { name: "secret_scan", command: "npx secretlint '**/*'", fix_hint: "Remove secrets from source — use env vars or a vault" },
  ],
  rust: [
    { name: "audit", command: "cargo audit", fix_hint: "Update vulnerable crates: cargo update" },
    { name: "secret_scan", command: "npx secretlint '**/*'", fix_hint: "Remove secrets from source — use env vars or a vault" },
  ],
  python: [
    { name: "audit", command: "pip-audit", fix_hint: "Update vulnerable packages: pip install --upgrade" },
    { name: "secret_scan", command: "npx secretlint '**/*'", fix_hint: "Remove secrets from source — use env vars or a vault" },
    { name: "security_lint", command: "bandit -r . -c pyproject.toml", fix_hint: "Fix security issues flagged by bandit" },
  ],
  go: [
    { name: "audit", command: "govulncheck ./...", fix_hint: "Update vulnerable modules: go get -u" },
    { name: "secret_scan", command: "npx secretlint '**/*'", fix_hint: "Remove secrets from source — use env vars or a vault" },
  ],
};

const DEFAULT_AUTONOMY: AutonomyConfig = {
  clarify: "critical",
  output: "minimal",
};

const DEFAULT_CONFIG: HarnessConfig = {
  mode: "sprint",
  min_score: 85,
  sensors: {
    execute: {
      computational: [],
    },
  },
  evaluator: DEFAULT_EVALUATOR,
  actions: {},
  autonomy: DEFAULT_AUTONOMY,
};

/**
 * Load harness configuration from .adp/harness.yaml.
 * Supports both flat sensor format (name: {command}) and array format.
 */
export async function loadHarnessConfig(cwd: string): Promise<HarnessConfig> {
  const configPath = resolve(cwd, ".adp", "harness.yaml");
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = YAML.parse(raw);

    // Normalize sensors — handle both flat object and array formats
    let sensors: SensorConfig[] = [];
    if (parsed?.sensors?.execute?.computational) {
      sensors = (parsed.sensors.execute.computational as SensorConfig[]).filter((s) => {
        if (!validateSensorCommand(s.command)) {
          console.warn(`[adp] sensor "${s.name}" rejected: command contains shell metacharacters`);
          return false;
        }
        return true;
      });
    } else if (parsed?.sensors && parsed?.order) {
      // Flat format: sensors: { typecheck: { command: ... } } + order: [...]
      const order: string[] = parsed.order;
      sensors = order.map((name: string) => {
        const entry = parsed.sensors[name];
        return {
          name,
          command: typeof entry === "string" ? entry : entry?.command ?? "",
          timeout: entry?.timeout,
          fix_hint: entry?.fix_hint ?? entry?.description,
        };
      }).filter((s: SensorConfig) => {
        if (!s.command) return false;
        if (!validateSensorCommand(s.command)) {
          console.warn(`[adp] sensor "${s.name}" rejected: command contains shell metacharacters`);
          return false;
        }
        return true;
      });
    }

    // Normalize evaluator config
    const evalCfg = parsed?.evaluator;
    const evaluator: EvaluatorConfig = {
      enabled: evalCfg?.enabled ?? DEFAULT_EVALUATOR.enabled,
      timing: evalCfg?.timing ?? DEFAULT_EVALUATOR.timing,
      criteria: {
        correctness: evalCfg?.criteria?.correctness ?? DEFAULT_EVALUATOR.criteria.correctness,
        completeness: evalCfg?.criteria?.completeness ?? DEFAULT_EVALUATOR.criteria.completeness,
        code_quality: evalCfg?.criteria?.code_quality ?? DEFAULT_EVALUATOR.criteria.code_quality,
        test_coverage: evalCfg?.criteria?.test_coverage ?? DEFAULT_EVALUATOR.criteria.test_coverage,
        security: evalCfg?.criteria?.security ?? DEFAULT_EVALUATOR.criteria.security,
        resilience: evalCfg?.criteria?.resilience ?? DEFAULT_EVALUATOR.criteria.resilience,
      },
      live_test: evalCfg?.live_test ?? DEFAULT_EVALUATOR.live_test,
      live_test_command: evalCfg?.live_test_command,
      live_test_timeout: typeof evalCfg?.live_test_timeout === "number"
        ? evalCfg.live_test_timeout
        : DEFAULT_EVALUATOR.live_test_timeout,
    };

    // Normalize actions
    const actions: Record<string, ActionConfig> = {};
    if (parsed?.actions && typeof parsed.actions === "object") {
      for (const [name, cfg] of Object.entries(parsed.actions)) {
        const entry = cfg as Record<string, unknown>;
        if (entry?.command) {
          const cmd = String(entry.command);
          if (!validateSensorCommand(cmd)) {
            console.warn(`[adp] action "${name}" rejected: command contains shell metacharacters`);
            continue;
          }
          actions[name] = {
            command: cmd,
            zone: (entry.zone as ActionZone) ?? "gated",
            auto_approve: Boolean(entry.auto_approve ?? false),
            depends_on: Array.isArray(entry.depends_on) ? entry.depends_on : undefined,
          };
        }
      }
    }

    // Normalize autonomy config
    const autoCfg = parsed?.autonomy;
    const VALID_CLARIFY = new Set<ClarifyMode>(["never", "critical", "always"]);
    const VALID_OUTPUT = new Set<OutputMode>(["minimal", "verbose"]);
    const autonomy: AutonomyConfig = {
      clarify: VALID_CLARIFY.has(autoCfg?.clarify) ? autoCfg.clarify : DEFAULT_AUTONOMY.clarify,
      output: VALID_OUTPUT.has(autoCfg?.output) ? autoCfg.output : DEFAULT_AUTONOMY.output,
    };

    return {
      mode: parsed?.mode ?? "sprint",
      min_score: parsed?.min_score ?? 80,
      rtk_enabled: parsed?.rtk_enabled === true,
      sensors: {
        execute: { computational: sensors },
      },
      evaluator,
      actions,
      autonomy,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
