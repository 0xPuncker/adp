import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

export interface SessionCost {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  messages: number;
}

const EMPTY: SessionCost = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_write_tokens: 0,
  total_tokens: 0,
  messages: 0,
};

/**
 * Read token usage from Claude Code's session JSONL for a project.
 * Scans ~/.claude/projects/<project-slug>/*.jsonl for usage entries.
 */
export async function readSessionCosts(cwd: string): Promise<SessionCost> {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const claudeDir = resolve(home, ".claude", "projects");

    // Claude Code uses: C--Users-User-Documents-Claude-test-project
    // From cwd like C:/Users/User/Documents/Claude/test-project
    const normalized = cwd.replace(/\\/g, "/");
    const drive = normalized.match(/^([A-Za-z]):/)?.[1]?.toUpperCase() || "";
    const rest = normalized.replace(/^[A-Za-z]:\//, "").split("/").join("-");
    const dirSlug = `${drive}--${rest}`;

    let projectDir = "";
    try {
      const dirs = readdirSync(claudeDir);
      // Try exact match first, then partial
      const match = dirs.find((d) => d === dirSlug)
        || dirs.find((d) => d.startsWith(dirSlug))
        || dirs.find((d) => dirSlug.startsWith(d))
        || dirs.find((d) => d.includes(rest) || rest.includes(d.replace(/^[A-Z]--/, "")));
      if (match) projectDir = resolve(claudeDir, match);
    } catch {
      return EMPTY;
    }

    if (!projectDir) return EMPTY;

    // Read ALL .jsonl files in the project dir for cumulative costs
    const files = readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => resolve(projectDir, f));

    if (files.length === 0) return EMPTY;

    // Concatenate all session lines
    const allLines: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      allLines.push(...content.split("\n").filter(Boolean));
    }
    const lines = allLines;

    const cost: SessionCost = { ...EMPTY };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Usage can be at entry.usage or entry.message.usage
        const usage = entry.usage || entry.message?.usage;
        if (usage) {
          cost.input_tokens += usage.input_tokens || 0;
          cost.output_tokens += usage.output_tokens || 0;
          cost.cache_read_tokens += usage.cache_read_input_tokens || 0;
          cost.cache_write_tokens += usage.cache_creation_input_tokens || 0;
          cost.messages++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    cost.total_tokens = cost.input_tokens + cost.output_tokens + cost.cache_read_tokens + cost.cache_write_tokens;
    return cost;
  } catch {
    return EMPTY;
  }
}
