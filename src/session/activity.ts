import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import type { Activity } from "../types.js";

/**
 * Extract recent activity from Claude Code session JSONL.
 * Pulls commit messages, tool use summaries, and status updates
 * from assistant messages to reconstruct real-time activity.
 */
export async function readSessionActivity(cwd: string, limit = 20): Promise<Activity[]> {
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

    // Find the most recent JSONL file (active session)
    const files = readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => resolve(projectDir, f));

    if (files.length === 0) return [];

    // Sort by mtime, most recent first
    const withStats = await Promise.all(
      files.map(async (f) => ({ path: f, mtime: (await stat(f)).mtimeMs }))
    );
    withStats.sort((a, b) => b.mtime - a.mtime);

    // Read the most recent session file
    const content = await readFile(withStats[0].path, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    const activities: Activity[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "assistant") continue;

        const msgContent = entry.message?.content;
        if (!Array.isArray(msgContent)) continue;

        const timestamp = entry.timestamp || new Date().toISOString();

        for (const block of msgContent) {
          if (block.type === "text" && block.text) {
            const text: string = block.text;

            // Detect commits
            const commitMatch = text.match(/commit[:\s]+([a-f0-9]{7,})/i);
            if (commitMatch) {
              const msgMatch = text.match(/```\n([^\n]+)/);
              activities.push({
                timestamp,
                type: "commit",
                message: msgMatch ? msgMatch[1].slice(0, 60) : `Committed ${commitMatch[1]}`,
              });
            }

            // Detect sprint starts/completions
            const sprintStart = text.match(/(?:Starting|Beginning)\s+Sprint\s+(\d+)[:\s—]*([^\n]{0,50})/i);
            if (sprintStart) {
              activities.push({
                timestamp,
                type: "sprint_start",
                message: `Sprint ${sprintStart[1]}: ${sprintStart[2]}`.trim(),
              });
            }

            const sprintEnd = text.match(/Sprint\s+(\d+)\s+(?:complete|done|shipped|passed)/i);
            if (sprintEnd) {
              activities.push({
                timestamp,
                type: "sprint_end",
                message: `Sprint ${sprintEnd[1]} complete`,
              });
            }

            // Detect sensor runs
            const sensorMatch = text.match(/(?:typecheck|lint|test)\s*[✓✗]/);
            if (sensorMatch) {
              const sensors = text.match(/(typecheck\s*[✓✗])\s*(lint\s*[✓✗])?\s*(test\s*[✓✗])?/);
              if (sensors) {
                activities.push({
                  timestamp,
                  type: sensors[0].includes("✗") ? "sensor_fail" : "sensor_pass",
                  message: sensors[0].trim(),
                });
              }
            }

            // Detect phase changes
            const phaseMatch = text.match(/(?:Phase|Moving to|Starting):\s*(SPECIFY|DESIGN|TASKS|EXECUTE)/i);
            if (phaseMatch) {
              activities.push({
                timestamp,
                type: "phase_start",
                message: `Phase: ${phaseMatch[1]}`,
              });
            }
          }

          // Detect tool uses (key actions)
          if (block.type === "tool_use") {
            if (block.name === "Bash" && block.input?.command?.startsWith("git commit")) {
              activities.push({
                timestamp,
                type: "commit",
                message: block.input.description || "git commit",
              });
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Deduplicate and return most recent
    const seen = new Set<string>();
    const unique = activities.filter((a) => {
      const key = `${a.type}:${a.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(-limit);
  } catch {
    return [];
  }
}
