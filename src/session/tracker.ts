import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readSessionCosts } from "./costs.js";
import type { SessionCost } from "./costs.js";

/**
 * Per-sprint usage snapshot — captures tokens at sprint boundaries.
 */
export interface SprintUsage {
  sprint_id: number;
  task: string;
  started_at: string | null;
  completed_at: string | null;
  duration_s: number | null;
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
  };
}

/**
 * Full usage report saved to .adp/usage.json for tuning.
 */
export interface UsageReport {
  project: string;
  generated_at: string;
  session: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    messages: number;
  };
  pipeline: {
    status: string;
    started_at: string | null;
    elapsed_s: number | null;
    sprints_total: number;
    sprints_done: number;
    sprints_failed: number;
    avg_score: number | null;
  };
  sprints: SprintUsage[];
  cost_estimate_usd: number | null;
}

// Approximate pricing (Opus 4.6 as of 2025)
const PRICE_INPUT_PER_M = 15.0;
const PRICE_OUTPUT_PER_M = 75.0;
const PRICE_CACHE_READ_PER_M = 1.5;
const PRICE_CACHE_WRITE_PER_M = 18.75;

function estimateCost(session: SessionCost): number {
  return (
    (session.input_tokens / 1_000_000) * PRICE_INPUT_PER_M +
    (session.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_M +
    (session.cache_read_tokens / 1_000_000) * PRICE_CACHE_READ_PER_M +
    (session.cache_write_tokens / 1_000_000) * PRICE_CACHE_WRITE_PER_M
  );
}

interface PipelineSnapshot {
  status: string;
  startedAt: string | null;
  sprints: Array<{
    id: number;
    task: string;
    status: string;
    score: number | null;
    cost: { input_tokens: number; output_tokens: number; total_tokens: number };
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

/**
 * Generate and save a usage report to .adp/usage.json.
 * Call this after each pipeline run or on-demand from the TUI.
 */
export async function saveUsageReport(cwd: string, state: PipelineSnapshot): Promise<UsageReport> {
  const session = await readSessionCosts(cwd);

  const doneSprints = state.sprints.filter((s) => s.status === "done");
  const failedSprints = state.sprints.filter((s) => s.status === "failed");
  const scored = state.sprints.filter((s) => s.score !== null);
  const avgScore = scored.length > 0
    ? scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length
    : null;

  const elapsed = state.startedAt
    ? Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)
    : null;

  const sprints: SprintUsage[] = state.sprints.map((s) => {
    const duration = s.startedAt && s.completedAt
      ? Math.floor((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
      : null;

    return {
      sprint_id: s.id,
      task: s.task,
      started_at: s.startedAt,
      completed_at: s.completedAt,
      duration_s: duration,
      tokens: {
        input: s.cost.input_tokens,
        output: s.cost.output_tokens,
        cache_read: 0,
        cache_write: 0,
        total: s.cost.total_tokens,
      },
    };
  });

  const report: UsageReport = {
    project: cwd,
    generated_at: new Date().toISOString(),
    session: {
      total_tokens: session.total_tokens,
      input_tokens: session.input_tokens,
      output_tokens: session.output_tokens,
      cache_read_tokens: session.cache_read_tokens,
      cache_write_tokens: session.cache_write_tokens,
      messages: session.messages,
    },
    pipeline: {
      status: state.status,
      started_at: state.startedAt,
      elapsed_s: elapsed,
      sprints_total: state.sprints.length,
      sprints_done: doneSprints.length,
      sprints_failed: failedSprints.length,
      avg_score: avgScore,
    },
    sprints,
    cost_estimate_usd: estimateCost(session),
  };

  // Save to .adp/usage.json
  const adpDir = resolve(cwd, ".adp");
  await mkdir(adpDir, { recursive: true });
  await writeFile(resolve(adpDir, "usage.json"), JSON.stringify(report, null, 2), "utf-8");

  return report;
}

/**
 * Load existing usage report (if any).
 */
export async function loadUsageReport(cwd: string): Promise<UsageReport | null> {
  try {
    const data = await readFile(resolve(cwd, ".adp", "usage.json"), "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}
