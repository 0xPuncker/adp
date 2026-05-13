import { mkdir, copyFile, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export interface InitResult {
  hooksInstalled: string[];
  agentsInstalled: string[];
}

function defaultTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/lifecycle/init.js → ../../templates  (production)
  // src/lifecycle/init.ts  → ../../templates  (dev/test via tsx)
  return join(here, "..", "..", "templates");
}

/**
 * Scaffold .claude/hooks/ and .claude/agents/ in the target project
 * by copying hook and agent templates from the ADP package.
 * @param cwd Target project root
 * @param templatesDir Override the ADP templates dir (used in tests)
 */
export async function initProject(cwd: string, templatesDir?: string): Promise<InitResult> {
  const hooksInstalled: string[] = [];
  const agentsInstalled: string[] = [];

  const tplDir = templatesDir ?? defaultTemplatesDir();
  const hooksDir = resolve(cwd, ".claude", "hooks");
  const agentsDir = resolve(cwd, ".claude", "agents");
  const srcHooks = join(tplDir, "hooks");
  const srcAgents = join(tplDir, "agents");

  if (existsSync(srcHooks)) {
    await mkdir(hooksDir, { recursive: true });
    const files = (await readdir(srcHooks)).filter((f) => f.endsWith(".sh") || f.endsWith(".ps1"));
    for (const file of files) {
      await copyFile(join(srcHooks, file), join(hooksDir, file));
      hooksInstalled.push(file);
    }
  }

  if (existsSync(srcAgents)) {
    await mkdir(agentsDir, { recursive: true });
    const files = (await readdir(srcAgents)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      await copyFile(join(srcAgents, file), join(agentsDir, file));
      agentsInstalled.push(file);
    }
  }

  return { hooksInstalled, agentsInstalled };
}
