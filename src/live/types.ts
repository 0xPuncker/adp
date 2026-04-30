import type { EvaluatorScores } from "../types.js";

export type SubagentClassification = "evaluator" | "contract-review" | "worktree" | "unknown";

export type SubagentStatus = "running" | "done" | "errored";

export interface SubagentToolCall {
  name: string;
  target: string;
  timestamp: string;
}

export interface SubagentVerdict {
  raw: string | null;
  parsedScores: EvaluatorScores | null;
  pass: boolean | null;
}

export interface SubagentEvent {
  agentId: string;
  agentType: string;
  classified: SubagentClassification;
  sprintId: number | null;
  startedAt: string;
  endedAt: string | null;
  prompt: string;
  verdict: SubagentVerdict;
  recentToolCalls: SubagentToolCall[];
  status: SubagentStatus;
  cwd: string | null;
}

export interface SensorChunk {
  sensor: string;
  stream: "stdout" | "stderr";
  text: string;
  timestamp: string;
}

export type LiveEvent =
  | { kind: "subagent"; event: SubagentEvent }
  | { kind: "sensor"; chunk: SensorChunk };
