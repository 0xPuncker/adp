import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { Sprint } from "../../types.js";
import { theme, sprintStyle } from "../theme.js";
import { Panel } from "./panel.js";

interface SprintTableProps {
  sprints: Sprint[];
  maxRows?: number;
  isActive?: boolean;
}

const PAGE_SIZE = 10;

export function SprintTable({ sprints, maxRows, isActive = true }: SprintTableProps): React.ReactElement {
  const limit = maxRows ?? PAGE_SIZE;
  const needsScroll = sprints.length > limit;
  const [scrollOffset, setScrollOffset] = useState(0);
  const hasEval = sprints.some((s) => s.evaluator_scores !== null);

  // Auto-scroll to bottom when new sprints are added
  useEffect(() => {
    if (sprints.length > limit) {
      setScrollOffset(Math.max(0, sprints.length - limit));
    }
  }, [sprints.length]);

  // Scroll with j/k or up/down when active
  useInput((input, key) => {
    if (!isActive || !needsScroll) return;

    const maxOffset = Math.max(0, sprints.length - limit);

    if (input === "j" || key.downArrow) {
      setScrollOffset((o) => Math.min(o + 1, maxOffset));
    }
    if (input === "k" || key.upArrow) {
      setScrollOffset((o) => Math.max(o - 1, 0));
    }
    // Page down/up
    if (input === "J" || key.pageDown) {
      setScrollOffset((o) => Math.min(o + limit, maxOffset));
    }
    if (input === "K" || key.pageUp) {
      setScrollOffset((o) => Math.max(o - limit, 0));
    }
    // Home/End
    if (input === "g") {
      setScrollOffset(0);
    }
    if (input === "G") {
      setScrollOffset(maxOffset);
    }
  });

  const visible = sprints.slice(scrollOffset, scrollOffset + limit);
  const totalPages = Math.ceil(sprints.length / limit);
  const currentPage = Math.floor(scrollOffset / limit) + 1;

  return (
    <Panel title="Sprints" titleColor={theme.info} flexGrow={1}>
      {sprints.length === 0 ? (
        <Text color={theme.dim}>No sprints yet. Run adp to start.</Text>
      ) : (
        <Box flexDirection="column">
          {/* Header */}
          <Box>
            <Text color={theme.dim}>
              {"#".padEnd(4)}{"Status".padEnd(12)}{"Score".padEnd(7)}
              {hasEval && "Eval".padEnd(16)}
              Task
            </Text>
          </Box>

          {/* Scroll indicator top */}
          {needsScroll && scrollOffset > 0 && (
            <Box>
              <Text color={theme.subtle}>  ▲ {scrollOffset} above</Text>
            </Box>
          )}

          {/* Sprint rows */}
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

          {/* Scroll indicator bottom */}
          {needsScroll && scrollOffset + limit < sprints.length && (
            <Box>
              <Text color={theme.subtle}>  ▼ {sprints.length - scrollOffset - limit} below</Text>
            </Box>
          )}

          {/* Scroll bar / page info */}
          {needsScroll && (
            <Box marginTop={0}>
              <Text color={theme.dim}>
                {` ${sprints.length} sprints`} │ {currentPage}/{totalPages}
                {" │ "}
              </Text>
              <Text color={theme.subtle}>j/k scroll  g/G top/end</Text>
            </Box>
          )}
        </Box>
      )}
    </Panel>
  );
}
