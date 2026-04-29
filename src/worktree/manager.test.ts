import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { WorktreeManager } from "./manager.js";

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
  repoDir = resolve(tmpdir(), `adp-worktree-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

describe("WorktreeManager.add", () => {
  it("creates a worktree at .adp/worktrees/sprint-N", async () => {
    const mgr = new WorktreeManager(repoDir);
    const wt = await mgr.add(1);

    expect(wt.sprint).toBe(1);
    expect(wt.branch).toBe("adp/sprint-1");
    expect(wt.path).toContain("sprint-1");
    expect(wt.status).toBe("active");

    // Verify the directory exists
    const list = await mgr.list();
    expect(list).toHaveLength(1);
    expect(list[0].sprint).toBe(1);
  });
});

describe("WorktreeManager.list", () => {
  it("returns empty when no sprint worktrees exist", async () => {
    const mgr = new WorktreeManager(repoDir);
    expect(await mgr.list()).toEqual([]);
  });

  it("returns multiple sprint worktrees", async () => {
    const mgr = new WorktreeManager(repoDir);
    await mgr.add(1);
    await mgr.add(2);

    const list = await mgr.list();
    expect(list).toHaveLength(2);
    expect(list.map((w) => w.sprint).sort()).toEqual([1, 2]);
  });
});

describe("WorktreeManager.remove", () => {
  it("removes a sprint worktree", async () => {
    const mgr = new WorktreeManager(repoDir);
    await mgr.add(1);
    await mgr.remove(1);

    expect(await mgr.list()).toEqual([]);
  });

  it("force-removes even if dirty", async () => {
    const mgr = new WorktreeManager(repoDir);
    const wt = await mgr.add(1);

    // Make worktree dirty
    await writeFile(resolve(wt.path, "scratch.txt"), "dirty", "utf-8");

    await mgr.remove(1, true);
    expect(await mgr.list()).toEqual([]);
  });
});

describe("WorktreeManager.merge", () => {
  it("merges sprint branch back to main and cleans up", async () => {
    const mgr = new WorktreeManager(repoDir);
    const wt = await mgr.add(1);

    // Make a commit in the worktree
    await writeFile(resolve(wt.path, "feature.txt"), "feature\n", "utf-8");
    await git(["add", "."], wt.path);
    await git(["commit", "-m", "add feature"], wt.path);

    await mgr.merge(1, "main");

    // Worktree gone
    expect(await mgr.list()).toEqual([]);

    // Feature file is in main
    const log = await git(["log", "--all", "--oneline"], repoDir);
    expect(log).toContain("add feature");
  });
});
