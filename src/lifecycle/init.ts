import { mkdir, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export interface InitResult {
  hooksInstalled: string[];
  agentsInstalled: string[];
  settingsUpdated: boolean;
}

interface HookEntry {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
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
/**
 * Merges ADP hook registrations into .claude/settings.json.
 * Existing non-ADP entries are preserved. ADP entries are identified
 * by their command containing "/.claude/hooks/" and replaced idempotently.
 */
async function registerHooksInSettings(
  claudeDir: string,
  hooksInstalled: string[],
): Promise<boolean> {
  if (hooksInstalled.length === 0) return false;

  const settingsPath = join(claudeDir, "settings.json");
  let settings: ClaudeSettings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(await readFile(settingsPath, "utf-8")) as ClaudeSettings;
    } catch {
      // unreadable settings — start fresh rather than corrupt
    }
  }

  if (!settings.hooks) settings.hooks = {};

  const hooksDir = join(claudeDir, "hooks");

  // Map hook filename → event + matcher
  const hookConfig: Record<string, { event: string; matcher: string }> = {
    "PreToolUse.sh": { event: "PreToolUse", matcher: "Bash" },
    "PostToolUse.sh": { event: "PostToolUse", matcher: "Write|Edit|NotebookEdit" },
    "SessionStart.sh": { event: "SessionStart", matcher: "" },
  };

  let changed = false;

  for (const file of hooksInstalled) {
    const cfg = hookConfig[file];
    if (!cfg) continue;

    const scriptPath = join(hooksDir, file).replace(/\\/g, "/");
    const command = `bash "${scriptPath}"`;
    const { event, matcher } = cfg;

    if (!settings.hooks[event]) settings.hooks[event] = [];

    // Remove any existing ADP entry for this event (idempotent)
    const adpMarker = `/.claude/hooks/`;
    settings.hooks[event] = settings.hooks[event].filter(
      (m) => !m.hooks.some((h) => h.command.includes(adpMarker) && h.command.includes(file)),
    );

    settings.hooks[event].push({ matcher, hooks: [{ type: "command", command }] });
    changed = true;
  }

  if (changed) {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
  }

  return changed;
}

export async function initProject(cwd: string, templatesDir?: string): Promise<InitResult> {
  const hooksInstalled: string[] = [];
  const agentsInstalled: string[] = [];

  const tplDir = templatesDir ?? defaultTemplatesDir();
  const claudeDir = resolve(cwd, ".claude");
  const hooksDir = join(claudeDir, "hooks");
  const agentsDir = join(claudeDir, "agents");
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

  const settingsUpdated = await registerHooksInSettings(claudeDir, hooksInstalled);

  return { hooksInstalled, agentsInstalled, settingsUpdated };
}
