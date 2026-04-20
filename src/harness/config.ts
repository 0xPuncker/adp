import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import type { HarnessConfig } from "../types.js";

const DEFAULT_CONFIG: HarnessConfig = {
  sensors: {
    execute: {
      computational: [],
    },
  },
};

/**
 * Load harness configuration from .adp/harness.yaml.
 */
export async function loadHarnessConfig(cwd: string): Promise<HarnessConfig> {
  const configPath = resolve(cwd, ".adp", "harness.yaml");
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = YAML.parse(raw);
    return {
      sensors: {
        execute: {
          computational: parsed?.sensors?.execute?.computational ?? [],
        },
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
