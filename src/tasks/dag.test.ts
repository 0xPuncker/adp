import { describe, it, expect } from "vitest";
import { validateDag } from "./dag.js";
import type { Task } from "./parser.js";

const t = (id: string, deps: string[] = [], parallel = false): Task => ({
  id,
  summary: `task ${id}`,
  requirements: [],
  files: [],
  dependsOn: deps,
  parallel,
  doneWhen: "",
  commit: "",
});

describe("validateDag", () => {
  it("validates a simple linear DAG", () => {
    const result = validateDag([t("TASK-01"), t("TASK-02", ["TASK-01"]), t("TASK-03", ["TASK-02"])]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.layers).toEqual([["TASK-01"], ["TASK-02"], ["TASK-03"]]);
  });

  it("groups parallel-eligible tasks into one layer", () => {
    const result = validateDag([
      t("TASK-01"),
      t("TASK-02"),
      t("TASK-03"),
      t("TASK-04", ["TASK-01", "TASK-02", "TASK-03"]),
    ]);
    expect(result.valid).toBe(true);
    expect(result.layers).toHaveLength(2);
    expect(result.layers[0]).toEqual(["TASK-01", "TASK-02", "TASK-03"]);
    expect(result.layers[1]).toEqual(["TASK-04"]);
  });

  it("detects unresolved dependency", () => {
    const result = validateDag([t("TASK-01"), t("TASK-02", ["TASK-99"])]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("unresolved");
    expect(result.errors[0].message).toContain("TASK-99");
  });

  it("detects a simple 2-cycle", () => {
    const result = validateDag([t("TASK-01", ["TASK-02"]), t("TASK-02", ["TASK-01"])]);
    expect(result.valid).toBe(false);
    const cycle = result.errors.find((e) => e.type === "cycle");
    expect(cycle).toBeDefined();
    expect(cycle?.cycle).toBeDefined();
    expect(cycle?.cycle?.length).toBeGreaterThan(0);
  });

  it("detects a 3-cycle", () => {
    const result = validateDag([
      t("TASK-01", ["TASK-03"]),
      t("TASK-02", ["TASK-01"]),
      t("TASK-03", ["TASK-02"]),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "cycle")).toBe(true);
  });

  it("returns no layers when DAG is invalid", () => {
    const result = validateDag([t("TASK-01", ["TASK-02"]), t("TASK-02", ["TASK-01"])]);
    expect(result.layers).toEqual([]);
  });

  it("handles empty input", () => {
    const result = validateDag([]);
    expect(result.valid).toBe(true);
    expect(result.layers).toEqual([]);
  });

  it("handles diamond dependency", () => {
    const result = validateDag([
      t("TASK-01"),
      t("TASK-02", ["TASK-01"]),
      t("TASK-03", ["TASK-01"]),
      t("TASK-04", ["TASK-02", "TASK-03"]),
    ]);
    expect(result.valid).toBe(true);
    expect(result.layers).toEqual([["TASK-01"], ["TASK-02", "TASK-03"], ["TASK-04"]]);
  });

  it("reports both unresolved and cycle when present", () => {
    const result = validateDag([
      t("TASK-01", ["TASK-02"]),
      t("TASK-02", ["TASK-01"]),
      t("TASK-03", ["TASK-99"]),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "unresolved")).toBe(true);
    expect(result.errors.some((e) => e.type === "cycle")).toBe(true);
  });
});
