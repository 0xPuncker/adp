import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { initProject } from "./init.js";

/** Build a fixture templates directory that mirrors the real templates/hooks + templates/agents layout. */
async function buildFixtureTemplates(root: string): Promise<string> {
  const hooksDir = join(root, "hooks");
  const agentsDir = join(root, "agents");
  await mkdir(hooksDir, { recursive: true });
  await mkdir(agentsDir, { recursive: true });

  await writeFile(join(hooksDir, "PreToolUse.sh"), "#!/bin/bash\necho pre");
  await writeFile(join(hooksDir, "PostToolUse.sh"), "#!/bin/bash\necho post");
  await writeFile(join(hooksDir, "SessionStart.sh"), "#!/bin/bash\necho session");
  await writeFile(join(agentsDir, "evaluator.md"), "# Evaluator");
  await writeFile(join(agentsDir, "worktree-agent.md"), "# Worktree");
  await writeFile(join(agentsDir, "contract-reviewer.md"), "# Contract");

  return root;
}

describe("initProject", () => {
  let projectDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "adp-project-"));
    templatesDir = await mkdtemp(join(tmpdir(), "adp-tpl-"));
    await buildFixtureTemplates(templatesDir);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
    await rm(templatesDir, { recursive: true, force: true });
  });

  it("installs all 3 hook scripts", async () => {
    const result = await initProject(projectDir, templatesDir);
    expect(result.hooksInstalled).toHaveLength(3);
    expect(result.hooksInstalled).toContain("PreToolUse.sh");
    expect(result.hooksInstalled).toContain("PostToolUse.sh");
    expect(result.hooksInstalled).toContain("SessionStart.sh");
  });

  it("installs all 3 agent definitions", async () => {
    const result = await initProject(projectDir, templatesDir);
    expect(result.agentsInstalled).toHaveLength(3);
    expect(result.agentsInstalled).toContain("evaluator.md");
    expect(result.agentsInstalled).toContain("worktree-agent.md");
    expect(result.agentsInstalled).toContain("contract-reviewer.md");
  });

  it("creates .claude/hooks/ directory", async () => {
    await initProject(projectDir, templatesDir);
    expect(existsSync(join(projectDir, ".claude", "hooks"))).toBe(true);
  });

  it("creates .claude/agents/ directory", async () => {
    await initProject(projectDir, templatesDir);
    expect(existsSync(join(projectDir, ".claude", "agents"))).toBe(true);
  });

  it("copies hook file content correctly", async () => {
    await initProject(projectDir, templatesDir);
    const content = await readFile(join(projectDir, ".claude", "hooks", "PreToolUse.sh"), "utf-8");
    expect(content).toBe("#!/bin/bash\necho pre");
  });

  it("copies agent file content correctly", async () => {
    await initProject(projectDir, templatesDir);
    const content = await readFile(join(projectDir, ".claude", "agents", "evaluator.md"), "utf-8");
    expect(content).toBe("# Evaluator");
  });

  it("is idempotent — running twice does not error and files remain correct", async () => {
    await initProject(projectDir, templatesDir);
    // Overwrite a file to a different value, then re-init — should overwrite back
    await writeFile(join(projectDir, ".claude", "hooks", "PreToolUse.sh"), "stale content");
    await initProject(projectDir, templatesDir);
    const content = await readFile(join(projectDir, ".claude", "hooks", "PreToolUse.sh"), "utf-8");
    expect(content).toBe("#!/bin/bash\necho pre");
  });

  it("ignores non-.sh files in hooks source", async () => {
    await writeFile(join(templatesDir, "hooks", "readme.txt"), "skip me");
    const result = await initProject(projectDir, templatesDir);
    expect(result.hooksInstalled).not.toContain("readme.txt");
    expect(existsSync(join(projectDir, ".claude", "hooks", "readme.txt"))).toBe(false);
  });

  it("ignores non-.md files in agents source", async () => {
    await writeFile(join(templatesDir, "agents", "notes.txt"), "skip me");
    const result = await initProject(projectDir, templatesDir);
    expect(result.agentsInstalled).not.toContain("notes.txt");
    expect(existsSync(join(projectDir, ".claude", "agents", "notes.txt"))).toBe(false);
  });

  it("returns empty arrays when templates dirs are missing", async () => {
    const emptyTemplatesDir = await mkdtemp(join(tmpdir(), "adp-empty-"));
    try {
      const result = await initProject(projectDir, emptyTemplatesDir);
      expect(result.hooksInstalled).toHaveLength(0);
      expect(result.agentsInstalled).toHaveLength(0);
    } finally {
      await rm(emptyTemplatesDir, { recursive: true, force: true });
    }
  });
});
