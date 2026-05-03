import { describe, it, expect } from "vitest";
import {
  formatBranchName,
  getBranchType,
  suggestBranchName,
  validateBranchName,
  getGitflowRules,
} from "./gitflow.js";

describe("formatBranchName", () => {
  it("prefixes feature branches", () => {
    expect(formatBranchName("feature", "user-auth")).toBe("feature/user-auth");
  });

  it("prefixes release branches", () => {
    expect(formatBranchName("release", "1.2.0")).toBe("release/1.2.0");
  });

  it("prefixes hotfix branches", () => {
    expect(formatBranchName("hotfix", "fix-null-crash")).toBe("hotfix/fix-null-crash");
  });

  it("returns fixed branches as-is", () => {
    expect(formatBranchName("main", "ignored")).toBe("main");
    expect(formatBranchName("develop", "ignored")).toBe("develop");
  });
});

describe("getBranchType", () => {
  it("detects feature branch type", () => {
    expect(getBranchType("feature/user-auth")).toBe("feature");
  });

  it("detects release branch type", () => {
    expect(getBranchType("release/1.2.0")).toBe("release");
  });

  it("detects hotfix branch type", () => {
    expect(getBranchType("hotfix/critical-bug")).toBe("hotfix");
  });

  it("detects main and develop", () => {
    expect(getBranchType("main")).toBe("main");
    expect(getBranchType("master")).toBe("main");
    expect(getBranchType("develop")).toBe("develop");
  });

  it("returns null for non-gitflow branches", () => {
    expect(getBranchType("my-random-branch")).toBeNull();
    expect(getBranchType("fix-something")).toBeNull();
  });
});

describe("suggestBranchName", () => {
  it("converts a description to a kebab-case slug", () => {
    expect(suggestBranchName("feature", "Add user authentication flow")).toBe(
      "feature/add-user-authentication-flow"
    );
  });

  it("strips special characters", () => {
    expect(suggestBranchName("hotfix", "Fix null pointer! #123")).toBe(
      "hotfix/fix-null-pointer-123"
    );
  });

  it("collapses multiple spaces and dashes", () => {
    expect(suggestBranchName("feature", "something  --  else")).toBe(
      "feature/something-else"
    );
  });

  it("truncates long descriptions to 60 chars", () => {
    const long = "a".repeat(80);
    const result = suggestBranchName("feature", long);
    expect(result.replace("feature/", "").length).toBeLessThanOrEqual(60);
  });
});

describe("validateBranchName", () => {
  it("validates a correct feature branch", () => {
    expect(validateBranchName("feature/user-auth").valid).toBe(true);
  });

  it("validates fixed branches", () => {
    expect(validateBranchName("main").valid).toBe(true);
    expect(validateBranchName("develop").valid).toBe(true);
  });

  it("rejects a non-gitflow branch", () => {
    const result = validateBranchName("random-branch");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("gitflow prefix"))).toBe(true);
  });

  it("rejects whitespace in name", () => {
    const result = validateBranchName("feature/my branch");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("whitespace"))).toBe(true);
  });

  it("rejects names with invalid git characters", () => {
    const result = validateBranchName("feature/my~branch");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("invalid git characters"))).toBe(true);
  });

  it("rejects empty name", () => {
    const result = validateBranchName("");
    expect(result.valid).toBe(false);
  });
});

describe("getGitflowRules", () => {
  it("returns merge rules for all branch types", () => {
    const rules = getGitflowRules();
    expect(rules.feature.mergesInto).toContain("develop");
    expect(rules.release.mergesInto).toContain("main");
    expect(rules.release.mergesInto).toContain("develop");
    expect(rules.hotfix.mergesInto).toContain("main");
    expect(rules.hotfix.mergesInto).toContain("develop");
    expect(rules.main.mergesInto).toHaveLength(0);
  });

  it("marks transient branches as deleted after merge", () => {
    const rules = getGitflowRules();
    expect(rules.feature.deletedAfterMerge).toBe(true);
    expect(rules.release.deletedAfterMerge).toBe(true);
    expect(rules.hotfix.deletedAfterMerge).toBe(true);
    expect(rules.develop.deletedAfterMerge).toBe(false);
    expect(rules.main.deletedAfterMerge).toBe(false);
  });
});
