import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

/**
 * Sprint record extracted from Claude Code session JSONL.
 * This is the ground truth — state.json may become stale if the
 * SKILL session stops updating it after context compaction.
 */
export interface SessionSprint {
  id: number;
  task: string;
  status: "done" | "in_progress" | "planned";
  score?: number;
}

/**
 * Parse sprint data from Claude Code session JSONL files.
 * Extracts sprint references from assistant messages to reconstruct
 * the actual sprint list regardless of state.json staleness.
 */
export async function readSessionSprints(cwd: string): Promise<SessionSprint[]> {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const claudeDir = resolve(home, ".claude", "projects");

    const normalized = cwd.replace(/\\/g, "/");
    const drive = normalized.match(/^([A-Za-z]):/)?.[1]?.toUpperCase() || "";
    const rest = normalized.replace(/^[A-Za-z]:\//, "").split("/").join("-");
    const dirSlug = `${drive}--${rest}`;

    let projectDir = "";
    try {
      const dirs = readdirSync(claudeDir);
      const match = dirs.find((d) => d === dirSlug)
        || dirs.find((d) => d.startsWith(dirSlug))
        || dirs.find((d) => dirSlug.startsWith(d))
        || dirs.find((d) => d.includes(rest) || rest.includes(d.replace(/^[A-Z]--/, "")));
      if (match) projectDir = resolve(claudeDir, match);
    } catch {
      return [];
    }

    if (!projectDir) return [];

    // Read all JSONL files, sorted by modification time (most recent last)
    const files = readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => resolve(projectDir, f));

    if (files.length === 0) return [];

    // Collect all text content from assistant messages
    const sprintMap = new Map<number, SessionSprint>();

    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          // Content is at entry.message.content (Claude Code JSONL format)
          // Check both assistant and user messages (status updates appear in both)
          if (entry.type !== "assistant" && entry.type !== "user") continue;

          const msgContent = entry.message?.content;
          // Collect text from message bodies AND tool_use bash commands
          // (commit messages with "Score: NN/100" arrive as tool_use input).
          let text = "";
          if (Array.isArray(msgContent)) {
            for (const b of msgContent as Array<{ type: string; text?: string; input?: { command?: string } }>) {
              if (b.type === "text" && typeof b.text === "string") {
                text += " " + b.text;
              } else if (b.type === "tool_use" && b.input && typeof b.input.command === "string") {
                text += " " + b.input.command;
              }
            }
          } else if (typeof msgContent === "string") {
            text = msgContent;
          }

          if (!text) continue;

          // Patterns to extract sprint task names:
          // "Sprint N: <task>" / "Sprint N — <task>" / "Sprint N (<task>)"
          const sprintRefs = text.matchAll(/Sprint (\d+)(?:\.\d+)?(?:\s*[:(—–]\s*)([^\n"}{]{4,80})/g);
          for (const match of sprintRefs) {
            const id = parseInt(match[1], 10);
            // Clean up: remove trailing punctuation, scores, status markers
            let task = match[2].trim()
              .replace(/\*+/g, "")
              .replace(/\s*[✓✗●◼◻▶■]+\s*\d*\s*$/, "")
              .replace(/\s*\(commit[^)]*\)/, "")
              .replace(/\s*—\s*score.*$/i, "")
              .replace(/\s*shipped.*$/i, "")
              .replace(/[.)\]"]+$/, "")
              .replace(/^\(?(final|resumed)[):]?\s*/i, "")
              .replace(/\)\s*$/, "")
              .trim();
            // Skip noise patterns
            if (id <= 0 || task.length < 4) continue;
            if (/^(TASK-XX|then |complete|contract|not started|N:)/.test(task)) continue;

            if (!sprintMap.has(id)) {
              sprintMap.set(id, { id, task, status: "done" });
            } else if (task.startsWith("TASK-") && !sprintMap.get(id)!.task.startsWith("TASK-")) {
              // Prefer TASK-prefixed names
              sprintMap.get(id)!.task = task;
            } else if (task.length > 10 && sprintMap.get(id)!.task.length < 10) {
              // Prefer more descriptive names
              sprintMap.get(id)!.task = task;
            }
          }

          // Detect in-progress / planned sprints from status lines
          const statusLines = text.matchAll(/[◼●▶]\s*Sprint (\d+)/g);
          for (const match of statusLines) {
            const id = parseInt(match[1], 10);
            if (sprintMap.has(id)) {
              sprintMap.get(id)!.status = "in_progress";
            }
          }
          const plannedLines = text.matchAll(/[◻○]\s*Sprint (\d+)/g);
          for (const match of plannedLines) {
            const id = parseInt(match[1], 10);
            if (sprintMap.has(id)) {
              sprintMap.get(id)!.status = "planned";
            }
          }

          // Extract scores from "Score: NN/100" or "score: NN" patterns.
          // Link scores to sprint IDs via "Sprint N" OR "[ADP-TASK-NN]" references
          // in the same text block (commit messages typically have both score and
          // task tag together, even if they don't say "Sprint N").
          const sprintIdsInText = new Set<number>();
          for (const m of text.matchAll(/Sprint (\d+)/g)) {
            sprintIdsInText.add(parseInt(m[1], 10));
          }
          for (const m of text.matchAll(/\bADP-TASK-(\d+)\b/g)) {
            sprintIdsInText.add(parseInt(m[1], 10));
          }
          for (const m of text.matchAll(/(?:^|\s)[Ss]core:\s*(\d{1,3})(?:\/100)?/g)) {
            const n = parseInt(m[1], 10);
            if (n < 0 || n > 100) continue;
            for (const id of sprintIdsInText) {
              const sp = sprintMap.get(id);
              if (sp && (sp.score === undefined || n > sp.score)) {
                sp.score = n;
              }
            }
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Sort by ID
    return Array.from(sprintMap.values()).sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

/**
 * Get the highest sprint number from session data.
 */
export async function getSprintCount(cwd: string): Promise<number> {
  const sprints = await readSessionSprints(cwd);
  if (sprints.length === 0) return 0;
  return sprints[sprints.length - 1].id;
}
