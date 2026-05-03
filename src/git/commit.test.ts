import { describe, it, expect } from "vitest";
import {
  parseConventionalCommit,
  validateConventionalCommit,
  buildAdpCommitMessage,
  formatConventionalCommit,
} from "./commit.js";

describe("parseConventionalCommit", () => {
  it("parses a minimal valid commit", () => {
    const result = parseConventionalCommit("feat: add login");
    expect(result).toEqual({
      type: "feat",
      scope: null,
      breaking: false,
      summary: "add login",
      body: null,
      footer: null,
    });
  });

  it("parses a commit with scope", () => {
    const result = parseConventionalCommit("fix(auth): handle token expiry");
    expect(result?.type).toBe("fix");
    expect(result?.scope).toBe("auth");
    expect(result?.summary).toBe("handle token expiry");
  });

  it("parses a breaking change with ! suffix", () => {
    const result = parseConventionalCommit("feat(api)!: remove legacy endpoint");
    expect(result?.breaking).toBe(true);
  });

  it("parses a breaking change with BREAKING CHANGE footer", () => {
    const result = parseConventionalCommit(
      "feat(api): rename endpoint\n\nBody text.\n\nBREAKING CHANGE: /v1/users is now /v2/users"
    );
    expect(result?.breaking).toBe(true);
    expect(result?.footer).toContain("BREAKING CHANGE");
  });

  it("parses body and footer", () => {
    const result = parseConventionalCommit(
      "fix(db): fix connection leak\n\nThis was caused by missing pool cleanup.\n\nCloses: #42"
    );
    expect(result?.body).toContain("pool cleanup");
    expect(result?.footer).toBe("Closes: #42");
  });

  it("returns null for non-conventional messages", () => {
    expect(parseConventionalCommit("just a normal commit")).toBeNull();
    expect(parseConventionalCommit("")).toBeNull();
    expect(parseConventionalCommit("FEAT: uppercase type")).toBeNull();
  });
});

describe("validateConventionalCommit", () => {
  it("validates a correct commit", () => {
    const result = validateConventionalCommit("feat(auth): add JWT refresh token");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an unknown type", () => {
    const result = validateConventionalCommit("unknown: something");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown commit type"))).toBe(true);
  });

  it("rejects a summary starting with uppercase", () => {
    const result = validateConventionalCommit("feat: Add something");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
  });

  it("rejects a summary ending with period", () => {
    const result = validateConventionalCommit("fix: resolve memory leak.");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("period"))).toBe(true);
  });

  it("rejects missing blank line after header", () => {
    const result = validateConventionalCommit("feat: add thing\nbody without blank line");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("blank"))).toBe(true);
  });

  it("rejects a completely invalid format", () => {
    const result = validateConventionalCommit("not a commit");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("buildAdpCommitMessage", () => {
  it("builds a full ADP commit with all fields", () => {
    const msg = buildAdpCommitMessage({
      type: "feat",
      scope: "auth",
      summary: "add JWT parsing",
      taskId: "ADP-TASK-02",
      requirements: ["REQ-01", "REQ-01.1"],
      sensorResults: { typecheck: true, lint: true, test: true },
      score: 88,
      evaluatorScores: { correctness: 92, completeness: 88, code_quality: 85 },
    });

    expect(msg).toContain("feat(auth): add JWT parsing [ADP-TASK-02]");
    expect(msg).toContain("Implements: REQ-01, REQ-01.1");
    expect(msg).toContain("Sensors: typecheck ✓ lint ✓ test ✓");
    expect(msg).toContain("Score: 88/100");
    expect(msg).toContain("Evaluator:");
  });

  it("includes BREAKING CHANGE footer when breaking", () => {
    const msg = buildAdpCommitMessage({
      type: "feat",
      scope: "api",
      summary: "remove v1 endpoints",
      taskId: "ADP-TASK-03",
      requirements: ["REQ-02"],
      breaking: true,
      breakingDescription: "/api/v1/* routes removed",
    });

    expect(msg).toContain("feat(api)!:");
    expect(msg).toContain("BREAKING CHANGE: /api/v1/* routes removed");
  });

  it("works with minimal params", () => {
    const msg = buildAdpCommitMessage({
      type: "chore",
      scope: "deps",
      summary: "update packages",
      taskId: "ADP-TASK-01",
      requirements: [],
    });

    expect(msg).toContain("chore(deps): update packages [ADP-TASK-01]");
    expect(msg).not.toContain("Sensors:");
    expect(msg).not.toContain("Score:");
  });
});

describe("formatConventionalCommit", () => {
  it("serializes a minimal commit", () => {
    expect(formatConventionalCommit({
      type: "fix",
      scope: null,
      breaking: false,
      summary: "patch null pointer",
      body: null,
      footer: null,
    })).toBe("fix: patch null pointer");
  });

  it("includes scope and breaking mark", () => {
    expect(formatConventionalCommit({
      type: "feat",
      scope: "api",
      breaking: true,
      summary: "rename endpoint",
      body: null,
      footer: null,
    })).toBe("feat(api)!: rename endpoint");
  });

  it("includes body and footer", () => {
    const result = formatConventionalCommit({
      type: "fix",
      scope: "db",
      breaking: false,
      summary: "fix leak",
      body: "Missing pool cleanup.",
      footer: "Closes: #42",
    });
    expect(result).toContain("Missing pool cleanup.");
    expect(result).toContain("Closes: #42");
  });
});
