#!/usr/bin/env node
/**
 * Build standalone single-file binaries for the `adp` CLI.
 *
 * Uses @yao-pkg/pkg (community fork supporting Node 22) to bundle
 * dist/cli.js + node_modules + node runtime into a single executable.
 *
 * The TUI (src/ui/) is excluded — Ink/React don't bundle cleanly with pkg.
 * Only CLI commands are available in the standalone binary.
 *
 * Usage:
 *   node scripts/build-standalone.mjs                # host platform only
 *   node scripts/build-standalone.mjs --all          # linux + macos + windows
 *   node scripts/build-standalone.mjs --target node22-linux-x64
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform, arch } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2);

function hostTarget() {
  const p = platform();
  const a = arch();
  const platMap = { linux: "linux", darwin: "macos", win32: "win" };
  const archMap = { x64: "x64", arm64: "arm64" };
  const plat = platMap[p];
  const ar = archMap[a];
  if (!plat || !ar) {
    throw new Error(`Unsupported host platform: ${p}-${a}`);
  }
  return `node22-${plat}-${ar}`;
}

let targets;
const targetIdx = args.indexOf("--target");
if (targetIdx >= 0) {
  targets = [args[targetIdx + 1]];
} else if (args.includes("--all")) {
  targets = ["node22-linux-x64", "node22-macos-arm64", "node22-macos-x64", "node22-win-x64"];
} else {
  targets = [hostTarget()];
}

const entry = resolve(root, "dist", "cli.js");
if (!existsSync(entry)) {
  console.error(`✗ ${entry} not found — run \`npm run build\` first`);
  process.exit(1);
}

console.log(`\n  Building standalone binaries for: ${targets.join(", ")}\n`);

const distDir = resolve(root, "dist");

for (const target of targets) {
  const [, plat, ar] = target.split("-");
  const ext = plat === "win" ? ".exe" : "";
  const outPath = resolve(distDir, `adp-${plat}-${ar}${ext}`);

  console.log(`  → ${target} → ${outPath}`);

  await runPkg([entry, "--target", target, "--output", outPath]);

  console.log(`  ✓ ${outPath}\n`);
}

console.log("  Done.\n");

function runPkg(pkgArgs) {
  return new Promise((resolveP, rejectP) => {
    const isWin = platform() === "win32";
    const cmd = isWin ? "npx.cmd" : "npx";
    const child = spawn(cmd, ["-y", "@yao-pkg/pkg", ...pkgArgs], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("error", rejectP);
    child.on("exit", (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`pkg exited with code ${code}`));
    });
  });
}
