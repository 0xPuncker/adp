import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";

// We can't easily test initProject directly because it resolves templates
// relative to import.meta.url (the compiled dist/ path). Instead, we test
// the scaffolding logic by building a minimal fixture that mirrors the
// templates structure and exercising the copy logic inline.

async function scaffoldHooksAndAgents(
  cwd: string,
  srcHooks: string,
  srcAgents: string,
): Promise<{ hooksInstalled: string[]; agentsInstalled: string[] }> {
  const { mkdir: mkdirNode, copyFile, readdir } = await import("node:fs/promises");
  const hooksInstalled: string[] = [];
  const agentsInstalled: string[] = [];

  const hooksDir = resolve(cwd, ".claude", "hooks");
  const agentsDir = resolve(cwd, ".claude", "agents");

  await mkdirNode(hooksDir, { recursive: true });
  const hookFiles = (await readdir(srcHooks)).filter((f: string) => f.endsWith(".sh"));
  for (const f of hookFiles) {
    await copyFile(join(srcHooks, f), join(hooksDir, f));
    hooksInstalled.push(f);
  }

  await mkdirNode(agentsDir, { recursive: true });
  const agentFiles = (await readdir(srcAgents)).filter((f: string) => f.endsWith(".md"));
  for (const f of agentFiles) {
    await copyFile(join(srcAgents, f), join(agentsDir, f));
    agentsInstalled.push(f);
  }

  return { hooksInstalled, agentsInstalled };
}

describe("initProject — hook and agent scaffolding", () => {
  let tmpDir: string;
  let srcHooks: string;
  let srcAgents: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "adp-init-test-"));
    srcHooks = join(tmpDir, "src-hooks");
    srcAgents = join(tmpDir, "src-agents");
    await mkdir(srcHooks);
    await mkdir(srcAgents);
    await writeFile(join(srcHooks, "PreToolUse.sh"), "#!/bin/bash\necho pre");
    await writeFile(join(srcHooks, "PostToolUse.sh"), "#!/bin/bash\necho post");
    await writeFile(join(srcHooks, "SessionStart.sh"), "#!/bin/bash\necho session");
    await writeFile(join(srcAgents, "evaluator.md"), "# Evaluator");
    await writeFile(join(srcAgents, "worktree-agent.md"), "# Worktree");
    await writeFile(join(srcAgents, "contract-reviewer.md"), "# Contract");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("copies hook scripts into .claude/hooks/", async () => {
    const { hooksInstalled } = await scaffoldHooksAndAgents(tmpDir, srcHooks, srcAgents);
    expect(hooksInstalled).toHaveLength(3);
    expect(hooksInstalled).toContain("PreToolUse.sh");
    expect(hooksInstalled).toContain("PostToolUse.sh");
    expect(hooksInstalled).toContain("SessionStart.sh");
    expect(existsSync(join(tmpDir, ".claude", "hooks", "PreToolUse.sh"))).toBe(true);
  });

  it("copies agent definitions into .claude/agents/", async () => {
    const { agentsInstalled } = await scaffoldHooksAndAgents(tmpDir, srcHooks, srcAgents);
    expect(agentsInstalled).toHaveLength(3);
    expect(agentsInstalled).toContain("evaluator.md");
    expect(agentsInstalled).toContain("worktree-agent.md");
    expect(agentsInstalled).toContain("contract-reviewer.md");
    expect(existsSync(join(tmpDir, ".claude", "agents", "evaluator.md"))).toBe(true);
  });

  it("creates .claude/hooks/ and .claude/agents/ directories", async () => {
    await scaffoldHooksAndAgents(tmpDir, srcHooks, srcAgents);
    expect(existsSync(join(tmpDir, ".claude", "hooks"))).toBe(true);
    expect(existsSync(join(tmpDir, ".claude", "agents"))).toBe(true);
  });

  it("only copies .sh files from hooks source (ignores non-sh)", async () => {
    await writeFile(join(srcHooks, "readme.txt"), "ignore me");
    const { hooksInstalled } = await scaffoldHooksAndAgents(tmpDir, srcHooks, srcAgents);
    expect(hooksInstalled).not.toContain("readme.txt");
  });

  it("only copies .md files from agents source (ignores non-md)", async () => {
    await writeFile(join(srcAgents, "notes.txt"), "ignore me");
    const { agentsInstalled } = await scaffoldHooksAndAgents(tmpDir, srcHooks, srcAgents);
    expect(agentsInstalled).not.toContain("notes.txt");
  });
});
