import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { PipelineState, Sprint, Activity, Phase, Complexity } from "../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeSprint(s: any): Sprint {
  return {
    id: s.id ?? 0,
    task: s.task ?? s.name ?? "unknown",
    status: s.status ?? "contract",
    contract: s.contract ?? "",
    score: s.score ?? null,
    evaluator_scores: s.evaluator_scores ?? null,
    requirements: Array.isArray(s.requirements) ? s.requirements : [],
    commit: s.commit ?? null,
    cost: s.cost ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    startedAt: s.startedAt ?? null,
    completedAt: s.completedAt ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const EMPTY_STATE: PipelineState = {
  status: "idle",
  phase: null,
  feature: null,
  complexity: null,
  sprints: [],
  activity: [],
  startedAt: null,
  blockers: [],
};

/**
 * Manages .adp/state.json — the persistent pipeline state.
 */
export class StateManager {
  private cwd: string;
  private state: PipelineState | null = null;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  private get path(): string {
    return resolve(this.cwd, ".adp", "state.json");
  }

  async load(fresh = false): Promise<PipelineState> {
    if (this.state && !fresh) return this.state;
    try {
      const raw = await readFile(this.path, "utf-8");
      const parsed = JSON.parse(raw);
      // Normalize: ensure all expected fields exist with sensible defaults
      this.state = {
        status: parsed.status ?? "idle",
        phase: parsed.phase ?? null,
        feature: parsed.feature ?? null,
        complexity: parsed.complexity ?? null,
        sprints: Array.isArray(parsed.sprints) ? parsed.sprints.map(normalizeSprint) : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity : [],
        startedAt: parsed.startedAt ?? null,
        blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      } as PipelineState;
    } catch {
      this.state = { ...EMPTY_STATE };
    }
    return this.state;
  }

  async save(): Promise<void> {
    if (!this.state) return;
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.state, null, 2), "utf-8");
  }

  // ─── Queries ──────────────────────────────────────────────────

  /**
   * Get sprints that are done but have no score (need evaluation).
   */
  async getUnscoredSprints(): Promise<Sprint[]> {
    const state = await this.load();
    return state.sprints.filter((s) => s.status === "done" && s.score === null);
  }

  // ─── Mutations ─────────────────────────────────────────────────

  async startPipeline(feature: string, complexity: Complexity): Promise<void> {
    const state = await this.load();
    state.status = "running";
    state.feature = feature;
    state.complexity = complexity;
    state.phase = "specify";
    state.startedAt = new Date().toISOString();
    await this.logActivity("info", `Pipeline started for ${feature} [${complexity}]`);
    await this.save();
  }

  async setPhase(phase: Phase | null): Promise<void> {
    const state = await this.load();
    state.phase = phase;
    if (phase) await this.logActivity("info", `Phase: ${phase}`);
    await this.save();
  }

  async startSprint(task: string, contract: string): Promise<Sprint> {
    const state = await this.load();
    const sprint: Sprint = {
      id: state.sprints.length + 1,
      task,
      status: "contract",
      contract,
      score: null,
      evaluator_scores: null,
      requirements: [],
      commit: null,
      cost: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    state.sprints.push(sprint);
    await this.logActivity("sprint_start", `Sprint ${sprint.id}: ${task}`);
    await this.save();
    return sprint;
  }

  async updateSprint(id: number, update: Partial<Sprint>): Promise<void> {
    const state = await this.load();
    const sprint = state.sprints.find((s) => s.id === id);
    if (sprint) {
      Object.assign(sprint, update);
      if (update.status === "done") {
        sprint.completedAt = new Date().toISOString();
        await this.logActivity("sprint_end", `Sprint ${id} complete — score: ${sprint.score}`);
      }
    }
    await this.save();
  }

  async setStatus(status: PipelineState["status"]): Promise<void> {
    const state = await this.load();
    state.status = status;
    await this.logActivity("info", `Status → ${status}`);
    await this.save();
  }

  async clearBlockers(): Promise<void> {
    const state = await this.load();
    state.blockers = [];
    if (state.status === "blocked") state.status = "running";
    await this.logActivity("info", "Blockers cleared");
    await this.save();
  }

  async completePipeline(): Promise<void> {
    const state = await this.load();
    state.status = "idle";
    state.phase = null;
    await this.logActivity("info", "Pipeline complete");
    await this.save();
  }

  async addBlocker(task: string, sensor: string, error: string): Promise<void> {
    const state = await this.load();
    state.status = "blocked";
    state.blockers.push({ task, sensor, error, attempts: 3 });
    await this.logActivity("error", `Blocked: ${task} — ${sensor} failed after 3 attempts`);
    await this.save();
  }

  async logActivity(type: Activity["type"], message: string): Promise<void> {
    const state = await this.load();
    state.activity.push({
      timestamp: new Date().toISOString(),
      type,
      message,
    });
    // Keep last 100 entries
    if (state.activity.length > 100) {
      state.activity = state.activity.slice(-100);
    }
  }

  async logSensorResult(passed: boolean, summary: string): Promise<void> {
    await this.logActivity(
      passed ? "sensor_pass" : "sensor_fail",
      summary,
    );
    await this.save();
  }

  async logCommit(message: string): Promise<void> {
    await this.logActivity("commit", message);
    await this.save();
  }

  async logEvaluator(sprintId: number, score: number, retroactive = false): Promise<void> {
    const tag = retroactive ? " (retroactive)" : "";
    await this.logActivity("evaluator", `Sprint ${sprintId} scored: ${score}/100${tag}`);
    await this.save();
  }
}
