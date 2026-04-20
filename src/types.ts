export type Phase = "specify" | "design" | "tasks" | "execute";
export type Complexity = "small" | "medium" | "large" | "complex";
export type SprintStatus = "contract" | "build" | "qa" | "done" | "failed";
export type PipelineStatus = "idle" | "running" | "paused" | "blocked";

export interface Sprint {
  id: number;
  task: string;
  status: SprintStatus;
  contract: string;
  score: number | null;
  cost: TokenCost;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TokenCost {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface Activity {
  timestamp: string;
  type: "sprint_start" | "sprint_end" | "sensor_pass" | "sensor_fail" | "commit" | "error" | "info";
  message: string;
}

export interface PipelineState {
  status: PipelineStatus;
  phase: Phase | null;
  feature: string | null;
  complexity: Complexity | null;
  sprints: Sprint[];
  activity: Activity[];
  startedAt: string | null;
  blockers: Blocker[];
}

export interface Blocker {
  task: string;
  sensor: string;
  error: string;
  attempts: number;
}

export interface SensorConfig {
  name: string;
  command: string;
  timeout?: number;
  fix_hint?: string;
}

export interface HarnessConfig {
  sensors: {
    execute: {
      computational: SensorConfig[];
    };
  };
}
