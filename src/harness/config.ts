import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import type { HarnessConfig, EvaluatorConfig, SensorConfig, ActionConfig, ActionZone } from "../types.js";

const DEFAULT_EVALUATOR: EvaluatorConfig = {
  enabled: true,
  timing: "per_sprint",
  criteria: {
    correctness: 80,
    completeness: 75,
    code_quality: 70,
    test_coverage: 70,
  },
  live_test: false,
};

const DEFAULT_CONFIG: HarnessConfig = {
  mode: "sprint",
  min_score: 80,
  sensors: {
    execute: {
      computational: [],
    },
  },
  evaluator: DEFAULT_EVALUATOR,
  actions: {},
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
      sensors = parsed.sensors.execute.computational;
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
      }).filter((s: SensorConfig) => s.command);
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
      },
      live_test: evalCfg?.live_test ?? DEFAULT_EVALUATOR.live_test,
      live_test_command: evalCfg?.live_test_command,
    };

    // Normalize actions
    const actions: Record<string, ActionConfig> = {};
    if (parsed?.actions && typeof parsed.actions === "object") {
      for (const [name, cfg] of Object.entries(parsed.actions)) {
        const entry = cfg as Record<string, unknown>;
        if (entry?.command) {
          actions[name] = {
            command: String(entry.command),
            zone: (entry.zone as ActionZone) ?? "gated",
            auto_approve: Boolean(entry.auto_approve ?? false),
            depends_on: Array.isArray(entry.depends_on) ? entry.depends_on : undefined,
          };
        }
      }
    }

    return {
      mode: parsed?.mode ?? "sprint",
      min_score: parsed?.min_score ?? 80,
      sensors: {
        execute: { computational: sensors },
      },
      evaluator,
      actions,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
