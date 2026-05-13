import { mkdir, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { platform } from "node:os";

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

/** Merges ADP hook registrations into .claude/settings.json, preserving non-ADP entries. */
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

  // Map hook base name (without extension) → event + matcher
  const hookConfig: Record<string, { event: string; matcher: string }> = {
    PreToolUse: { event: "PreToolUse", matcher: "Bash" },
    PostToolUse: { event: "PostToolUse", matcher: "Write|Edit|NotebookEdit" },
    SessionStart: { event: "SessionStart", matcher: "" },
  };

  const isWindows = platform() === "win32";

  let changed = false;

  for (const file of hooksInstalled) {
    // Strip extension to look up config
    const base = file.replace(/\.(sh|ps1)$/, "");
    const cfg = hookConfig[base];
    if (!cfg) continue;

    const scriptPath = join(hooksDir, file);
    const command = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath.replace(/\\/g, "/")}"`;
    const { event, matcher } = cfg;

    if (!settings.hooks[event]) settings.hooks[event] = [];

    // Remove any existing ADP entry for this event (idempotent — match on base name)
    settings.hooks[event] = settings.hooks[event].filter(
      (m) => !m.hooks.some((h) => h.command.includes(".claude") && h.command.includes("hooks") && h.command.includes(base)),
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
