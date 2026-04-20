#!/usr/bin/env node

import { resolve } from "node:path";
import { HarnessEngine } from "./harness/engine.js";
import { ContextLoader } from "./context/loader.js";
import { StateManager } from "./state/manager.js";

const [, , command, ...args] = process.argv;
const cwd = args.includes("--cwd") ? args[args.indexOf("--cwd") + 1] : process.cwd();

async function main(): Promise<void> {
  switch (command) {
    case "sensors":
      await runSensors();
      break;
    case "status":
      await showStatus();
      break;
    case "guides":
      await showGuides();
      break;
    case "start":
      await startPipeline(args[0], args[1]);
      break;
    case "sprint:start":
      await startSprint(args[0], args.slice(1).join(" "));
      break;
    case "sprint:end":
      await endSprint(parseInt(args[0]), parseInt(args[1]));
      break;
    case "log":
      await logMessage(args.join(" "));
      break;
    case "help":
    default:
      printUsage();
  }
}

// ─── Commands ────────────────────────────────────────────────────

async function runSensors(): Promise<void> {
  const engine = new HarnessEngine(cwd);
  const results = await engine.runSensors();

  const allPassed = results.every((r) => r.passed);

  console.log("\n  ADP Sensors\n");
  for (const r of results) {
    const icon = r.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    const time = `(${(r.duration_ms / 1000).toFixed(1)}s)`;
    console.log(`  ${icon} ${r.name.padEnd(15)} ${time}`);
    if (!r.passed) {
      const lines = r.output.split("\n").filter(Boolean).slice(0, 4);
      for (const line of lines) {
        console.log(`    \x1b[2m${line}\x1b[0m`);
      }
      if (r.fix_hint) {
        console.log(`    \x1b[33m→ ${r.fix_hint}\x1b[0m`);
      }
    }
  }

  console.log(`\n  ${allPassed ? "\x1b[32mAll passing\x1b[0m" : "\x1b[31mFAILING\x1b[0m"}\n`);

  // Also update state
  const state = new StateManager(cwd);
  const summary = results.map((r) => `${r.name} ${r.passed ? "✓" : "✗"}`).join(" ");
  await state.logSensorResult(allPassed, summary);

  if (!allPassed) process.exitCode = 1;
}

