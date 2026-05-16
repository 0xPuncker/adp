import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { startFeature } from "./manager.js";
import { StateManager } from "../state/manager.js";

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
  repoDir = resolve(tmpdir(), `adp-feature-start-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

describe("startFeature", () => {
  it("creates a feature branch, spec scaffold, and running pipeline state", async () => {
    const result = await startFeature(repoDir, "Add billing portal", "large");

    expect(result.slug).toBe("add-billing-portal");
    expect(result.branch).toBe("feat/add-billing-portal");
    expect(result.branchAction).toBe("created");
    expect(result.specCreated).toBe(true);
    expect(existsSync(result.specPath)).toBe(true);
    expect(existsSync(resolve(repoDir, ".specs", "features", result.slug, "contracts"))).toBe(true);
    expect((await git(["branch", "--show-current"], repoDir)).trim()).toBe(result.branch);

    const spec = await readFile(result.specPath, "utf-8");
    expect(spec).toContain("Add billing portal");
    expect(spec).toContain("Branch: feat/add-billing-portal");

    const state = await new StateManager(repoDir).load();
    expect(state.status).toBe("running");
    expect(state.phase).toBe("specify");
    expect(state.feature).toBe("add-billing-portal");
    expect(state.branch).toBe("feat/add-billing-portal");
    expect(state.complexity).toBe("large");
  });

  it("does not overwrite an existing spec", async () => {
    const first = await startFeature(repoDir, "Add billing portal");
    await writeFile(first.specPath, "# Custom spec\n", "utf-8");
    await git(["checkout", "main"], repoDir);

    const second = await startFeature(repoDir, "Add billing portal");

    expect(second.specCreated).toBe(false);
    expect(await readFile(second.specPath, "utf-8")).toBe("# Custom spec\n");
  });
});
