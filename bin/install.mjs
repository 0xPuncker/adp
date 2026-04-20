#!/usr/bin/env node
// ADP skill installer — cross-platform, runnable via:
//   npx github:0xPuncker/adp install
//   npx adp install            (after npm install -g)
//
// When invoked through npx, the package is already unpacked in a temp dir and
// this script simply copies the skill files into ~/.claude/skills/adp.
// When installed globally, it does the same from its install location.
//
// Env overrides:
//   CLAUDE_SKILLS_DIR  default: ~/.claude/skills
//   ADP_FORCE=1        overwrite non-git target without prompting

import { cp, mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

const skillsDir = process.env.CLAUDE_SKILLS_DIR || join(homedir(), ".claude", "skills");
const target = join(skillsDir, "adp");
const force = process.env.ADP_FORCE === "1";

const KEEP = ["SKILL.md", "README.md", "templates", "LICENSE", "package.json"];

function log(msg) { process.stdout.write(msg + "\n"); }
function fail(msg) { process.stderr.write("✗ " + msg + "\n"); process.exit(1); }

log(`→ Installing ADP skill`);
log(`  source: ${pkgRoot}`);
log(`  target: ${target}`);
log("");

if (existsSync(join(target, ".git"))) {
  fail(`${target} is a git clone — update it with 'git -C "${target}" pull' instead.`);
}

if (existsSync(target)) {
  if (!force) {
    fail(`${target} already exists. Re-run with ADP_FORCE=1 to overwrite, or remove it.`);
  }
  log(`→ Overwriting existing ${target}`);
  await rm(target, { recursive: true, force: true });
}

await mkdir(target, { recursive: true });

for (const name of KEEP) {
  const src = join(pkgRoot, name);
  if (!existsSync(src)) continue;
  const dst = join(target, name);
  const s = await stat(src);
  if (s.isDirectory()) {
    await cp(src, dst, { recursive: true });
  } else {
    await cp(src, dst);
  }
  log(`  ✓ ${name}`);
}

log("");
log(`✓ ADP installed at ${target}`);
log("");
log("Next steps:");
log("  1. Open Claude Code in any project");
log("  2. Say: adp init");
log("  3. Then: adp run <feature-name>");
log("");
log(`Docs: ${join(target, "README.md")}`);
