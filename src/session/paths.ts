import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

/**
 * Resolve the Claude Code project session directory for a given cwd.
 * Returns the absolute path under ~/.claude/projects/, or null if it cannot be found.
 *
 * Claude Code derives the slug from the absolute cwd by replacing path separators
 * with `-` (e.g., `C:\Users\User\foo` → `C--Users-User-foo`). This helper handles
 * that mapping plus a few near-match fallbacks for renamed or partially-matching dirs.
 */
export function resolveProjectSessionDir(cwd: string): string | null {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    if (!home) return null;
    const claudeDir = resolve(home, ".claude", "projects");

    const normalized = cwd.replace(/\\/g, "/");
    const drive = normalized.match(/^([A-Za-z]):/)?.[1]?.toUpperCase() || "";
    const rest = normalized.replace(/^[A-Za-z]:\//, "").split("/").join("-");
    const dirSlug = `${drive}--${rest}`;

    const dirs = readdirSync(claudeDir);
    const match =
      dirs.find((d) => d === dirSlug) ||
      dirs.find((d) => d.startsWith(dirSlug)) ||
      dirs.find((d) => dirSlug.startsWith(d)) ||
      dirs.find((d) => d.includes(rest) || rest.includes(d.replace(/^[A-Z]--/, "")));
    return match ? resolve(claudeDir, match) : null;
  } catch {
    return null;
  }
}

/**
 * Get the most recent (mtime) JSONL session file in the project session dir,
 * along with its corresponding session id (filename stem).
 */
export function findActiveSession(projectDir: string): { sessionId: string; jsonl: string } | null {
  try {
    const files = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
    if (files.length === 0) return null;
    let bestFile = "";
    let bestMtime = -1;
    for (const f of files) {
      try {
        const m = statSync(resolve(projectDir, f)).mtimeMs;
        if (m > bestMtime) {
          bestMtime = m;
          bestFile = f;
        }
      } catch {
        // skip
      }
    }
    if (!bestFile) return null;
    return {
      sessionId: bestFile.replace(/\.jsonl$/, ""),
      jsonl: resolve(projectDir, bestFile),
    };
  } catch {
    return null;
  }
}

/**
 * The subagents directory for an active session: `<projectDir>/<sessionId>/subagents`.
 */
export function subagentsDir(projectDir: string, sessionId: string): string {
  return resolve(projectDir, sessionId, "subagents");
}
