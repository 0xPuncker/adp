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
}

export function ActivityLog({ activity, limit = 12 }: ActivityLogProps): React.ReactElement {
  const recent = activity.slice(-limit).reverse();

  return (
    <Panel title="Activity" titleColor={theme.accent} width={34}>
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
            const msg = entry.message.length > 22
              ? entry.message.slice(0, 19) + "..."
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
