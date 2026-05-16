import { spawn } from "node:child_process";

export type FeatureBranchAction = "created" | "checked_out" | "already_on";

export interface FeatureBranchResult {
  feature: string;
  slug: string;
  branch: string;
  action: FeatureBranchAction;
}

const MAX_SLUG_LENGTH = 60;

export function slugifyFeature(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  if (!slug) {
    throw new Error("Feature name must include at least one letter or number");
  }
  return slug;
}

export function featureBranchName(feature: string): string {
  return `feat/${slugifyFeature(feature)}`;
}

export class FeatureBranchManager {
  constructor(private cwd: string) {}

  async createOrCheckout(feature: string): Promise<FeatureBranchResult> {
    const slug = slugifyFeature(feature);
    const branch = `feat/${slug}`;
    const current = (await this.git(["branch", "--show-current"])).trim();

    if (current === branch) {
      return { feature, slug, branch, action: "already_on" };
    }

    if (await this.localBranchExists(branch)) {
      await this.git(["checkout", branch]);
      return { feature, slug, branch, action: "checked_out" };
    }

    await this.git(["checkout", "-b", branch]);
    return { feature, slug, branch, action: "created" };
  }

  private async localBranchExists(branch: string): Promise<boolean> {
    try {
      await this.git(["show-ref", "--verify", `refs/heads/${branch}`]);
      return true;
    } catch {
      return false;
    }
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
