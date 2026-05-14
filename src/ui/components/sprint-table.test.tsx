import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { SprintTable } from "./sprint-table.js";
import type { Sprint } from "../../types.js";

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 1,
    task: "TASK-01 Setup scaffolding",
    status: "done",
    contract: "Build skeleton",
    score: 90,
    evaluator_scores: null,
    requirements: ["REQ-01"],
    commit: "abc123f",
    cost: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("SprintTable — panel structure", () => {
  it("renders a titled panel", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint()]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("Sprints");
  });

  it("renders column headers: #, Status, Score, Task", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint()]} contentWidth={60} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("#");
    expect(frame).toContain("Status");
    expect(frame).toContain("Score");
    expect(frame).toContain("Task");
  });

  it("shows empty-state message when sprint list is empty", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("No sprints yet");
  });
});

describe("SprintTable — sprint rows", () => {
  it("renders sprint id and task name", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ id: 3, task: "TASK-03 Build auth" })]} contentWidth={60} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("3");
    expect(frame).toContain("TASK-03");
  });

  it("renders score for a done sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ score: 92 })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("92/100");
  });

  it("renders em-dash for unscored sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ score: null })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("—");
  });

  it("renders check icon for done sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ status: "done" })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("✓");
  });

  it("renders cross icon for failed sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ status: "failed", score: null })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("✗");
  });

  it("truncates long task names to fit panel width", () => {
    const long = "TASK-01 " + "A".repeat(80);
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ task: long })]} contentWidth={50} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("…");
    expect(frame).not.toContain("A".repeat(80));
  });

  it("renders unique rows for sprints that share the same id but differ in task", () => {
    const s1 = makeSprint({ id: 2, task: "TASK-01 Idealista scraper" });
    const s2 = makeSprint({ id: 2, task: "TASK-02 Apify diagram" });
    const { lastFrame } = render(
      <SprintTable sprints={[s1, s2]} contentWidth={60} />,
    );
    const frame = lastFrame() ?? "";
    // Both tasks should be visible — the key-collision fix ensures no row is dropped
    expect(frame).toContain("Idealista");
    expect(frame).toContain("Apify");
  });
});

describe("SprintTable — live sprint indicators", () => {
  it("shows live marker for build-status sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ status: "build", score: null })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("▸");
  });

  it("shows live marker for qa-status sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ status: "qa", score: null })]} contentWidth={60} />,
    );
    expect(lastFrame()).toContain("▸");
  });

  it("does not show live marker for done sprint", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ status: "done" })]} contentWidth={60} />,
    );
    expect(lastFrame()).not.toContain("▸");
  });
});

describe("SprintTable — scroll indicators", () => {
  const tenSprints = Array.from({ length: 10 }, (_, i) =>
    makeSprint({ id: i + 1, task: `TASK-${String(i + 1).padStart(2, "0")} Task ${i + 1}` }),
  );

  it("shows scroll footer when there are more sprints than maxRows", () => {
    const { lastFrame } = render(
      <SprintTable sprints={tenSprints} maxRows={5} contentWidth={60} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("j/k scroll");
    expect(frame).toContain("g/G top/end");
  });

  it("does not show scroll footer when all sprints fit", () => {
    const { lastFrame } = render(
      <SprintTable sprints={tenSprints.slice(0, 3)} maxRows={10} contentWidth={60} />,
    );
    expect(lastFrame()).not.toContain("j/k scroll");
  });

  it("shows page indicator as N/M when scrollable", () => {
    const { lastFrame } = render(
      <SprintTable sprints={tenSprints} maxRows={5} contentWidth={60} />,
    );
    // Page 1/2 since 10 sprints at page size 5
    expect(lastFrame()).toContain("1/2");
  });
});

describe("SprintTable — eval column", () => {
  it("shows eval column when scores are present and width allows", () => {
    const sprint = makeSprint({
      evaluator_scores: {
        correctness: 92,
        completeness: 88,
        code_quality: 85,
        test_coverage: 90,
      },
    });
    const { lastFrame } = render(
      <SprintTable sprints={[sprint]} contentWidth={70} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("C:92");
    expect(frame).toContain("Q:85");
  });

  it("hides eval column when contentWidth is too narrow", () => {
    const sprint = makeSprint({
      evaluator_scores: {
        correctness: 92,
        completeness: 88,
        code_quality: 85,
        test_coverage: 90,
      },
    });
    const { lastFrame } = render(
      <SprintTable sprints={[sprint]} contentWidth={30} />,
    );
    expect(lastFrame()).not.toContain("Eval");
  });
});

describe("SprintTable — compact mode (narrow terminal)", () => {
  it("hides Score column when contentWidth is very narrow", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint()]} contentWidth={20} />,
    );
    expect(lastFrame()).not.toContain("Score");
  });

  it("shows task text even in compact mode", () => {
    const { lastFrame } = render(
      <SprintTable sprints={[makeSprint({ task: "TASK-01 Setup" })]} contentWidth={20} />,
    );
    expect(lastFrame()).toContain("TASK-01");
  });
});
