export type Phase = "specify" | "design" | "tasks" | "execute";
export type Complexity = "small" | "medium" | "large" | "complex";
export type SprintStatus = "contract" | "build" | "qa" | "evaluating" | "done" | "failed";
export type PipelineStatus = "idle" | "running" | "paused" | "blocked";
export type ExecutionMode = "sprint" | "continuous";
export type EvaluatorTiming = "per_sprint" | "end_of_run" | "adaptive";
export type ActionZone = "free" | "gated" | "always_ask";

export interface Sprint {
  id: number;
  task: string;
  status: SprintStatus;
  contract: string;
  score: number | null;
  evaluator_scores: EvaluatorScores | null;
  requirements: string[];
  commit: string | null;
  cost: TokenCost;
  startedAt: string | null;
  completedAt: string | null;
}

export interface EvaluatorScores {
  correctness: number;
  completeness: number;
  code_quality: number;
  test_coverage: number;
}

export interface EvaluatorVerdict {
  sprint: number;
  verdict: "pass" | "fail";
  scores: EvaluatorScores;
  issues: string[];
  suggestions: string[];
}

export interface TokenCost {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface Activity {
  timestamp: string;
  type: string;
  message: string;
}

export interface PipelineState {
  status: string;
  phase: string | null;
  feature: string | null;
  complexity: string | null;
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

export interface ActionConfig {
  command: string;
  zone: ActionZone;
  auto_approve?: boolean;
  depends_on?: string[];
}

export interface EvaluatorConfig {
  enabled: boolean;
  timing: EvaluatorTiming;
  criteria: EvaluatorScores;
  live_test: boolean;
  live_test_command?: string;
}

export interface HarnessConfig {
  mode: ExecutionMode;
  min_score: number;
  sensors: {
    execute: {
      computational: SensorConfig[];
    };
  };
  evaluator: EvaluatorConfig;
  actions: Record<string, ActionConfig>;
}
