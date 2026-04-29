import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { runUninstall } from "./uninstall.js";

let homeDir: string;
let skillDir: string;

beforeEach(async () => {
  homeDir = resolve(tmpdir(), `adp-uninstall-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  skillDir = resolve(homeDir, ".claude", "skills", "adp");
  await mkdir(resolve(skillDir, "bin"), { recursive: true });
  await mkdir(resolve(skillDir, "templates"), { recursive: true });
  await writeFile(resolve(skillDir, "SKILL.md"), "# skill\n", "utf-8");
  await writeFile(resolve(skillDir, "templates", "spec.md"), "x", "utf-8");
});

afterEach(async () => {
  await rm(homeDir, { recursive: true, force: true });
});

describe("runUninstall", () => {
  it("removes the skill directory", async () => {
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 0 });
    expect(report.skillFilesRemoved).toBe(true);
    await expect(stat(skillDir)).rejects.toThrow();
  });

  it("removes standalone binary if present", async () => {
    await writeFile(resolve(skillDir, "bin", "adp"), "#!/bin/sh\n", "utf-8");
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 0 });
    expect(report.standaloneRemoved).toBe(true);
  });

  it("returns standaloneRemoved=false when no standalone exists", async () => {
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 0 });
    expect(report.standaloneRemoved).toBe(false);
  });

  it("reports skillFilesRemoved=false when dir missing", async () => {
    await rm(skillDir, { recursive: true, force: true });
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 0 });
    expect(report.skillFilesRemoved).toBe(false);
  });

  it("captures npm exit code != 0 in errors[]", async () => {
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 2 });
    expect(report.npmRemoved).toBe(false);
    expect(report.errors.some((e) => e.includes("code 2"))).toBe(true);
  });

  it("npmRemoved=true on exit 0", async () => {
    const report = await runUninstall({ homeDir, runNpmUninstall: async () => 0 });
    expect(report.npmRemoved).toBe(true);
  });

  it("captures spawn launch errors", async () => {
    const report = await runUninstall({
      homeDir,
      runNpmUninstall: async () => {
        throw new Error("ENOENT: npm not found");
      },
    });
    expect(report.npmRemoved).toBe(false);
    expect(report.errors.some((e) => e.includes("ENOENT"))).toBe(true);
  });
});
