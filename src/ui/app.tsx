import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { StateManager } from "../state/manager.js";
import { HarnessEngine } from "../harness/engine.js";
import type { PipelineState, Sprint } from "../types.js";
import { readSessionSprints } from "../session/sprints.js";
import { readSessionActivity } from "../session/activity.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { theme } from "./theme.js";
import { Header } from "./components/header.js";
import { SprintTable } from "./components/sprint-table.js";
import { ActivityLog } from "./components/activity-log.js";
import { SensorPanel } from "./components/sensor-panel.js";
import { StatusBar } from "./components/status-bar.js";
import { UsagePanel } from "./components/usage-panel.js";
import { CommandInput, COMMANDS } from "./components/command-input.js";
import type { Command } from "./components/command-input.js";

interface AppProps {
  cwd: string;
  refreshInterval?: number;
}

export type View = "dashboard" | "sensors" | "usage" | "help" | "sprint-detail";

export function App({ cwd, refreshInterval = 3000 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<PipelineState | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [commandActive, setCommandActive] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
  const { columns, isNarrow, rows } = useTerminalSize();

  const stateManager = new StateManager(cwd);
  const harness = new HarnessEngine(cwd);

  useEffect(() => {
    const load = async () => {
      const s = await stateManager.load(true);
      // Merge session-detected sprints (ground truth when state.json is stale)
      const sessionSprints = await readSessionSprints(cwd);
      if (sessionSprints.length > s.sprints.length) {
        const stateIds = new Set(s.sprints.map((sp) => sp.id));
        for (const ss of sessionSprints) {
          if (!stateIds.has(ss.id)) {
            s.sprints.push({
              id: ss.id,
              task: ss.task,
              status: ss.status === "done" ? "done" : ss.status === "in_progress" ? "build" : "contract",
              contract: "",
              score: null,
              evaluator_scores: null,
              cost: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
              startedAt: null,
              completedAt: null,
            } as Sprint);
          }
        }
        s.sprints.sort((a, b) => a.id - b.id);
      }
      // Merge session activity (real-time from JSONL)
      const sessionActivity = await readSessionActivity(cwd);
      if (sessionActivity.length > 0) {
        // Combine: state.json activity + session activity, deduplicated
        const existing = new Set(s.activity.map((a) => `${a.type}:${a.message}`));
        for (const a of sessionActivity) {
          if (!existing.has(`${a.type}:${a.message}`)) {
            s.activity.push(a);
          }
        }
        // Sort by timestamp and keep last 50
        s.activity.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        if (s.activity.length > 50) s.activity = s.activity.slice(-50);
      }
      setState(s);
      setLastRefresh(new Date());
    };

    load();
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, []);

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const refresh = async () => {
    const s = await stateManager.load(true);
    setState(s);
    setLastRefresh(new Date());
    setFeedback({ text: "Refreshed", color: theme.success });
  };

  const handleCommand = async (cmd: Command) => {
    switch (cmd.name) {
      case "dashboard":
      case "d":
        setView("dashboard");
        break;

      case "sensors":
      case "s":
        setView("sensors");
        break;

      case "usage":
      case "u":
        setView("usage");
        break;

      case "refresh":
      case "r":
        await refresh();
        break;

      case "resume":
        if (state?.status === "paused") {
          await stateManager.setStatus("running");
          await refresh();
          setFeedback({ text: "Pipeline resumed", color: theme.success });
        } else {
          setFeedback({ text: "Pipeline is not paused", color: theme.warning });
        }
        break;

      case "pause":
        if (state?.status === "running") {
          await stateManager.setStatus("paused");
          await refresh();
          setFeedback({ text: "Pipeline paused", color: theme.warning });
        } else {
          setFeedback({ text: "Pipeline is not running", color: theme.warning });
        }
        break;

      case "unblock":
        await stateManager.clearBlockers();
        await refresh();
        setFeedback({ text: "Blockers cleared", color: theme.success });
        break;

      case "sprint":
      case "sp": {
        const id = parseInt(cmd.args[0], 10);
        if (id && state?.sprints.find((s) => s.id === id)) {
          setSelectedSprint(id);
          setView("sprint-detail");
        } else {
          setFeedback({ text: "Usage: /sprint <id>", color: theme.warning });
        }
        break;
      }

      case "log": {
        const msg = cmd.args.join(" ");
        if (msg) {
          await stateManager.logActivity("info", msg);
          await refresh();
          setFeedback({ text: "Logged", color: theme.success });
        } else {
          setFeedback({ text: "Usage: /log <message>", color: theme.warning });
        }
        break;
      }

      case "help":
      case "?":
        setView("help");
        break;

      case "quit":
      case "q":
        exit();
        break;

      default:
        setFeedback({ text: `Unknown command: /${cmd.name}`, color: theme.error });
    }
  };

  // Keyboard shortcuts (only when command input is not active)
  useInput((input, key) => {
    if (commandActive) return;

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (input === "1") setView("dashboard");
    if (input === "2") setView("sensors");
    if (input === "3") setView("usage");
    if (input === "?") setView("help");
    if (input === "r") refresh();
  });

  if (!state) {
    return (
      <Box flexDirection="column" width={columns}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.brand}
          paddingX={2}
          paddingY={1}
          alignItems="center"
        >
          <Text bold color={theme.brand}>ADP</Text>
          <Text color={theme.dim}>Autonomous Development Pipeline</Text>
          <Text color={theme.dim} italic>Spec-to-code sprints with feedback control</Text>
          <Box marginTop={1}>
            <Text color={theme.warning}>Loading pipeline state...</Text>
          </Box>
          <Text color={theme.dim}>{cwd}</Text>
        </Box>
      </Box>
    );
  }

  const maxSprintRows = rows > 30 ? undefined : rows - 16;
  const sprint = selectedSprint ? state.sprints.find((s) => s.id === selectedSprint) : null;

  return (
    <Box flexDirection="column" width={columns}>
      <Header state={state} lastRefresh={lastRefresh} cwd={cwd} />

      <Box marginTop={1} flexGrow={1}>
        {view === "dashboard" && (
          isNarrow ? (
            <Box flexDirection="column" width="100%">
              <SprintTable sprints={state.sprints} maxRows={maxSprintRows} isActive={!commandActive} />
              <Box marginTop={1}>
                <ActivityLog activity={state.activity} limit={8} />
              </Box>
            </Box>
          ) : (
            <Box flexDirection="row" width="100%">
              <SprintTable sprints={state.sprints} maxRows={maxSprintRows} isActive={!commandActive} />
              <Box marginLeft={1}>
                <ActivityLog activity={state.activity} limit={rows > 30 ? 16 : 10} />
              </Box>
            </Box>
          )
        )}

        {view === "sensors" && (
          <SensorPanel harness={harness} cwd={cwd} />
        )}

        {view === "usage" && (
          <UsagePanel state={state} cwd={cwd} />
        )}

        {view === "sprint-detail" && sprint && (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.info}
            paddingX={2}
            paddingY={1}
            flexGrow={1}
          >
            <Text bold color={theme.info}>Sprint #{sprint.id}</Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text color={theme.dim}>{"Task:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.task}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Status:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.status}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Score:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.score !== null ? `${sprint.score}/10` : "—"}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Contract:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.contract || "—"}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Started:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.startedAt || "—"}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Completed:".padEnd(12)}</Text>
                <Text color={theme.text}>{sprint.completedAt || "—"}</Text>
              </Box>
              <Box>
                <Text color={theme.dim}>{"Tokens:".padEnd(12)}</Text>
                <Text color={theme.text}>
                  {sprint.cost.total_tokens > 0
                    ? `${sprint.cost.input_tokens.toLocaleString()} in / ${sprint.cost.output_tokens.toLocaleString()} out`
                    : "—"}
                </Text>
              </Box>
            </Box>
          </Box>
        )}

        {view === "help" && (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={2}
            paddingY={1}
          >
            <Text bold color={theme.brand}>Commands</Text>
            <Text color={theme.dim}>Press / to open command input, then type:</Text>
            <Box marginTop={1} flexDirection="column">
              {COMMANDS.map((c, i) => (
                <Box key={i}>
                  <Text color={theme.accent} bold>
                    {(c.cmd + (c.alias ? `, ${c.alias}` : "")).padEnd(18)}
                  </Text>
                  <Text color={theme.text}>{c.desc}</Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text bold color={theme.brand}>Keyboard Shortcuts</Text>
              <Text color={theme.dim}>(when command input is not active)</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text color={theme.accent} bold>{"1".padEnd(6)}</Text>
                <Text color={theme.text}>Dashboard</Text>
              </Box>
              <Box>
                <Text color={theme.accent} bold>{"2".padEnd(6)}</Text>
                <Text color={theme.text}>Sensors</Text>
              </Box>
              <Box>
                <Text color={theme.accent} bold>{"3".padEnd(6)}</Text>
                <Text color={theme.text}>Usage & Costs</Text>
              </Box>
              <Box>
                <Text color={theme.accent} bold>{"r".padEnd(6)}</Text>
                <Text color={theme.text}>Refresh</Text>
              </Box>
              <Box>
                <Text color={theme.accent} bold>{"?".padEnd(6)}</Text>
                <Text color={theme.text}>Help</Text>
              </Box>
              <Box>
                <Text color={theme.accent} bold>{"q".padEnd(6)}</Text>
                <Text color={theme.text}>Quit</Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.dim}>Terminal: {columns}x{rows} │ Refresh: {refreshInterval / 1000}s │ {cwd}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Feedback toast */}
      {feedback && (
        <Box paddingX={1}>
          <Text color={feedback.color}>{feedback.text}</Text>
        </Box>
      )}

      {/* Command input */}
      <CommandInput
        onCommand={handleCommand}
        isActive={commandActive}
        onActivate={() => setCommandActive(true)}
        onDeactivate={() => setCommandActive(false)}
      />

      {/* Live status bar */}
      <StatusBar
        state={state}
        startedAt={state.startedAt ? new Date(state.startedAt) : null}
        cwd={cwd}
      />
    </Box>
  );
}
