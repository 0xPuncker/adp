import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { HarnessEngine, SensorResult } from "../../harness/engine.js";
import { theme } from "../theme.js";
import { Panel } from "./panel.js";

interface SensorPanelProps {
  harness: HarnessEngine;
  cwd: string;
}

export function SensorPanel({ harness }: SensorPanelProps): React.ReactElement {
  const [results, setResults] = useState<SensorResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runSensors();
  }, []);

  const runSensors = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await harness.runSensors();
      setResults(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel title="Sensors" titleColor={theme.warning} flexGrow={1}>
      {running && (
        <Text color={theme.warning}>⟳ Running sensors...</Text>
      )}

      {!running && error && (
        <Box flexDirection="column">
          <Text color={theme.error}>Error: {error}</Text>
          <Box marginTop={1}>
            <Text color={theme.dim}>Press </Text>
            <Text color={theme.accent} bold>r</Text>
            <Text color={theme.dim}> to retry</Text>
          </Box>
        </Box>
      )}

      {!running && !error && (!results || results.length === 0) && (
        <Box flexDirection="column">
          <Text color={theme.dim}>No sensors configured.</Text>
          <Text color={theme.dim}>Add them to .adp/harness.yaml</Text>
        </Box>
      )}

      {!running && !error && results && results.length > 0 && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            {results.every((r) => r.passed) ? (
              <Text color={theme.success} bold>
                All {results.length} sensors passing ✓
              </Text>
            ) : (
              <Text color={theme.error} bold>
                {results.filter((r) => r.passed).length}/{results.length} passing
              </Text>
            )}
          </Box>

          {results.map((r, i) => (
            <Box key={i} flexDirection="column">
              <Box>
                <Text color={r.passed ? theme.success : theme.error}>
                  {r.passed ? "✓" : "✗"}{" "}
                </Text>
                <Text color={theme.text} bold>{r.name}</Text>
                <Text color={theme.dim}> {r.duration_ms}ms</Text>
              </Box>
              {!r.passed && r.output && (
                <Box marginLeft={3} marginBottom={1}>
                  <Text color={theme.error}>
                    {r.output.split("\n")[0].slice(0, 60)}
                  </Text>
                </Box>
              )}
              {!r.passed && r.fix_hint && (
                <Box marginLeft={3}>
                  <Text color={theme.warning}>hint: {r.fix_hint}</Text>
                </Box>
              )}
            </Box>
          ))}

          <Box marginTop={1}>
            <Text color={theme.dim}>Press </Text>
            <Text color={theme.accent} bold>r</Text>
            <Text color={theme.dim}> to re-run</Text>
          </Box>
        </Box>
      )}
    </Panel>
  );
}
