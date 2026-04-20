import React from "react";
import { Box, Text } from "ink";
import { theme, statusStyle, defaultStatusStyle } from "../theme.js";

interface StatusBarProps {
  state: {
    status: string;
    phase: string | null;
    sprints: Array<{
      status: string;
      score: number | null;
      cost: { input_tokens: number; output_tokens: number; total_tokens: number };
    }>;
    blockers: unknown[];
    activity: unknown[];
  };
  startedAt: Date | null;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTokens(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function StatusBar({ state, startedAt }: StatusBarProps): React.ReactElement {
  const { label, color } = statusStyle[state.status] || defaultStatusStyle;

  const done = state.sprints.filter((s) => s.status === "done").length;
  const failed = state.sprints.filter((s) => s.status === "failed").length;
  const total = state.sprints.length;
  const active = state.sprints.find(
    (s) => s.status === "build" || s.status === "qa" || s.status === "contract"
  );

  // Total token cost across all sprints
  const totalInput = state.sprints.reduce((sum, s) => sum + (s.cost?.input_tokens ?? 0), 0);
  const totalOutput = state.sprints.reduce((sum, s) => sum + (s.cost?.output_tokens ?? 0), 0);
  const totalTokens = totalInput + totalOutput;

  // Elapsed time
  const elapsed = startedAt ? Date.now() - startedAt.getTime() : 0;

  // Average score
  const scored = state.sprints.filter((s) => s.score !== null);
  const avgScore = scored.length > 0
    ? (scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length).toFixed(1)
    : null;

  // Activity count
  const activityCount = state.activity.length;

  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text color={color} bold>● {label}</Text>
        {state.phase && (
          <>
            <Text color={theme.dim}> │ </Text>
            <Text color={theme.accent}>{state.phase}</Text>
          </>
        )}
        <Text color={theme.dim}> │ </Text>
        {total > 0 ? (
          <>
            <Text color={theme.text}>{done}/{total} sprints</Text>
            {failed > 0 && <Text color={theme.error}> ({failed} failed)</Text>}
          </>
        ) : (
          <Text color={theme.dim}>{activityCount} events</Text>
        )}
        {active && (
          <>
            <Text color={theme.dim}> │ </Text>
            <Text color={theme.info}>sprint active</Text>
          </>
        )}
        {state.blockers.length > 0 && (
          <>
            <Text color={theme.dim}> │ </Text>
            <Text color={theme.error}>{state.blockers.length} blocked</Text>
          </>
        )}
      </Box>

      <Box>
        {avgScore && (
          <>
            <Text color={theme.success}>avg {avgScore}</Text>
            <Text color={theme.dim}> │ </Text>
          </>
        )}
        {totalTokens > 0 && (
          <>
            <Text color={theme.accent}>{formatTokens(totalInput)}↑ {formatTokens(totalOutput)}↓</Text>
            <Text color={theme.dim}> │ </Text>
          </>
        )}
        {elapsed > 0 ? (
          <Text color={theme.dim}>{formatElapsed(elapsed)}</Text>
        ) : (
          <Text color={theme.dim}>—</Text>
        )}
      </Box>
    </Box>
  );
}
