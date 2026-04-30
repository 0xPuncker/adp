import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import chokidar, { type FSWatcher } from "chokidar";
import { parseSubagentFile } from "../session/subagents.js";
import type { SubagentEvent } from "./types.js";
import type { Worktree } from "../worktree/manager.js";
import type { EvaluatorScores } from "../types.js";

export type LiveWatcherStatus =
  | { kind: "watching"; dir: string }
  | { kind: "degraded"; reason: string };

export interface LiveWatcherEvents {
  event: (e: SubagentEvent) => void;
  status: (s: LiveWatcherStatus) => void;
  error: (err: Error) => void;
}

export interface LiveWatcherOptions {
  dir: string;
  worktrees?: Worktree[];
  evaluatorThresholds?: EvaluatorScores;
  /** Override chokidar — used by tests. */
  watcherFactory?: (dir: string) => FSWatcher;
}

/**
 * Watches a Claude Code session subagents/ directory and emits SubagentEvent updates as
 * agent JSONL files appear, grow, or finish.
 *
 * Lifecycle:
 *   const w = new LiveWatcher({ dir });
 *   w.on("event", (e) => ...);  // SubagentEvent updates
 *   w.on("status", (s) => ...); // watching | degraded
 *   await w.start();
 *   ... later ...
 *   await w.close();
 *
 * Degrades gracefully when `dir` does not exist — emits a "degraded" status and the
 * caller can decide whether to fall back to 3s polling.
 */
export class LiveWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private readonly dir: string;
  private readonly worktrees: Worktree[];
  private readonly thresholds?: EvaluatorScores;
  private readonly factory: (dir: string) => FSWatcher;
  private events = new Map<string, SubagentEvent>();
  private closed = false;

  constructor(opts: LiveWatcherOptions) {
    super();
    this.dir = opts.dir;
    this.worktrees = opts.worktrees ?? [];
    this.thresholds = opts.evaluatorThresholds;
    this.factory = opts.watcherFactory ?? defaultWatcherFactory;
  }

  on<K extends keyof LiveWatcherEvents>(name: K, listener: LiveWatcherEvents[K]): this {
    return super.on(name, listener as (...args: unknown[]) => void);
  }

  emit<K extends keyof LiveWatcherEvents>(name: K, ...args: Parameters<LiveWatcherEvents[K]>): boolean {
    return super.emit(name, ...args);
  }

  /**
   * Begin watching. Resolves once initial scan is complete.
   * If the dir doesn't exist, emits a `degraded` status and resolves without throwing.
   */
  async start(): Promise<void> {
    if (!existsSync(this.dir)) {
      this.emit("status", { kind: "degraded", reason: `subagents dir not found: ${this.dir}` });
      return;
    }

    this.emit("status", { kind: "watching", dir: this.dir });
    const watcher = this.factory(this.dir);
    this.watcher = watcher;

    watcher.on("add", (path) => {
      void this.handleFile(path);
    });
    watcher.on("change", (path) => {
      void this.handleFile(path);
    });
    watcher.on("error", (err) => {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    });

    await new Promise<void>((resolveP) => {
      watcher.once("ready", resolveP);
    });
  }

  /**
   * Snapshot of all events seen so far, ordered by start time.
   */
  list(): SubagentEvent[] {
    return [...this.events.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.removeAllListeners();
  }

  private async handleFile(path: string): Promise<void> {
    if (this.closed) return;
    if (!path.endsWith(".jsonl") || !path.includes("agent-")) return;
    const ev = await parseSubagentFile(path, {
      worktrees: this.worktrees,
      evaluatorThresholds: this.thresholds,
    });
    if (!ev) return;
    this.events.set(ev.agentId, ev);
    this.emit("event", ev);
  }
}

function defaultWatcherFactory(dir: string): FSWatcher {
  // Chokidar 5 dropped glob support — watch the directory itself; the LiveWatcher
  // handler skips non-agent and non-.jsonl entries.
  return chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: false,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
  });
}
