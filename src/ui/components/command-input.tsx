import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme.js";

export interface Command {
  name: string;
  args: string[];
  raw: string;
}

interface CommandInputProps {
  onCommand: (cmd: Command) => void;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

const COMMANDS = [
  { cmd: "/dashboard", alias: "/d", desc: "Switch to dashboard view" },
  { cmd: "/sensors", alias: "/s", desc: "Run and show sensors" },
  { cmd: "/usage", alias: "/u", desc: "Token usage & cost breakdown" },
  { cmd: "/evaluate", alias: "/e", desc: "Score unscored sprints" },
  { cmd: "/refresh", alias: "/r", desc: "Force refresh pipeline state" },
  { cmd: "/resume", alias: null, desc: "Resume paused pipeline" },
  { cmd: "/pause", alias: null, desc: "Pause running pipeline" },
  { cmd: "/unblock", alias: null, desc: "Clear all blockers" },
  { cmd: "/sprint", alias: "/sp", desc: "Show sprint detail (/sprint 3)" },
  { cmd: "/log", alias: null, desc: "Add log entry (/log message)" },
  { cmd: "/help", alias: "/?", desc: "Show available commands" },
  { cmd: "/quit", alias: "/q", desc: "Exit ADP" },
];

function getMatches(input: string): typeof COMMANDS {
  if (!input.startsWith("/")) return [];
  const partial = input.toLowerCase();
  return COMMANDS.filter(
    (c) => c.cmd.startsWith(partial) || (c.alias && c.alias.startsWith(partial))
  );
}

export function CommandInput({ onCommand, isActive, onActivate, onDeactivate }: CommandInputProps): React.ReactElement {
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<typeof COMMANDS>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const updateMatches = (v: string) => {
    const m = getMatches(v);
    setMatches(m);
    setSelectedIdx(0);
  };

  useInput((input, key) => {
    if (!isActive) {
      if (input === "/" || input === ":") {
        onActivate();
        setValue("/");
        updateMatches("/");
      }
      return;
    }

    // Tab → fill the selected suggestion
    if (key.tab) {
      if (matches.length > 0) {
        const completed = matches[selectedIdx].cmd + " ";
        setValue(completed);
        setMatches([]);
      }
      return;
    }

    // Arrow up/down → navigate suggestions
    if (key.upArrow) {
      setSelectedIdx((i) => (i > 0 ? i - 1 : matches.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIdx((i) => (i < matches.length - 1 ? i + 1 : 0));
      return;
    }

    // Submit on Enter
    if (key.return) {
      let final = value.trim();
      // If user presses Enter on a partial match, complete it first
      if (matches.length === 1 && !final.includes(" ")) {
        final = matches[0].cmd;
      }
      if (final) {
        const parts = final.split(/\s+/);
        const name = parts[0].startsWith("/") ? parts[0].slice(1) : parts[0];
        onCommand({ name, args: parts.slice(1), raw: final });
      }
      setValue("");
      setMatches([]);
      setSelectedIdx(0);
      onDeactivate();
      return;
    }

    // Cancel on Escape
    if (key.escape) {
      setValue("");
      setMatches([]);
      setSelectedIdx(0);
      onDeactivate();
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      const next = value.slice(0, -1);
      setValue(next);
      if (!next) {
        setMatches([]);
        onDeactivate();
      } else {
        updateMatches(next);
      }
      return;
    }

    // Ignore other control keys
    if (key.ctrl || key.meta || key.leftArrow || key.rightArrow) {
      return;
    }

    // Append character
    if (input) {
      const next = value + input;
      setValue(next);
      updateMatches(next);
    }
  });

  // Ghost text from the selected match
  const topMatch = matches.length > 0 ? matches[selectedIdx] : null;
  const ghost = topMatch && value.length > 0 && topMatch.cmd.startsWith(value)
    ? topMatch.cmd.slice(value.length)
    : "";

  return (
    <Box flexDirection="column">
      {/* Suggestion dropdown */}
      {isActive && matches.length > 0 && value.length > 1 && (
        <Box flexDirection="column" paddingX={2}>
          {matches.map((m, i) => (
            <Box key={i}>
              <Text color={i === selectedIdx ? theme.bright : theme.dim}>
                {i === selectedIdx ? "▸ " : "  "}
              </Text>
              <Text color={i === selectedIdx ? theme.accent : theme.dim} bold={i === selectedIdx}>
                {m.cmd}
              </Text>
              {m.alias && (
                <Text color={theme.dim}> {m.alias}</Text>
              )}
              <Text color={theme.dim}> — {m.desc}</Text>
            </Box>
          ))}
          <Box marginTop={0}>
            <Text color={theme.subtle}>  tab complete · ↑↓ select · enter run · esc cancel</Text>
          </Box>
        </Box>
      )}

      {/* Input bar */}
      <Box
        borderStyle="round"
        borderColor={isActive ? theme.accent : theme.subtle}
        paddingX={1}
      >
        <Text color={theme.accent} bold>{">"} </Text>
        {isActive ? (
          <Box>
            <Text color={theme.bright}>{value}</Text>
            <Text color={theme.subtle}>{ghost}</Text>
            <Text color={theme.accent}>█</Text>
            {topMatch && ghost === "" && value !== topMatch.cmd + " " && (
              <Text color={theme.dim}>  {topMatch.desc}</Text>
            )}
          </Box>
        ) : (
          <Text color={theme.dim}>type / to command</Text>
        )}
      </Box>
    </Box>
  );
}

export { COMMANDS };
