import { describe, it, expect } from "vitest";
import { parseSemver, formatVersion, bumpVersion, getVersionBump, compareVersions } from "./semver.js";

describe("parseSemver", () => {
  it("parses a simple version", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3, pre: null, build: null });
  });

  it("parses a version with v prefix", () => {
    expect(parseSemver("v2.0.0")).toEqual({ major: 2, minor: 0, patch: 0, pre: null, build: null });
  });

  it("parses pre-release", () => {
    expect(parseSemver("1.0.0-alpha.1")).toEqual({ major: 1, minor: 0, patch: 0, pre: "alpha.1", build: null });
  });

  it("parses build metadata", () => {
    expect(parseSemver("1.0.0+build.123")).toEqual({ major: 1, minor: 0, patch: 0, pre: null, build: "build.123" });
  });

  it("parses pre-release + build", () => {
    const sv = parseSemver("1.0.0-beta.2+exp.sha.5114f85");
    expect(sv?.pre).toBe("beta.2");
    expect(sv?.build).toBe("exp.sha.5114f85");
  });

  it("returns null for invalid input", () => {
    expect(parseSemver("not-semver")).toBeNull();
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("")).toBeNull();
    expect(parseSemver("1.2.3.4")).toBeNull();
  });
});

describe("formatVersion", () => {
  it("formats a simple version", () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3, pre: null, build: null })).toBe("1.2.3");
  });

  it("includes pre-release when present", () => {
    expect(formatVersion({ major: 1, minor: 0, patch: 0, pre: "alpha.1", build: null })).toBe("1.0.0-alpha.1");
  });
});

describe("bumpVersion", () => {
  it("bumps patch", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("bumps minor and resets patch", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
  });

  it("bumps major and resets minor + patch", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("strips pre-release and build on bump", () => {
    expect(bumpVersion("1.2.3-alpha.1", "patch")).toBe("1.2.4");
  });

  it("throws on invalid semver", () => {
    expect(() => bumpVersion("not-semver", "patch")).toThrow();
  });
});

describe("getVersionBump", () => {
  it("returns patch for only fix commits", () => {
    expect(getVersionBump(["fix", "fix"])).toBe("patch");
  });

  it("returns minor when feat is present", () => {
    expect(getVersionBump(["fix", "feat"])).toBe("minor");
  });

  it("returns minor for feat without breaking", () => {
    expect(getVersionBump(["feat"])).toBe("minor");
  });

  it("returns major for breaking change (! suffix)", () => {
    expect(getVersionBump(["feat!"])).toBe("major");
  });

  it("returns major when any commit has breaking mark", () => {
    expect(getVersionBump(["fix", "feat!", "chore"])).toBe("major");
  });

  it("returns patch for docs/chore-only commits", () => {
    expect(getVersionBump(["docs", "chore"])).toBe("patch");
  });
});

describe("compareVersions", () => {
  it("returns -1 when a < b", () => {
    expect(compareVersions("1.2.3", "1.3.0")).toBe(-1);
  });

  it("returns 1 when a > b", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });

  it("returns 0 when versions are equal", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("compares major first", () => {
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
  });

  it("throws on invalid semver", () => {
    expect(() => compareVersions("bad", "1.0.0")).toThrow();
  });
});
