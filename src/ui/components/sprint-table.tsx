import React from "react";
import { Box, Text } from "ink";
import type { Sprint } from "../../types.js";
import { theme, sprintStyle } from "../theme.js";
import { Panel } from "./panel.js";

interface SprintTableProps {
  sprints: Sprint[];
  maxRows?: number;
}

export function SprintTable({ sprints, maxRows }: SprintTableProps): React.ReactElement {
  const visible = maxRows ? sprints.slice(0, maxRows) : sprints;
  const hidden = maxRows && sprints.length > maxRows ? sprints.length - maxRows : 0;

  return (
    <Panel title="Sprints" titleColor={theme.info} flexGrow={1}>
      {sprints.length === 0 ? (
        <Text color={theme.dim}>No sprints yet. Run adp to start.</Text>
      ) : (
        <Box flexDirection="column">
          <Box>
            <Text color={theme.dim}>
              {"#".padEnd(4)}{"Status".padEnd(12)}{"Score".padEnd(7)}Task
            </Text>
          </Box>
          {visible.map((sprint) => {
            const { icon, color } = sprintStyle[sprint.status] || { icon: "?", color: theme.dim };
            const score = sprint.score !== null ? `${sprint.score}/10` : " — ";
            const task = sprint.task.length > 36 ? sprint.task.slice(0, 33) + "..." : sprint.task;

            return (
              <Box key={sprint.id}>
                <Text color={theme.dim}>{String(sprint.id).padEnd(4)}</Text>
                <Text color={color}>{`${icon} ${sprint.status}`.padEnd(12)}</Text>
                <Text color={sprint.score !== null && sprint.score >= 8 ? theme.success : theme.text}>
                  {score.padEnd(7)}
                </Text>
                <Text color={theme.text}>{task}</Text>
              </Box>
            );
          })}
          {hidden > 0 && (
            <Text color={theme.dim}>  +{hidden} more...</Text>
          )}
        </Box>
      )}
    </Panel>
  );
}
