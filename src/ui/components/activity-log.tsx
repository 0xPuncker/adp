import React from "react";
import { Box, Text } from "ink";
import { theme, activityStyle, defaultActivityStyle } from "../theme.js";
import { Panel } from "./panel.js";

interface ActivityEntry {
  timestamp: string;
  type: string;
  message: string;
}

interface ActivityLogProps {
  activity: ActivityEntry[];
  limit?: number;
  /** Inner content width (excluding panel border/padding). Defaults to 28. */
  contentWidth?: number;
}

export function ActivityLog({ activity, limit = 12, contentWidth = 28 }: ActivityLogProps): React.ReactElement {
  const recent = activity.slice(-limit).reverse();
  // Reserve 8 chars for "HH:MM ▸ " then clamp message to remaining width.
  const msgWidth = Math.max(8, contentWidth - 8);

  return (
    <Panel title="Activity" titleColor={theme.accent} flexGrow={1} flexShrink={1}>
      {recent.length === 0 ? (
        <Text color={theme.dim}>No activity yet.</Text>
      ) : (
        <Box flexDirection="column">
          {recent.map((entry, i) => {
            const style = activityStyle[entry.type] || defaultActivityStyle;
            const time = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const msg = entry.message.length > msgWidth
              ? entry.message.slice(0, Math.max(0, msgWidth - 1)) + "…"
              : entry.message;

            return (
              <Box key={i}>
                <Text color={theme.dim}>{time} </Text>
                <Text color={style.color}>{style.icon} </Text>
                <Text color={theme.text}>{msg}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Panel>
  );
}
