import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";

export interface Worktree {
  sprint: number;
  branch: string;
  path: string;
  status: "active" | "merged" | "failed";
}

export class WorktreeManager {
  constructor(private cwd: string) {}

  /**
   * Create a worktree for a sprint.
   * Path: <cwd>/.adp/worktrees/sprint-<N>
   * Branch: adp/sprint-<N>
   */
  async add(sprint: number, baseBranch?: string): Promise<Worktree> {
    const branch = `adp/sprint-${sprint}`;
    const path = this.worktreePath(sprint);

    const args = ["worktree", "add", "-b", branch, path];
    if (baseBranch) args.push(baseBranch);

    await this.git(args);

    return { sprint, branch, path, status: "active" };
  }

  /**
   * Remove a worktree (and its directory). Use force=true to ignore unclean state.
   */
  async remove(sprint: number, force = false): Promise<void> {
    const path = this.worktreePath(sprint);
    const args = ["worktree", "remove", path];
    if (force) args.push("--force");

    try {
      await this.git(args);
    } catch (err) {
      if (force) {
        await rm(path, { recursive: true, force: true });
        await this.git(["worktree", "prune"]);
        return;
      }
      throw err;
    }
  }

  /**
   * List all worktrees managed by this repo.
   * Filters to those under .adp/worktrees/ (sprint worktrees).
   */
  async list(): Promise<Worktree[]> {
    const out = await this.git(["worktree", "list", "--porcelain"]);
    const trees: Worktree[] = [];

    let current: { path?: string; branch?: string } = {};

    for (const line of out.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path) {
          this.pushIfSprint(trees, current);
        }
        current = { path: line.slice("worktree ".length).trim() };
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice("branch ".length).replace("refs/heads/", "").trim();
      } else if (line === "") {
        if (current.path) {
          this.pushIfSprint(trees, current);
          current = {};
        }
      }
    }
    if (current.path) {
      this.pushIfSprint(trees, current);
    }

    return trees;
  }

  /**
   * Merge a sprint's branch back to target, then remove the worktree.
   */
  async merge(sprint: number, target: string): Promise<void> {
    const branch = `adp/sprint-${sprint}`;

    // Checkout target in main worktree, merge sprint branch (no-ff)
    await this.git(["checkout", target]);
    await this.git(["merge", "--no-ff", branch, "-m", `Merge ${branch} into ${target}`]);
    await this.remove(sprint);
    await this.git(["branch", "-d", branch]);
  }

  private worktreePath(sprint: number): string {
    return resolve(this.cwd, ".adp", "worktrees", `sprint-${sprint}`);
  }

  private pushIfSprint(trees: Worktree[], current: { path?: string; branch?: string }): void {
    if (!current.path) return;
    const match = current.path.match(/[/\\]\.adp[/\\]worktrees[/\\]sprint-(\d+)/);
    if (!match) return;
    trees.push({
      sprint: parseInt(match[1], 10),
      branch: current.branch ?? "",
      path: current.path,
      status: "active",
    });
  }

  private git(args: string[]): Promise<string> {
    return new Promise((resolveP, rejectP) => {
      const child = spawn("git", args, { cwd: this.cwd, env: process.env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("error", rejectP);
      child.on("exit", (code) => {
        if (code === 0) resolveP(stdout);
        else rejectP(new Error(`git ${args.join(" ")} failed (${code}): ${stderr.trim()}`));
      });
    });
  }
}
