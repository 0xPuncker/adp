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
  security?: number;
  resilience?: number;
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

// ─── Design Bundle ──────────────────────────────────────────────

export interface DesignToken {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily?: string;
    fontSize?: Record<string, string>;
    fontWeight?: Record<string, string>;
  };
  radii?: Record<string, string>;
  shadows?: Record<string, string>;
  custom?: Record<string, unknown>;
}

export interface DesignComponent {
  name: string;
  description: string;
  props?: string[];
  file?: string;
  variants?: string[];
}

export interface DesignScreen {
  name: string;
  navId?: string;
  description: string;
  layout?: string;
  interactions?: string[];
}

export interface DesignDataShape {
  name: string;
  fields: string;
}

export interface DesignBundle {
  source: "claude-design" | "extracted" | "manual";
  timestamp: string;
  tokens: DesignToken;
  components: DesignComponent[];
  screens?: DesignScreen[];
  apiEndpoints?: string[];
  dataShapes?: DesignDataShape[];
  businessRules?: string[];
  i18n?: { languages: string[]; note?: string };
  prototype?: string;
  notes?: string;
}

// ─── Autonomy Configuration ──────────────────────────────────────

/** When to ask the user clarifying questions during SPECIFY. */
export type ClarifyMode =
  | "never"    // make all decisions autonomously, log to context.md
  | "critical" // ask only for truly unbridgeable ambiguity (default)
  | "always";  // original behavior — ask for every gray area

/** How much output to produce during execution. */
export type OutputMode =
  | "minimal"  // sprint start/end/score/blocker lines only (default)
  | "verbose"; // each tool call and reasoning step

export interface AutonomyConfig {
  clarify: ClarifyMode;
  output: OutputMode;
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
  autonomy: AutonomyConfig;
}

// ─── Git Workflow Types ──────────────────────────────────────────

export interface ConventionalCommit {
  type: string;
  scope: string | null;
  breaking: boolean;
  summary: string;
  body: string | null;
  footer: string | null;
}

export interface AdpCommitParams {
  type: string;
  scope: string;
  summary: string;
  taskId: string;
  requirements: string[];
  body?: string;
  sensorResults?: Record<string, boolean>;
  score?: number;
  evaluatorScores?: Record<string, number>;
  breaking?: boolean;
  breakingDescription?: string;
}

export type BranchType = "feature" | "release" | "hotfix" | "develop" | "main" | "bugfix" | "support";

export interface GitflowRule {
  type: BranchType;
  prefix: string;
  mergesInto: BranchType[];
  deletedAfterMerge: boolean;
}

export type GitflowRules = Record<BranchType, GitflowRule>;

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  pre: string | null;
  build: string | null;
}

export type VersionBump = "major" | "minor" | "patch";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
