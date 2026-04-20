import React from "react";
import { Box, Text } from "ink";
import { theme, statusStyle, defaultStatusStyle, progressBar } from "../theme.js";

interface HeaderProps {
  state: {
    status: string;
    phase: string | null;
    feature: string | null;
    sprints: Array<{ status: string }>;
    blockers: unknown[];
  };
  lastRefresh: Date;
  cwd: string;
}

export function Header({ state, lastRefresh, cwd }: HeaderProps): React.ReactElement {
  const { label, color } = statusStyle[state.status] || defaultStatusStyle;
  const done = state.sprints.filter((s) => s.status === "done").length;
  const total = state.sprints.length;
  const ratio = total > 0 ? done / total : 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.brand}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={theme.brand}>ADP</Text>
          <Text color={theme.dim}> — Autonomous Development Pipeline │ </Text>
          <Text color={color} bold>● {label}</Text>
          {state.phase && (
            <>
              <Text color={theme.dim}> │ </Text>
              <Text color={theme.accent}>{state.phase}</Text>
            </>
          )}
          {state.feature && (
            <>
              <Text color={theme.dim}> │ </Text>
              <Text color={theme.text}>{state.feature}</Text>
            </>
          )}
        </Box>
        <Box>
          <Text dimColor>{lastRefresh.toLocaleTimeString()}</Text>
        </Box>
      </Box>

      <Box marginTop={0}>
        {total > 0 ? (
          <>
            <Text color={theme.dim}>Sprints </Text>
            <Text color={ratio === 1 ? theme.success : theme.info}>
              {progressBar(ratio, 20)}
            </Text>
            <Text color={theme.text}> {done}/{total}</Text>
          </>
        ) : (
          <Text color={theme.dim}>No sprints yet</Text>
        )}
        {state.blockers.length > 0 && (
          <Text color={theme.error}> │ {state.blockers.length} blocker(s)</Text>
        )}
        <Text color={theme.dim}> │ {cwd}</Text>
      </Box>
    </Box>
  );
}
