import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface PanelProps {
  title?: string;
  titleColor?: string;
  borderColor?: string;
  width?: number | string;
  height?: number | string;
  minHeight?: number;
  flexGrow?: number;
  flexShrink?: number;
  children: React.ReactNode;
}

export function Panel({
  title,
  titleColor = theme.brand,
  borderColor = theme.border,
  width,
  height,
  minHeight,
  flexGrow,
  flexShrink,
  children,
}: PanelProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      width={width as number}
      height={height as number}
      minHeight={minHeight}
      flexGrow={flexGrow}
      flexShrink={flexShrink}
      paddingX={1}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={titleColor}>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