async function showStatus(): Promise<void> {
  const state = new StateManager(cwd);
  const s = await state.load();

  const sprintsDone = s.sprints.filter((sp) => sp.status === "done").length;
  const totalCost = s.sprints.reduce((sum, sp) => sum + sp.cost.total_tokens, 0);
  const elapsed = s.startedAt ? formatElapsed(s.startedAt) : "—";

  console.log("\n  ADP Status");
  console.log("  ══════════════════════════════════════════\n");
  console.log(`  Status:     ${statusLabel(s.status)}`);
  console.log(`  Feature:    ${s.feature ?? "—"}`);
  console.log(`  Phase:      ${s.phase ?? "—"}`);
  console.log(`  Complexity: ${s.complexity ?? "—"}`);
  console.log(`  Sprint:     ${sprintsDone}/${s.sprints.length}`);
  console.log(`  Cost:       ${formatTokens(totalCost)} tokens`);
  console.log(`  Elapsed:    ${elapsed}`);

  if (s.blockers.length > 0) {
    console.log(`\n  \x1b[31mBlockers:\x1b[0m`);
    for (const b of s.blockers) {
      console.log(`    ✗ [${b.task}] ${b.sensor}: ${b.error}`);
    }
  }

  if (s.sprints.length > 0) {
    console.log("\n  Sprints");
    console.log("  ──────────────────────────────────────────");
    for (const sp of s.sprints) {
      const icon = sp.status === "done" ? "\x1b[32m✓\x1b[0m"
        : sp.status === "failed" ? "\x1b[31m✗\x1b[0m"
        : "\x1b[33m▶\x1b[0m";
      const score = sp.score !== null ? `${sp.score}/100` : "—";
      console.log(`  ${icon} #${sp.id} ${sp.task.padEnd(30)} ${score.padEnd(8)} ${formatTokens(sp.cost.total_tokens)}`);
    }
  }

  if (s.activity.length > 0) {
    const recent = s.activity.slice(-8);
    console.log("\n  Activity");
    console.log("  ──────────────────────────────────────────");
    for (const a of recent) {
      const time = new Date(a.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const icon = activityIcon(a.type);
      console.log(`  ${time}  ${icon}  ${a.message}`);
    }
  }

  console.log("");
}

async function showGuides(): Promise<void> {
  const loader = new ContextLoader(cwd);
  const guides = await loader.loadGuides();

  if (guides.size === 0) {
    console.log("\n  No guides found. Run `adp map` to generate.\n");
    return;
  }

  console.log("\n  ADP Guides\n");
  let totalTokens = 0;
  for (const [name, content] of guides) {
    const tokens = Math.ceil(content.length / 4);
    totalTokens += tokens;
    console.log(`  • ${name.padEnd(20)} ~${tokens} tokens`);
  }
  console.log(`\n  Total: ~${totalTokens} tokens\n`);
}

async function startPipeline(feature?: string, complexity?: string): Promise<void> {
  if (!feature) {
    console.log("  Usage: adp start <feature> [complexity]");
    process.exitCode = 1;
    return;
  }

  const state = new StateManager(cwd);
  const comp = (complexity ?? "medium") as "small" | "medium" | "large" | "complex";
  await state.startPipeline(feature, comp);
  console.log(`\n  \x1b[32m▶\x1b[0m Pipeline started: ${feature} [${comp}]\n`);
}

async function startSprint(task?: string, contract?: string): Promise<void> {
  if (!task) {
    console.log("  Usage: adp sprint:start <task-id> <contract description>");
    process.exitCode = 1;
    return;
  }

  const state = new StateManager(cwd);
  const sprint = await state.startSprint(task, contract ?? "");
  console.log(`\n  \x1b[32m→\x1b[0m Sprint #${sprint.id} started: ${task}\n`);
}

async function endSprint(id: number, score: number): Promise<void> {
  if (!id || isNaN(score)) {
    console.log("  Usage: adp sprint:end <id> <score>");
    process.exitCode = 1;
    return;
  }

  const state = new StateManager(cwd);
  await state.updateSprint(id, { status: "done", score });
  console.log(`\n  \x1b[32m←\x1b[0m Sprint #${id} complete — score: ${score}/100\n`);
}

async function logMessage(message: string): Promise<void> {
  if (!message) {
    console.log("  Usage: adp log <message>");
    process.exitCode = 1;
    return;
  }

  const state = new StateManager(cwd);
  await state.logActivity("info", message);
  await state.save();
  console.log(`  \x1b[32m•\x1b[0m Logged\n`);
}

// ─── Helpers ─────────────────────────────────────────────────────

function printUsage(): void {
  console.log(`
  ADP — Autonomous Development Pipeline

  Usage: adp <command> [options]

  Commands:
    sensors              Run all harness sensors (typecheck, lint, test)
    status               Show pipeline state, sprints, activity
    guides               List loaded guides with token counts
    start <feat> [comp]  Start pipeline for a feature
    sprint:start <task> <contract>   Begin a sprint
    sprint:end <id> <score>          Complete a sprint with score
    log <message>        Add activity log entry

  Options:
    --cwd <path>         Target project directory (default: cwd)
`);
}

function statusLabel(status: string): string {
  switch (status) {
    case "running": return "\x1b[32m▶ RUNNING\x1b[0m";
    case "paused": return "\x1b[33m⏸ PAUSED\x1b[0m";
    case "blocked": return "\x1b[31m✗ BLOCKED\x1b[0m";
    default: return "\x1b[2m○ IDLE\x1b[0m";
  }
}

function activityIcon(type: string): string {
  switch (type) {
    case "sprint_start": return "\x1b[32m→\x1b[0m";
    case "sprint_end": return "\x1b[36m←\x1b[0m";
    case "sensor_pass": return "\x1b[32m⚡\x1b[0m";
    case "sensor_fail": return "\x1b[31m⚡\x1b[0m";
    case "commit": return "\x1b[32m●\x1b[0m";
    case "error": return "\x1b[31m✗\x1b[0m";
    default: return "\x1b[2m·\x1b[0m";
  }
}

function formatTokens(tokens: number): string {
  if (tokens === 0) return "0";
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  if (diff < 0) return "—";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
