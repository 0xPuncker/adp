import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { EvaluatorScores } from "../types.js";
import type { Worktree } from "../worktree/manager.js";
import {
  type SubagentEvent,
  type SubagentToolCall,
  type SubagentVerdict,
} from "../live/types.js";
import { classify } from "../live/classifier.js";

const RECENT_TOOL_CALLS = 5;
const PROMPT_PREVIEW = 200;
const VERDICT_PREVIEW = 500;

interface ParseOptions {
  worktrees?: Worktree[];
  evaluatorThresholds?: EvaluatorScores;
}

/**
 * Parse a single sub-agent JSONL file (and its sibling .meta.json) into a SubagentEvent.
 * Returns null if the file is empty or malformed beyond recovery.
 */
export async function parseSubagentFile(
  jsonlPath: string,
  opts: ParseOptions = {},
): Promise<SubagentEvent | null> {
  let raw: string;
  try {
    raw = await readFile(jsonlPath, "utf-8");
  } catch {
    return null;
  }
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length === 0) return null;

  const metaPath = jsonlPath.replace(/\.jsonl$/, ".meta.json");
  let agentType = "general-purpose";
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      if (typeof meta.agentType === "string") agentType = meta.agentType;
    } catch {
      // ignore meta parse errors — keep default
    }
  }

  const filename = jsonlPath.split(/[/\\]/).pop() ?? "";
  const agentId = filename.replace(/^agent-/, "").replace(/\.jsonl$/, "");

  let prompt = "";
  let startedAt = "";
  let endedAt: string | null = null;
  let cwd: string | null = null;
  let lastEndTurnText: string | null = null;
  let sawError = false;
  const recentToolCalls: SubagentToolCall[] = [];

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    const ts = (entry.timestamp as string) || "";
    if (typeof entry.cwd === "string" && !cwd) cwd = entry.cwd;

    if (entry.type === "user" && !prompt) {
      const message = entry.message as { content?: unknown } | undefined;
      const content = message?.content;
      if (typeof content === "string") {
        prompt = content.slice(0, PROMPT_PREVIEW);
      } else if (Array.isArray(content)) {
        for (const block of content as Array<{ type?: string; text?: string }>) {
          if (block.type === "text" && typeof block.text === "string") {
            prompt = block.text.slice(0, PROMPT_PREVIEW);
            break;
          }
        }
      }
      if (!startedAt) startedAt = ts;
    }

    if (entry.type === "assistant") {
      const message = entry.message as
        | { content?: unknown; stop_reason?: string }
        | undefined;
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const block of content as Array<{
          type?: string;
          name?: string;
          input?: Record<string, unknown>;
          text?: string;
        }>) {
          if (block.type === "tool_use" && typeof block.name === "string") {
            const input = block.input ?? {};
            const target =
              (typeof input.file_path === "string" && input.file_path) ||
              (typeof input.command === "string" && input.command) ||
              (typeof input.url === "string" && input.url) ||
              (typeof input.pattern === "string" && input.pattern) ||
              "";
            recentToolCalls.push({
              name: block.name,
              target: String(target).slice(0, 120),
              timestamp: ts,
            });
          } else if (block.type === "text" && typeof block.text === "string") {
            if (message?.stop_reason === "end_turn") {
              lastEndTurnText = block.text;
              endedAt = ts;
            }
          }
        }
      }
      if (message?.stop_reason === "end_turn" && !endedAt) endedAt = ts;
    }

    if (entry.type === "system" && typeof entry.subtype === "string") {
      if (entry.subtype === "error") sawError = true;
    }
  }

  if (!startedAt) startedAt = new Date(0).toISOString();

  const trimmedTools = recentToolCalls.slice(-RECENT_TOOL_CALLS);
  const verdict = buildVerdict(lastEndTurnText, opts.evaluatorThresholds);
  const status: SubagentEvent["status"] = sawError ? "errored" : endedAt ? "done" : "running";
  const { type: classified, sprintId } = classify(prompt, cwd, opts.worktrees ?? []);

  return {
    agentId,
    agentType,
    classified,
    sprintId,
    startedAt,
    endedAt,
    prompt,
    verdict,
    recentToolCalls: trimmedTools,
    status,
    cwd,
  };
}

function buildVerdict(
  text: string | null,
  thresholds?: EvaluatorScores,
): SubagentVerdict {
  if (!text) {
    return { raw: null, parsedScores: null, pass: null };
  }
  const raw = text.slice(0, VERDICT_PREVIEW);
  const parsed = tryExtractEvaluatorScores(text);
  let pass: boolean | null = null;
  if (parsed) {
    pass = thresholds ? meetsThresholds(parsed, thresholds) : true;
  } else if (/\bverdict\s*[:=]\s*"?pass"?/i.test(text)) {
    pass = true;
  } else if (/\bverdict\s*[:=]\s*"?fail"?/i.test(text)) {
    pass = false;
  }
  return { raw, parsedScores: parsed, pass };
}

function tryExtractEvaluatorScores(text: string): EvaluatorScores | null {
  const match = text.match(/\{[\s\S]*"scores"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const s = obj.scores;
    if (!s || typeof s !== "object") return null;
    const fields: Array<keyof EvaluatorScores> = [
      "correctness",
      "completeness",
      "code_quality",
      "test_coverage",
    ];
    const out: Partial<EvaluatorScores> = {};
    for (const f of fields) {
      if (typeof s[f] !== "number") return null;
      out[f] = s[f];
    }
    if (typeof s.security === "number") out.security = s.security;
    if (typeof s.resilience === "number") out.resilience = s.resilience;
    return out as EvaluatorScores;
  } catch {
    return null;
  }
}

function meetsThresholds(scores: EvaluatorScores, thresholds: EvaluatorScores): boolean {
  if (scores.correctness < thresholds.correctness) return false;
  if (scores.completeness < thresholds.completeness) return false;
  if (scores.code_quality < thresholds.code_quality) return false;
  if (scores.test_coverage < thresholds.test_coverage) return false;
  if (
    thresholds.security !== undefined &&
    scores.security !== undefined &&
    scores.security < thresholds.security
  ) {
    return false;
  }
  if (
    thresholds.resilience !== undefined &&
    scores.resilience !== undefined &&
    scores.resilience < thresholds.resilience
  ) {
    return false;
  }
  return true;
}

/**
 * Resolve the absolute path of an agent's JSONL file inside a session's subagents dir.
 */
export function agentFilePath(subagentsRoot: string, agentId: string): string {
  return resolve(subagentsRoot, `agent-${agentId}.jsonl`);
}
