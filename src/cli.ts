#!/usr/bin/env node

import { resolve } from "node:path";
import { HarnessEngine } from "./harness/engine.js";
import { ContextLoader } from "./context/loader.js";
import { StateManager } from "./state/manager.js";
import { readSessionCosts } from "./session/costs.js";
import { saveUsageReport, loadUsageReport } from "./session/tracker.js";

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
    case "usage":
      await showUsage();
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

  const state = new StateManager(cwd);
  const summary = results.map((r) => `${r.name} ${r.passed ? "✓" : "✗"}`).join(" ");
  await state.logSensorResult(allPassed, summary);

  if (!allPassed) process.exitCode = 1;
}

async function showStatus(): Promise<void> {
  const state = new StateManager(cwd);
  const s = await state.load();
  const session = await readSessionCosts(cwd);

  const sprintsDone = s.sprints.filter((sp) => sp.status === "done").length;
  const sprintsFailed = s.sprints.filter((sp) => sp.status === "failed").length;
  const elapsed = s.startedAt ? formatElapsed(s.startedAt) : "—";

  // Average score
  const scored = s.sprints.filter((sp) => sp.score !== null);
  const avgScore = scored.length > 0
    ? (scored.reduce((sum, sp) => sum + (sp.score ?? 0), 0) / scored.length).toFixed(1)
    : "—";

  console.log("\n  ADP Status");
  console.log("  ══════════════════════════════════════════\n");
  console.log(`  Status:     ${statusLabel(s.status)}`);
  console.log(`  Feature:    ${s.feature ?? "—"}`);
  console.log(`  Phase:      ${s.phase ?? "—"}`);
  console.log(`  Complexity: ${s.complexity ?? "—"}`);
  console.log(`  Sprints:    ${sprintsDone}/${s.sprints.length}${sprintsFailed > 0 ? ` \x1b[31m(${sprintsFailed} failed)\x1b[0m` : ""}`);
  console.log(`  Avg Score:  ${avgScore}`);
  console.log(`  Tokens:     ${formatTokens(session.total_tokens)} (${session.messages} msgs)`);
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
      const score = sp.score !== null
        ? (sp.score > 10 ? `${sp.score}%` : `${sp.score}/10`)
        : "—";
      const duration = sp.startedAt && sp.completedAt
        ? formatDuration(sp.startedAt, sp.completedAt)
        : "—";
      console.log(`  ${icon} #${String(sp.id).padEnd(3)} ${sp.task.padEnd(28)} ${score.padEnd(7)} ${duration}`);
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

async function showUsage(): Promise<void> {
  const state = new StateManager(cwd);
  const s = await state.load();
  const session = await readSessionCosts(cwd);

  // Save report for tuning
  const report = await saveUsageReport(cwd, s);

  console.log("\n  ADP Token Usage");
  console.log("  ══════════════════════════════════════════\n");

  // Session breakdown
  console.log("  \x1b[1mSession Totals\x1b[0m");
  console.log(`  Input:        ${formatTokens(session.input_tokens).padEnd(12)} tokens`);
  console.log(`  Output:       ${formatTokens(session.output_tokens).padEnd(12)} tokens`);
  console.log(`  Cache Read:   ${formatTokens(session.cache_read_tokens).padEnd(12)} tokens`);
  console.log(`  Cache Write:  ${formatTokens(session.cache_write_tokens).padEnd(12)} tokens`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Total:        \x1b[1m${formatTokens(session.total_tokens).padEnd(12)}\x1b[0m tokens`);
  console.log(`  Messages:     ${session.messages}`);
  console.log(`  Est. Cost:    \x1b[33m${formatUsd(report.cost_estimate_usd)}\x1b[0m`);

  // Per-sprint breakdown
  if (s.sprints.length > 0) {
    console.log("\n  \x1b[1mPer-Sprint Breakdown\x1b[0m");
    console.log(`  ${"#".padEnd(4)}${"Task".padEnd(28)}${"Status".padEnd(10)}${"Duration".padEnd(10)}${"Score".padEnd(7)}`);
    console.log("  ──────────────────────────────────────────────────────────────────");

    for (const sp of s.sprints) {
      const duration = sp.startedAt && sp.completedAt
        ? formatDuration(sp.startedAt, sp.completedAt)
        : "—";
      const taskLabel = sp.task.length > 26 ? sp.task.slice(0, 24) + ".." : sp.task;
      const score = sp.score !== null
        ? (sp.score > 10 ? `${sp.score}%` : `${sp.score}/10`)
        : "—";
      const statusColor = sp.status === "done" ? "\x1b[32m"
        : sp.status === "failed" ? "\x1b[31m"
        : "\x1b[2m";

      console.log(`  ${String(sp.id).padEnd(4)}${taskLabel.padEnd(28)}${statusColor}${sp.status.padEnd(10)}\x1b[0m${duration.padEnd(10)}${score}`);
    }

    // Summary
    const totalDuration = report.pipeline.elapsed_s;
    const avgPerSprint = totalDuration && s.sprints.length > 0
      ? Math.floor(totalDuration / s.sprints.length)
      : null;
    console.log("  ──────────────────────────────────────────────────────────────────");
    console.log(`  Total elapsed: ${totalDuration ? formatSeconds(totalDuration) : "—"}`);
    if (avgPerSprint) {
      console.log(`  Avg/sprint:    ${formatSeconds(avgPerSprint)}`);
    }
  }

  console.log(`\n  \x1b[2mSaved to .adp/usage.json (use for tuning: budgets, timing, thresholds)\x1b[0m\n`);
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
  Spec-to-code sprints with feedback control

  Usage: adp <command> [options]

  Commands:
    status               Pipeline state, sprints, scores, token usage
    usage                Full token breakdown & cost estimate (saves .adp/usage.json)
    sensors              Run harness sensors (typecheck, lint, test)
    guides               List loaded guides with token counts
    start <feat> [comp]  Start pipeline for a feature
    sprint:start <task> <contract>   Begin a sprint
    sprint:end <id> <score>          Complete a sprint with score
    log <message>        Add activity log entry

  Options:
    --cwd <path>         Target project directory (default: cwd)

  Token Tracking:
    The status bar and /usage command read Claude Code session files
    (~/.claude/projects/<slug>/*.jsonl) for real-time token accounting.
    Run "adp usage" to generate .adp/usage.json with per-sprint timing,
    token counts, and estimated cost — use this for tuning budgets.

  Interactive:
    npm start [-- --cwd <path>]   Launch TUI dashboard
    Shortcuts: 1=dashboard, 2=sensors, 3=usage, r=refresh, ?=help, q=quit
`);
}

function statusLabel(status: string): string {
  switch (status) {
    case "running": return "\x1b[32m▶ RUNNING\x1b[0m";
    case "paused": return "\x1b[33m⏸ PAUSED\x1b[0m";
    case "blocked": return "\x1b[31m✗ BLOCKED\x1b[0m";
    case "completed": return "\x1b[32m✓ COMPLETED\x1b[0m";
    case "awaiting_user": return "\x1b[33m◎ AWAITING\x1b[0m";
    default: return "\x1b[2m○ IDLE\x1b[0m";
  }
}

function activityIcon(type: string): string {
  switch (type) {
    case "sprint_start": return "\x1b[32m→\x1b[0m";
    case "sprint_end": return "\x1b[36m←\x1b[0m";
    case "sensor_pass": return "\x1b[32m✓\x1b[0m";
    case "sensor_fail": return "\x1b[31m✗\x1b[0m";
    case "commit": return "\x1b[32m●\x1b[0m";
    case "error": return "\x1b[31m!\x1b[0m";
    case "init": return "\x1b[35m◆\x1b[0m";
    case "run_start": return "\x1b[32m▶\x1b[0m";
    case "run_end": return "\x1b[32m■\x1b[0m";
    case "phase_start": return "\x1b[34m→\x1b[0m";
    case "phase_end": return "\x1b[32m✓\x1b[0m";
    case "pause": return "\x1b[33m⏸\x1b[0m";
    case "resume": return "\x1b[32m▶\x1b[0m";
    case "blocked": return "\x1b[31m⊘\x1b[0m";
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
  return formatSeconds(Math.floor(diff / 1000));
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return "—";
  return formatSeconds(Math.floor(diff / 1000));
}

function formatUsd(n: number | null): string {
  if (n === null || n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
