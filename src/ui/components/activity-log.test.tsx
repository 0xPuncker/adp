import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { ActivityLog } from "./activity-log.js";
import type { Activity } from "../../types.js";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    timestamp: "2026-05-14T15:00:00.000Z",
    type: "sprint_end",
    message: "Sprint 1 complete — score: 92",
    ...overrides,
  };
}

describe("ActivityLog — panel structure", () => {
  it("renders a titled panel", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity()]} />,
    );
    expect(lastFrame()).toContain("Activity");
  });

  it("shows empty-state message when activity list is empty", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[]} />,
    );
    expect(lastFrame()).toContain("No activity yet");
  });
});

describe("ActivityLog — entry rendering", () => {
  it("renders a human-readable time prefix for each entry", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity()]} />,
    );
    // Should contain a time in HH:MM format (locale-independent digit check)
    expect(lastFrame()).toMatch(/\d{1,2}:\d{2}/);
  });

  it("renders the message text", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ message: "Sprint 3 done — score: 88" })]} />,
    );
    expect(lastFrame()).toContain("Sprint 3 done");
  });

  it("renders icon for sprint_end type", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ type: "sprint_end" })]} />,
    );
    expect(lastFrame()).toContain("■");
  });

  it("renders icon for sensor_pass type", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ type: "sensor_pass", message: "typecheck ✓ lint ✓ test ✓" })]} />,
    );
    expect(lastFrame()).toContain("✓");
  });

  it("renders icon for error type", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ type: "error", message: "sensor failed" })]} />,
    );
    expect(lastFrame()).toContain("!");
  });

  it("renders fallback dot icon for unknown activity types", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ type: "custom_unknown_type" })]} />,
    );
    expect(lastFrame()).toContain("·");
  });
});

describe("ActivityLog — ordering and limiting", () => {
  it("shows most recent entries at the top (reversed order)", () => {
    const entries: Activity[] = [
      makeActivity({ timestamp: "2026-05-14T10:00:00.000Z", message: "oldest" }),
      makeActivity({ timestamp: "2026-05-14T11:00:00.000Z", message: "middle" }),
      makeActivity({ timestamp: "2026-05-14T12:00:00.000Z", message: "newest" }),
    ];
    const { lastFrame } = render(<ActivityLog activity={entries} limit={10} />);
    const frame = lastFrame() ?? "";
    const newestPos = frame.indexOf("newest");
    const oldestPos = frame.indexOf("oldest");
    expect(newestPos).toBeGreaterThanOrEqual(0);
    expect(oldestPos).toBeGreaterThanOrEqual(0);
    expect(newestPos).toBeLessThan(oldestPos);
  });

  it("respects the limit prop — shows at most N entries", () => {
    const entries: Activity[] = Array.from({ length: 20 }, (_, i) =>
      makeActivity({ message: `entry-${i}`, timestamp: `2026-05-14T${String(i).padStart(2, "0")}:00:00.000Z` }),
    );
    const { lastFrame } = render(<ActivityLog activity={entries} limit={5} />);
    const frame = lastFrame() ?? "";
    // Only the last 5 entries should be visible
    expect(frame).toContain("entry-19");
    expect(frame).toContain("entry-15");
    expect(frame).not.toContain("entry-14");
  });
});

describe("ActivityLog — message truncation", () => {
  it("truncates long messages with an ellipsis", () => {
    const long = "A".repeat(200);
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ message: long })]} contentWidth={40} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("…");
    expect(frame).not.toContain("A".repeat(200));
  });

  it("does not truncate short messages", () => {
    const { lastFrame } = render(
      <ActivityLog activity={[makeActivity({ message: "short msg" })]} contentWidth={40} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("short msg");
    expect(frame).not.toContain("…");
  });
});
