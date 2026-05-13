import { useEffect, useState, useRef } from "react";
import { LiveWatcher } from "../../live/watcher.js";
import type { SubagentEvent, SensorChunk } from "../../live/types.js";
import type { Worktree } from "../../worktree/manager.js";
import type { EvaluatorScores } from "../../types.js";
import {
  resolveProjectSessionDir,
  findActiveSession,
  subagentsDir,
} from "../../session/paths.js";

export interface UseLiveEventsOptions {
  cwd: string;
  worktrees?: Worktree[];
  evaluatorThresholds?: EvaluatorScores;
  /** Sliding window for sensor stdout/stderr lines. */
  sensorTailSize?: number;
}

export type LiveStatus = "watching" | "idle" | "degraded";

export interface UseLiveEventsResult {
  events: SubagentEvent[];
  sensorTail: string[];
  status: LiveStatus;
  degradedReason: string | null;
  appendSensorChunk: (chunk: SensorChunk) => void;
  clearSensorTail: () => void;
}

const DEFAULT_TAIL = 20;

/**
 * React hook that wires a LiveWatcher into component state.
 * - Resolves the active session's subagents/ dir from `cwd`.
 * - Tears down the watcher on unmount.
 * - Exposes a sensor tail buffer that the streaming sensor variant can feed via
 *   `appendSensorChunk` (so the panel and the harness engine stay decoupled).
 */
export function useLiveEvents(options: UseLiveEventsOptions): UseLiveEventsResult {
  const { cwd, worktrees = [], evaluatorThresholds, sensorTailSize = DEFAULT_TAIL } = options;
  const [events, setEvents] = useState<SubagentEvent[]>([]);
  const [sensorTail, setSensorTail] = useState<string[]>([]);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const watcherRef = useRef<LiveWatcher | null>(null);

  useEffect(() => {
    let disposed = false;
    let activeWatcher: LiveWatcher | null = null;
    let activeSessionId: string | null = null;
    // Mutable so recheckSession can retry after a failed initial resolve.
    let projectDir: string | null = resolveProjectSessionDir(cwd);

    function spawnWatcher(sessionId: string): void {
      if (disposed || !projectDir) return;
      if (activeWatcher) {
        void activeWatcher.close();
        activeWatcher = null;
        watcherRef.current = null;
      }
      activeSessionId = sessionId;
      const dir = subagentsDir(projectDir, sessionId);
      const w = new LiveWatcher({ dir, worktrees, evaluatorThresholds });
      activeWatcher = w;
      watcherRef.current = w;

      w.on("event", (e) => {
        if (disposed) return;
        setEvents((prev) => {
          const idx = prev.findIndex((p) => p.agentId === e.agentId);
          if (idx === -1) return [...prev, e];
          const next = prev.slice();
          next[idx] = e;
          return next;
        });
      });
      w.on("status", (s) => {
        if (disposed) return;
        if (s.kind === "watching") {
          setStatus("watching");
          setDegradedReason(null);
        } else if (s.kind === "idle") {
          setStatus("idle");
          setDegradedReason(null);
        } else {
          setStatus("degraded");
          setDegradedReason(s.reason);
        }
      });
      void w.start();
    }

    function recheckSession(): void {
      if (disposed) return;

      // Retry resolving the project dir — it may not have existed at startup
      // (e.g., TUI launched before Claude Code created ~/.claude/projects/{slug}).
      if (!projectDir) {
        projectDir = resolveProjectSessionDir(cwd);
        if (!projectDir) return; // still not found; remain degraded until next tick
      }

      const session = findActiveSession(projectDir);
      if (!session) {
        // Only report no-session on the initial lookup (before any watcher has started).
        // During a periodic recheck, a null result is transient — session rotation or
        // a brief FS gap — so we keep the current watcher running rather than degrading.
        if (!activeSessionId) {
          setStatus("idle");
          setDegradedReason(null);
        }
        return;
      }
      // Restart watcher only when the active session changes (new sub-agent run).
      if (session.sessionId !== activeSessionId) {
        setEvents([]);
        spawnWatcher(session.sessionId);
      }
    }

    // Initial check: if the project dir resolved, find the active session now.
    // If it didn't resolve, mark degraded and let the 10s timer retry.
    if (projectDir) {
      recheckSession();
    } else {
      setStatus("degraded");
      setDegradedReason("project session dir not found — open this project in Claude Code first");
    }

    // Re-check every 10s so the panel switches to a new session's subagents dir
    // as soon as a fresh `adp run` spawns its first sub-agent, and so the project
    // dir resolution can recover if it wasn't ready at startup.
    const sessionTimer = setInterval(recheckSession, 10_000);

    return () => {
      disposed = true;
      clearInterval(sessionTimer);
      if (activeWatcher) void activeWatcher.close();
      watcherRef.current = null;
    };
    // worktrees / thresholds intentionally captured by ref-style: watcher reads them at parse time;
    // changes during a session are rare and not worth restarting the watcher for.
  }, [cwd]);

  const appendSensorChunk = (chunk: SensorChunk): void => {
    setSensorTail((prev) => {
      const merged = (prev.join("") + chunk.text).split("\n");
      const lines = merged.slice(-sensorTailSize);
      return lines;
    });
  };

  const clearSensorTail = (): void => setSensorTail([]);

  return { events, sensorTail, status, degradedReason, appendSensorChunk, clearSensorTail };
}
