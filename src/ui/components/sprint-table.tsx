import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { Sprint } from "../../types.js";
import { theme, sprintStyle } from "../theme.js";
import { Panel } from "./panel.js";

interface SprintTableProps {
  sprints: Sprint[];
  maxRows?: number;
  isActive?: boolean;
  /**
   * Inner content width hint (excluding panel border/padding). Drives column widths
   * so the table never overflows or visually clips its neighbour panel.
   */
  contentWidth?: number;
}

const PAGE_SIZE = 10;

// Column widths chosen so the data row aligns with the header row regardless of
// the panel width. When `contentWidth` shrinks past breakpoints, columns drop:
//   < 35 cols  →  id + status icon + task   (compact)
//   35–49 cols →  id + status + score + task
//   >= 50 cols →  + eval column
const COL = {
  id: 4,
  status: 12,
  statusCompact: 3, // icon + space when there's no room for the word
  score: 7,
  eval: 14,
} as const;

export function SprintTable({
  sprints,
  maxRows,
  isActive = true,
  contentWidth = 60,
}: SprintTableProps): React.ReactElement {
  const limit = maxRows ?? PAGE_SIZE;
  const needsScroll = sprints.length > limit;
  const [scrollOffset, setScrollOffset] = useState(0);

  const hasScore = contentWidth >= 35;
  const hasEval = contentWidth >= 50 && sprints.some((s) => s.evaluator_scores !== null);
  const compactStatus = contentWidth < 28;
  const statusW = compactStatus ? COL.statusCompact : COL.status;
  const fixedW = COL.id + statusW + (hasScore ? COL.score : 0) + (hasEval ? COL.eval : 0);
  const taskW = Math.max(6, contentWidth - fixedW);

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
          {/* Header — column widths match data rows so labels align under values. */}
          <Box>
            <Box width={COL.id}><Text color={theme.dim}>#</Text></Box>
            <Box width={statusW}><Text color={theme.dim}>{compactStatus ? "·" : "Status"}</Text></Box>
            {hasScore && <Box width={COL.score}><Text color={theme.dim}>Score</Text></Box>}
            {hasEval && <Box width={COL.eval}><Text color={theme.dim}>Eval</Text></Box>}
            <Box width={taskW}><Text color={theme.dim}>Task</Text></Box>
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
            const score = scoreVal !== null && scoreVal !== undefined
              ? `${scoreVal}/100`
              : "—";
            const scoreGood = scoreVal !== null && scoreVal !== undefined && scoreVal >= 85;
            const taskTrim = sprint.task.length > taskW - 1
              ? sprint.task.slice(0, Math.max(0, taskW - 2)) + "…"
              : sprint.task;
            const isLive = sprint.status === "build" || sprint.status === "qa" || sprint.status === "evaluating";
            const liveMark = isLive ? "▸ " : "";

            // Evaluator mini-display: C:92 Q:85 (clipped to fit column).
            let evalDisplay = "";
            if (hasEval && sprint.evaluator_scores) {
              const e = sprint.evaluator_scores;
              evalDisplay = `C:${e.correctness} Q:${e.code_quality}`;
              if (evalDisplay.length > COL.eval - 1) {
                evalDisplay = evalDisplay.slice(0, COL.eval - 2) + "…";
              }
            }

            return (
              <Box key={sprint.id}>
                <Box width={COL.id}>
                  <Text color={theme.dim}>{liveMark}{sprint.id}</Text>
                </Box>
                <Box width={statusW}>
                  <Text color={color}>
                    {compactStatus ? icon : `${icon} ${sprint.status}`}
                  </Text>
                </Box>
                {hasScore && (
                  <Box width={COL.score}>
                    <Text color={scoreGood ? theme.success : theme.text}>{score}</Text>
                  </Box>
                )}
                {hasEval && (
                  <Box width={COL.eval}>
                    <Text color={sprint.evaluator_scores ? theme.accent : theme.dim}>
                      {evalDisplay || "—"}
                    </Text>
                  </Box>
                )}
                <Box width={taskW}>
                  <Text color={isLive ? theme.warning : theme.text}>{taskTrim}</Text>
                </Box>
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
