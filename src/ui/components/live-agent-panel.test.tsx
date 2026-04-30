import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { LiveAgentPanel } from "./live-agent-panel.js";
import type { SubagentEvent } from "../../live/types.js";

const baseEvent: SubagentEvent = {
  agentId: "abc",
  agentType: "general-purpose",
  classified: "evaluator",
  sprintId: 3,
  startedAt: "2026-04-30T10:00:00Z",
  endedAt: null,
  prompt: "QA evaluator: please grade sprint 3.",
  verdict: { raw: null, parsedScores: null, pass: null },
  recentToolCalls: [],
  status: "running",
  cwd: null,
};

describe("LiveAgentPanel", () => {
  it("renders an empty state when there are no events", () => {
    const { lastFrame } = render(
      <LiveAgentPanel events={[]} sensorTail={[]} status="watching" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Waiting for sub-agent activity");
  });

  it("renders a degraded banner with reason", () => {
    const { lastFrame } = render(
      <LiveAgentPanel
        events={[]}
        sensorTail={[]}
        status="degraded"
        degradedReason="subagents dir not found"
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("degraded");
    expect(frame).toContain("subagents dir not found");
  });

  it("renders a running evaluator with prompt snippet and sprint id", () => {
    const { lastFrame } = render(
      <LiveAgentPanel
        events={[baseEvent]}
        sensorTail={[]}
        status="watching"
        activeSprintId={3}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("evaluator");
    expect(frame).toContain("sp 3");
    expect(frame).toContain("QA evaluator");
  });

  it("renders parsed scores with pass/fail tinting against thresholds", () => {
    const ev: SubagentEvent = {
      ...baseEvent,
      status: "done",
      endedAt: "2026-04-30T10:01:00Z",
      verdict: {
        raw: "...",
        parsedScores: {
          correctness: 92,
          completeness: 70,
          code_quality: 88,
          test_coverage: 95,
        },
        pass: false,
      },
    };
    const { lastFrame } = render(
      <LiveAgentPanel
        events={[ev]}
        sensorTail={[]}
        status="watching"
        thresholds={{
          correctness: 90,
          completeness: 85,
          code_quality: 85,
          test_coverage: 90,
        }}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("C:92");
    expect(frame).toContain("M:70");
    expect(frame).toContain("Q:88");
    expect(frame).toContain("T:95");
  });

  it("renders sensor tail lines under the events", () => {
    const { lastFrame } = render(
      <LiveAgentPanel
        events={[]}
        sensorTail={["test src/foo.test.ts ✓", "vitest 12 passed"]}
        status="watching"
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("sensor tail");
    expect(frame).toContain("test src/foo.test.ts");
    expect(frame).toContain("12 passed");
  });

  it("clamps visible events to maxEvents", () => {
    const events: SubagentEvent[] = Array.from({ length: 10 }, (_, i) => ({
      ...baseEvent,
      agentId: `agent-${i}`,
      prompt: `prompt-${i}`,
    }));
    const { lastFrame } = render(
      <LiveAgentPanel events={events} sensorTail={[]} status="watching" maxEvents={3} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("prompt-9");
    expect(frame).toContain("prompt-8");
    expect(frame).toContain("prompt-7");
    expect(frame).not.toContain("prompt-0");
  });
});
