import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { FeatureBranchManager, featureBranchName, slugifyFeature } from "./feature.js";

let repoDir: string;

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("exit", (code) => {
      if (code === 0) resolveP(stdout);
      else rejectP(new Error(`git ${args.join(" ")}: ${stderr}`));
    });
  });
}

beforeEach(async () => {
  repoDir = resolve(tmpdir(), `adp-feature-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(repoDir, { recursive: true });
  await git(["init", "--initial-branch=main"], repoDir);
  await git(["config", "user.email", "test@example.com"], repoDir);
  await git(["config", "user.name", "Test"], repoDir);
  await writeFile(resolve(repoDir, "README.md"), "# test\n", "utf-8");
  await git(["add", "."], repoDir);
  await git(["commit", "-m", "initial"], repoDir);
});

afterEach(async () => {
  await rm(repoDir, { recursive: true, force: true });
});

describe("slugifyFeature", () => {
  it("creates a lowercase hyphenated slug", () => {
    expect(slugifyFeature("Add Billing & Invoices!")).toBe("add-billing-invoices");
  });

  it("rejects names without letters or numbers", () => {
    expect(() => slugifyFeature("!!!")).toThrow("Feature name");
  });
});

describe("featureBranchName", () => {
  it("uses the ADP feat/ prefix", () => {
    expect(featureBranchName("Live agent panel")).toBe("feat/live-agent-panel");
  });
});

describe("FeatureBranchManager", () => {
  it("creates a new feat branch from the current HEAD", async () => {
    const manager = new FeatureBranchManager(repoDir);
    const result = await manager.createOrCheckout("Add billing");

    expect(result).toMatchObject({
      slug: "add-billing",
      branch: "feat/add-billing",
      action: "created",
    });
    expect((await git(["branch", "--show-current"], repoDir)).trim()).toBe("feat/add-billing");
  });

  it("checks out an existing feature branch", async () => {
    const manager = new FeatureBranchManager(repoDir);
    await manager.createOrCheckout("Add billing");
    await git(["checkout", "main"], repoDir);

    const result = await manager.createOrCheckout("Add billing");

    expect(result.action).toBe("checked_out");
    expect((await git(["branch", "--show-current"], repoDir)).trim()).toBe("feat/add-billing");
  });

  it("does nothing when already on the feature branch", async () => {
    const manager = new FeatureBranchManager(repoDir);
    await manager.createOrCheckout("Add billing");

    const result = await manager.createOrCheckout("Add billing");

    expect(result.action).toBe("already_on");
  });
});
