import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";
import { Panel } from "./panel.js";
import type { SubagentEvent, SubagentClassification } from "../../live/types.js";
import type { EvaluatorScores } from "../../types.js";

type LiveStatus = "watching" | "idle" | "degraded";

interface LiveAgentPanelProps {
  events: SubagentEvent[];
  sensorTail: string[];
  status: LiveStatus;
  degradedReason?: string | null;
  thresholds?: EvaluatorScores;
  activeSprintId?: number | null;
  /** Cap visible sub-agent events. Defaults to last 6. */
  maxEvents?: number;
  /** Cap rendered sensor tail lines. Defaults to 8. */
  maxSensorLines?: number;
  /** Inner content width hint (excluding panel border/padding). Defaults to 36. */
  contentWidth?: number;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const TOOL_ABBREV: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  Bash: "bash",
  Glob: "glob",
  Grep: "grep",
  Agent: "agent",
  WebFetch: "fetch",
  WebSearch: "search",
  TodoWrite: "todo",
  TaskCreate: "task",
};

const CLASSIFY_ICON: Record<SubagentClassification, string> = {
  evaluator: "▣",
  "contract-review": "◆",
  worktree: "⌥",
  unknown: "·",
};

const CLASSIFY_LABEL: Record<SubagentClassification, string> = {
  evaluator: "evaluator",
  "contract-review": "contract",
  worktree: "worktree",
  unknown: "agent",
};

export function LiveAgentPanel({
  events,
  sensorTail,
  status,
  degradedReason,
  thresholds,
  activeSprintId,
  maxEvents = 6,
  maxSensorLines = 8,
  contentWidth = 36,
}: LiveAgentPanelProps): React.ReactElement {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = events.slice(-maxEvents);
  const tail = sensorTail.slice(-maxSensorLines);
  const tailWidth = Math.max(20, contentWidth - 2);
  const hasRunning = visible.some((e) => e.status === "running");

  return (
    <Panel title="Live Agents" titleColor={theme.accent} flexGrow={1} flexShrink={1}>
      <HeaderLine
        status={status}
        degradedReason={degradedReason}
        activeSprintId={activeSprintId ?? null}
        tick={tick}
        hasRunning={hasRunning}
      />
      {visible.length === 0 ? (
        <IdleRow status={status} tick={tick} />
      ) : (
        <Box flexDirection="column">
          {visible.map((e) => (
            <SubagentRow
              key={e.agentId}
              event={e}
              thresholds={thresholds}
              contentWidth={contentWidth}
              tick={tick}
            />
          ))}
        </Box>
      )}
      {tail.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.subtle}>── sensor tail ──</Text>
          {tail.map((line, i) => (
            <Text key={i} color={theme.dim}>
              {line.length > tailWidth ? line.slice(0, tailWidth - 1) + "…" : line || " "}
            </Text>
          ))}
        </Box>
      )}
    </Panel>
  );
}

function HeaderLine({
  status,
  degradedReason,
  activeSprintId,
  tick,
  hasRunning,
}: {
  status: LiveStatus;
  degradedReason: string | null | undefined;
  activeSprintId: number | null;
  tick: number;
  hasRunning: boolean;
}): React.ReactElement {
  if (status === "degraded") {
    return (
      <Box>
        <Text color={theme.warning}>degraded — </Text>
        <Text color={theme.dim}>{degradedReason ?? "polling fallback"}</Text>
      </Box>
    );
  }
  const spinChar = SPINNER[tick % SPINNER.length];
  return (
    <Box>
      {status === "watching" && hasRunning ? (
        <Text color={theme.success}>{spinChar} live</Text>
      ) : (
        <Text color={status === "watching" ? theme.success : theme.dim}>
          {status === "watching" ? "● live" : "○ idle"}
        </Text>
      )}
      {activeSprintId !== null && (
        <Text color={theme.dim}>{`  · sprint ${activeSprintId}`}</Text>
      )}
    </Box>
  );
}

function IdleRow({ status, tick }: { status: LiveStatus; tick: number }): React.ReactElement {
  if (status === "watching") {
    const spinChar = SPINNER[tick % SPINNER.length];
    return (
      <Text color={theme.dim}>{spinChar} scanning for sub-agents…</Text>
    );
  }
  return <Text color={theme.dim}>○ waiting for activity</Text>;
}

