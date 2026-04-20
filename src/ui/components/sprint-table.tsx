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
  const hasEval = sprints.some((s) => s.evaluator_scores !== null);

  return (
    <Panel title="Sprints" titleColor={theme.info} flexGrow={1}>
      {sprints.length === 0 ? (
        <Text color={theme.dim}>No sprints yet. Run adp to start.</Text>
      ) : (
        <Box flexDirection="column">
          <Box>
            <Text color={theme.dim}>
              {"#".padEnd(4)}{"Status".padEnd(12)}{"Score".padEnd(7)}
              {hasEval && "Eval".padEnd(16)}
              Task
            </Text>
          </Box>
          {visible.map((sprint) => {
            const { icon, color } = sprintStyle[sprint.status] || { icon: "?", color: theme.dim };
            const scoreVal = sprint.score;
            const score = scoreVal !== null
              ? (scoreVal > 10 ? `${scoreVal}%` : `${scoreVal}/10`)
              : " — ";
            const scoreGood = scoreVal !== null && (scoreVal > 10 ? scoreVal >= 80 : scoreVal >= 8);
            const task = sprint.task.length > (hasEval ? 28 : 36)
              ? sprint.task.slice(0, hasEval ? 25 : 33) + "..."
              : sprint.task;

            // Evaluator mini-display: C:92 Q:85
            let evalDisplay = "";
            if (hasEval && sprint.evaluator_scores) {
              const e = sprint.evaluator_scores;
              evalDisplay = `C:${e.correctness} Q:${e.code_quality}`;
            }

            return (
              <Box key={sprint.id}>
                <Text color={theme.dim}>{String(sprint.id).padEnd(4)}</Text>
                <Text color={color}>{`${icon} ${sprint.status}`.padEnd(12)}</Text>
                <Text color={scoreGood ? theme.success : theme.text}>
                  {score.padEnd(7)}
                </Text>
                {hasEval && (
                  <Text color={sprint.evaluator_scores ? theme.accent : theme.dim}>
                    {(evalDisplay || " — ").padEnd(16)}
                  </Text>
                )}
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
