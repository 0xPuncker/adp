import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";
import { readSessionCosts } from "../../session/costs.js";
import { saveUsageReport } from "../../session/tracker.js";
import type { SessionCost } from "../../session/costs.js";
import type { UsageReport } from "../../session/tracker.js";
import type { PipelineState } from "../../types.js";

interface UsagePanelProps {
  state: PipelineState;
  cwd: string;
}

function fmt(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtUsd(n: number): string {
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

export function UsagePanel({ state, cwd }: UsagePanelProps): React.ReactElement {
  const [session, setSession] = useState<SessionCost | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);

  useEffect(() => {
    const load = async () => {
      const s = await readSessionCosts(cwd);
      setSession(s);
      const r = await saveUsageReport(cwd, state);
      setReport(r);
    };
    load();
  }, [cwd, state]);

  if (!session) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color={theme.dim}>Loading usage data...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Session totals */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.accent}
        paddingX={2}
        paddingY={1}
      >
        <Text bold color={theme.accent}>Token Usage (Session Total)</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={theme.dim}>{"Input:".padEnd(16)}</Text>
            <Text color={theme.text}>{fmt(session.input_tokens)} tokens</Text>
          </Box>
          <Box>
            <Text color={theme.dim}>{"Output:".padEnd(16)}</Text>
            <Text color={theme.text}>{fmt(session.output_tokens)} tokens</Text>
          </Box>
          <Box>
            <Text color={theme.dim}>{"Cache Read:".padEnd(16)}</Text>
            <Text color={theme.text}>{fmt(session.cache_read_tokens)} tokens</Text>
          </Box>
          <Box>
            <Text color={theme.dim}>{"Cache Write:".padEnd(16)}</Text>
            <Text color={theme.text}>{fmt(session.cache_write_tokens)} tokens</Text>
          </Box>
          <Box>
            <Text color={theme.dim}>{"Total:".padEnd(16)}</Text>
            <Text color={theme.bright} bold>{fmt(session.total_tokens)} tokens</Text>
          </Box>
          <Box>
            <Text color={theme.dim}>{"Messages:".padEnd(16)}</Text>
            <Text color={theme.text}>{session.messages}</Text>
          </Box>
          {report?.cost_estimate_usd != null && (
            <Box>
              <Text color={theme.dim}>{"Est. Cost:".padEnd(16)}</Text>
              <Text color={theme.warning} bold>{fmtUsd(report.cost_estimate_usd)}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Per-sprint breakdown */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        <Text bold color={theme.brand}>Per-Sprint Breakdown</Text>
        <Box marginTop={1} flexDirection="column">
          {/* Header */}
          <Box>
            <Text color={theme.dim} bold>
              {"#".padEnd(4)}{"Task".padEnd(32)}{"Status".padEnd(10)}{"Duration".padEnd(10)}{"Score".padEnd(8)}
            </Text>
          </Box>
          {/* Rows */}
          {state.sprints.map((s) => {
            const duration = s.startedAt && s.completedAt
              ? Math.floor((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
              : null;
            const taskLabel = s.task.length > 30 ? s.task.slice(0, 28) + ".." : s.task;
            const scoreLabel = s.score !== null
              ? (s.score > 10 ? `${s.score}%` : `${s.score}/10`)
              : "—";

            return (
              <Box key={s.id}>
                <Text color={theme.accent}>{String(s.id).padEnd(4)}</Text>
                <Text color={theme.text}>{taskLabel.padEnd(32)}</Text>
                <Text color={s.status === "done" ? theme.success : s.status === "failed" ? theme.error : theme.dim}>
                  {s.status.padEnd(10)}
                </Text>
                <Text color={theme.text}>{fmtDuration(duration).padEnd(10)}</Text>
                <Text color={theme.text}>{scoreLabel.padEnd(8)}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={1} marginTop={1}>
        <Text color={theme.dim}>
          Saved to .adp/usage.json · Use for tuning (token budgets, timing, thresholds)
        </Text>
      </Box>
    </Box>
  );
}