function SubagentRow({
  event,
  thresholds,
  contentWidth = 36,
  tick,
}: {
  event: SubagentEvent;
  thresholds?: EvaluatorScores;
  contentWidth?: number;
  tick: number;
}): React.ReactElement {
  const elapsed = formatElapsed(event, tick);
  const isRunning = event.status === "running";
  const stateColor = isRunning
    ? theme.warning
    : event.verdict.pass === false
    ? theme.error
    : event.verdict.pass === true
    ? theme.success
    : theme.dim;

  const promptBudget = Math.max(12, contentWidth - 2);
  const promptSnippet =
    event.prompt.length > promptBudget
      ? event.prompt.slice(0, promptBudget - 1) + "…"
      : event.prompt;
  const sprintSuffix = event.sprintId !== null ? ` (sp ${event.sprintId})` : "";
  const spinChar = SPINNER[tick % SPINNER.length];

  const lastTool = isRunning && event.recentToolCalls.length > 0
    ? event.recentToolCalls[event.recentToolCalls.length - 1]
    : null;

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box>
        <Text color={stateColor}>
          {isRunning ? spinChar : CLASSIFY_ICON[event.classified]}{" "}
          {CLASSIFY_LABEL[event.classified]}
          {sprintSuffix}
        </Text>
        <Text color={theme.dim}>  {elapsed}</Text>
      </Box>
      {lastTool ? (
        <ToolTicker tool={lastTool} contentWidth={contentWidth} />
      ) : (
        <Box>
          <Text color={theme.dim}>  {promptSnippet}</Text>
        </Box>
      )}
      {event.verdict.parsedScores && (
        <ScoreLine
          scores={event.verdict.parsedScores}
          thresholds={thresholds}
          contentWidth={contentWidth}
        />
      )}
    </Box>
  );
}

function ToolTicker({
  tool,
  contentWidth,
}: {
  tool: { name: string; target: string };
  contentWidth: number;
}): React.ReactElement {
  const abbrev = TOOL_ABBREV[tool.name] ?? tool.name.toLowerCase().slice(0, 8);
  const labelWidth = abbrev.length + 1; // "read " etc.
  const targetBudget = Math.max(8, contentWidth - 2 - labelWidth);
  const target = tool.target
    ? tool.target.length > targetBudget
      ? "…" + tool.target.slice(-(targetBudget - 1))
      : tool.target
    : "";
  return (
    <Box>
      <Text color={theme.dim}>{"  "}</Text>
      <Text color={theme.accent}>{abbrev}</Text>
      <Text color={theme.dim}>{" "}{target}</Text>
    </Box>
  );
}

const SCORE_FIELDS: Array<[keyof EvaluatorScores, string]> = [
  ["correctness", "C"],
  ["completeness", "M"],
  ["code_quality", "Q"],
  ["test_coverage", "T"],
  ["security", "S"],
  ["resilience", "R"],
];

function ScoreLine({
  scores,
  thresholds,
  contentWidth,
}: {
  scores: EvaluatorScores;
  thresholds?: EvaluatorScores;
  contentWidth: number;
}): React.ReactElement {
  // Each chip ~6 chars ("C:92 "), 6 chips = 36 chars + 2 indent = 38.
  // If panel is too narrow, drop optional fields (S, R) first, then to single line.
  const budget = Math.max(0, contentWidth - 2);
  const present = SCORE_FIELDS.filter(([f]) => typeof scores[f] === "number");
  const fitsAll = present.length * 6 <= budget;
  const visible = fitsAll ? present : present.slice(0, Math.max(0, Math.floor(budget / 6)));
  return (
    <Box>
      <Text color={theme.dim}>{"  "}</Text>
      {visible.map(([field, label]) => {
        const value = scores[field] as number;
        const threshold = thresholds?.[field];
        const passColor =
          threshold === undefined
            ? theme.text
            : value >= threshold
            ? theme.success
            : theme.error;
        return (
          <Text key={field} color={passColor}>
            {`${label}:${value} `}
          </Text>
        );
      })}
    </Box>
  );
}

// tick param forces re-evaluation every second for running agents (no-op for done agents)
function formatElapsed(event: SubagentEvent, _tick?: number): string {
  if (!event.startedAt) return "";
  const start = new Date(event.startedAt).getTime();
  if (!Number.isFinite(start)) return "";
  const end = event.endedAt ? new Date(event.endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}
