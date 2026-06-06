import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import YAML from "yaml";
import type { HarnessConfig, EvaluatorConfig, SensorConfig, ActionConfig, ActionZone, AutonomyConfig, ClarifyMode, OutputMode, AdversaryConfig, AdversaryStrategy, AdversarySeverity } from "../types.js";

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

const VALID_STRATEGIES = new Set<AdversaryStrategy>(["property-test", "mutation", "fault-inject", "edge-fuzz"]);
const VALID_SEVERITIES = new Set<AdversarySeverity>(["critical", "high", "medium", "low"]);

const DEFAULT_ADVERSARY: AdversaryConfig = {
  enabled: false,
  strategies: ["property-test"],
  timeout_ms: 180_000,
  fail_on_severity: "high",
  parallel: true,
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
  adversary: DEFAULT_ADVERSARY,
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

    // Linear integration validation
    const linear_enabled = parsed?.linear_enabled === true;
    if (linear_enabled && !process.env.LINEAR_API_KEY) {
      throw new Error(
        "[adp] linear_enabled is true but LINEAR_API_KEY is not set. " +
        "Export LINEAR_API_KEY before running ADP, or run `adp linear off` to disable."
      );
    }

    const advCfg = parsed?.adversary;
    const adversary: AdversaryConfig = normalizeAdversary(advCfg);

    return {
      mode: parsed?.mode ?? "sprint",
      min_score: parsed?.min_score ?? 80,
      rtk_enabled: parsed?.rtk_enabled === true,
      linear_enabled,
      linear_team_id: typeof parsed?.linear_team_id === "string" ? parsed.linear_team_id : undefined,
      sensors: {
        execute: { computational: sensors },
      },
      evaluator,
      actions,
      autonomy,
      adversary,
    };
  } catch (err) {
    // Re-throw validation errors (e.g. missing LINEAR_API_KEY) so callers see them.
    // Swallow only file-not-found / parse errors, falling back to defaults.
    if (err instanceof Error && err.message.startsWith("[adp]")) throw err;
    return DEFAULT_CONFIG;
  }
}

function normalizeAdversary(raw: unknown): AdversaryConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ADVERSARY };
  const cfg = raw as Record<string, unknown>;

  const rawStrategies = Array.isArray(cfg.strategies) ? cfg.strategies : DEFAULT_ADVERSARY.strategies;
  const filtered: AdversaryStrategy[] = [];
  for (const s of rawStrategies) {
    if (typeof s === "string" && VALID_STRATEGIES.has(s as AdversaryStrategy)) {
      filtered.push(s as AdversaryStrategy);
    } else {
      console.warn(`[adp] adversary strategy "${String(s)}" is not recognized — skipping`);
    }
  }
  const strategies = filtered.length > 0 ? filtered : [...DEFAULT_ADVERSARY.strategies];

  const failRaw = typeof cfg.fail_on_severity === "string" ? cfg.fail_on_severity : DEFAULT_ADVERSARY.fail_on_severity;
  const fail_on_severity: AdversarySeverity = VALID_SEVERITIES.has(failRaw as AdversarySeverity)
    ? (failRaw as AdversarySeverity)
    : DEFAULT_ADVERSARY.fail_on_severity;

  return {
    enabled: cfg.enabled === true,
    strategies,
    timeout_ms: typeof cfg.timeout_ms === "number" && cfg.timeout_ms > 0 ? cfg.timeout_ms : DEFAULT_ADVERSARY.timeout_ms,
    fail_on_severity,
    parallel: cfg.parallel !== false,
  };
}
