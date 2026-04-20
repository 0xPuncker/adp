#!/usr/bin/env node

import * as readline from "node:readline";
import { HarnessEngine } from "./harness/engine.js";
import { ContextLoader } from "./context/loader.js";
import { StateManager } from "./state/manager.js";
import type { PipelineState, Sprint, Activity } from "./types.js";

const BLUE = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// Target project — passed via --cwd or defaults to cwd
const args = process.argv.slice(2);
const cwdIdx = args.indexOf("--cwd");
const targetCwd = cwdIdx !== -1 ? args[cwdIdx + 1] : process.cwd();

async function main(): Promise<void> {
  const isTTY = process.stdin.isTTY ?? false;

  printBanner();
  await printStatus();
  printHelp();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: isTTY,
  });

  if (!isTTY) {
    const lines: string[] = [];
    for await (const line of rl) {
      lines.push(line.trim());
    }
    for (const line of lines) {
      if (line) await processCommand(line);
    }
    process.exit(0);
  }

  rl.on("close", () => {
    console.log(`\n${DIM}Session ended.${RESET}\n`);
    process.exit(0);
  });

  const prompt = () => rl.question(`${BLUE}adp${RESET} ${DIM}›${RESET} `, async (line) => {
    await processCommand(line.trim());
    prompt();
  });

  prompt();
}

// ─── Command Dispatch ────────────────────────────────────────────

async function processCommand(input: string): Promise<void> {
  if (!input) return;

  const [cmd, ...cmdArgs] = input.split(/\s+/);

  try {
    switch (cmd) {
      case "help":
      case "h":
      case "?":
        printHelp();
        break;
      case "status":
      case "s":
        await printStatus();
        break;
      case "sensors":
      case "verify":
        await runSensors();
        break;
      case "guides":
        await showGuides();
        break;
      case "sprints":
      case "sp":
        await printSprints();
        break;
      case "sprint":
        await printSprintDetail(parseInt(cmdArgs[0] ?? "0", 10));
        break;
      case "activity":
      case "a":
        await printActivity(parseInt(cmdArgs[0] ?? "15", 10));
        break;
      case "start":
        await startPipeline(cmdArgs[0], cmdArgs[1]);
        break;
      case "pause":
        await pausePipeline();
        break;
      case "unblock":
        await clearBlockers();
        break;
      case "log":
        await addLog(cmdArgs.join(" "));
        break;
      case "clear":
        console.clear();
        printBanner();
        break;
      case "exit":
      case "quit":
      case "q":
        console.log(`\n${DIM}Session ended.${RESET}\n`);
        process.exit(0);
      default:
        console.log(`${DIM}Unknown: ${cmd}. Type 'help'.${RESET}`);
    }
  } catch (err: unknown) {
    const e = err as Error;
    console.log(`${RED}Error: ${e.message}${RESET}`);
  }
}

// ─── Commands ────────────────────────────────────────────────────

async function printStatus(): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();

  const sprintsDone = s.sprints.filter((sp) => sp.status === "done").length;
  const totalSprints = s.sprints.length;
  const totalCost = s.sprints.reduce((sum, sp) => sum + sp.cost.total_tokens, 0);
  const elapsed = s.startedAt ? formatElapsed(s.startedAt) : "—";

  const statusColor = s.status === "running" ? GREEN
    : s.status === "blocked" ? RED
    : s.status === "paused" ? YELLOW
    : DIM;

  console.log("");
  console.log(`  ${statusColor}${statusIcon(s.status)} ${(s.status).toUpperCase()}${RESET}  │  Sprint ${BOLD}${sprintsDone}/${totalSprints}${RESET}  │  Cost ${BOLD}${formatTokens(totalCost)}${RESET}  │  Elapsed ${BOLD}${elapsed}${RESET}`);

  if (s.feature) {
    console.log(`  ${DIM}Feature: ${s.feature}  │  Phase: ${s.phase ?? "—"}  │  Complexity: ${s.complexity ?? "—"}${RESET}`);
  }

  if (s.blockers.length > 0) {
    console.log(`  ${RED}✗ ${s.blockers.length} blocker(s)${RESET}`);
  }
  console.log("");
}

async function runSensors(): Promise<void> {
  const engine = new HarnessEngine(targetCwd);
  const results = await engine.runSensors();

  if (results.length === 0) {
    console.log(`\n  ${DIM}No sensors configured. Create .adp/harness.yaml${RESET}\n`);
    return;
  }

  console.log("");
  for (const r of results) {
    const icon = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const time = `(${(r.duration_ms / 1000).toFixed(1)}s)`;
    console.log(`  ${icon} ${r.name.padEnd(15)} ${time}`);
    if (!r.passed) {
      const lines = r.output.split("\n").filter(Boolean).slice(0, 3);
      for (const line of lines) {
        console.log(`    ${DIM}${line}${RESET}`);
      }
      if (r.fix_hint) {
        console.log(`    ${YELLOW}→ ${r.fix_hint}${RESET}`);
      }
    }
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`\n  ${allPassed ? `${GREEN}All passing${RESET}` : `${RED}FAILING${RESET}`}\n`);

  // Log to state
  const state = new StateManager(targetCwd);
  const summary = results.map((r) => `${r.name} ${r.passed ? "✓" : "✗"}`).join(" ");
  await state.logSensorResult(allPassed, summary);
}

async function showGuides(): Promise<void> {
  const loader = new ContextLoader(targetCwd);
  const guides = await loader.loadGuides();

  if (guides.size === 0) {
    console.log(`\n  ${DIM}No guides found in .adp/guides/${RESET}\n`);
    return;
  }

  console.log(`\n  ${BOLD}Guides${RESET}\n`);
  let total = 0;
  for (const [name, content] of guides) {
    const tokens = Math.ceil(content.length / 4);
    total += tokens;
    console.log(`  • ${name.padEnd(20)} ~${tokens} tokens`);
  }
  console.log(`\n  ${DIM}Total: ~${total} tokens${RESET}\n`);
}

async function printSprints(): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();

  if (s.sprints.length === 0) {
    console.log(`\n  ${DIM}No sprints yet.${RESET}\n`);
    return;
  }

  console.log(`\n  ${BOLD}SPRINTS${RESET}`);
  console.log(`  ${"─".repeat(72)}`);
  console.log(`  ${DIM}${col("#", 4)}${col("Task", 28)}${col("Status", 12)}${col("Score", 8)}${col("Cost", 10)}${col("Time", 10)}${RESET}`);
  console.log(`  ${"─".repeat(72)}`);

  for (const sp of s.sprints) {
    const icon = sp.status === "done" ? `${GREEN}✓${RESET}`
      : sp.status === "failed" ? `${RED}✗${RESET}`
      : `${YELLOW}▶${RESET}`;
    const score = sp.score !== null ? `${sp.score}/100` : "—";
    const cost = formatTokens(sp.cost.total_tokens);
    const time = sp.startedAt && sp.completedAt
      ? formatDuration(sp.startedAt, sp.completedAt)
      : sp.startedAt ? `${DIM}active${RESET}` : "—";

    console.log(`  ${icon} ${col(String(sp.id), 3)}${col(truncate(sp.task, 26), 28)}${col(sp.status, 12)}${col(score, 8)}${col(cost, 10)}${time}`);
  }

  console.log(`  ${"─".repeat(72)}`);
  const totalTokens = s.sprints.reduce((sum, sp) => sum + sp.cost.total_tokens, 0);
  const scored = s.sprints.filter((sp) => sp.score !== null);
  const avg = scored.length > 0 ? Math.round(scored.reduce((sum, sp) => sum + sp.score!, 0) / scored.length) : null;
  console.log(`  ${DIM}    ${"".padEnd(28)}${"".padEnd(12)}${(avg !== null ? `avg ${avg}` : "").padEnd(8)}${formatTokens(totalTokens)}${RESET}`);
  console.log("");
}

async function printSprintDetail(id: number): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();
  const sprint = s.sprints.find((sp) => sp.id === id);

  if (!sprint) {
    console.log(`  ${RED}Sprint #${id} not found.${RESET}\n`);
    return;
  }

  console.log(`\n  ${BOLD}Sprint #${sprint.id}${RESET} — ${sprint.task}`);
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  Status:   ${sprint.status}`);
  console.log(`  Contract: ${sprint.contract || "(none)"}`);
  console.log(`  Score:    ${sprint.score !== null ? `${sprint.score}/100` : "—"}`);
  console.log(`  Cost:     ${formatTokens(sprint.cost.total_tokens)} (in: ${formatTokens(sprint.cost.input_tokens)}, out: ${formatTokens(sprint.cost.output_tokens)})`);
  if (sprint.startedAt) console.log(`  Started:  ${new Date(sprint.startedAt).toLocaleString()}`);
  if (sprint.completedAt) console.log(`  Finished: ${new Date(sprint.completedAt).toLocaleString()}`);
  console.log("");
}

async function printActivity(limit: number): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();

  if (s.activity.length === 0) {
    console.log(`\n  ${DIM}No activity yet.${RESET}\n`);
    return;
  }

  const recent = s.activity.slice(-limit);
  console.log(`\n  ${BOLD}ACTIVITY${RESET} ${DIM}(last ${recent.length} of ${s.activity.length})${RESET}`);
  console.log(`  ${"─".repeat(60)}`);
  for (const a of recent) {
    const time = formatTime(a.timestamp);
    const icon = activityIcon(a.type);
    console.log(`  ${DIM}${time}${RESET}  ${icon}  ${a.message}`);
  }
  console.log(`  ${"─".repeat(60)}`);
  console.log("");
}

async function startPipeline(feature?: string, complexity?: string): Promise<void> {
  if (!feature) {
    console.log(`  ${DIM}Usage: start <feature> [small|medium|large|complex]${RESET}`);
    return;
  }
  const comp = (complexity ?? "medium") as "small" | "medium" | "large" | "complex";
  const state = new StateManager(targetCwd);
  await state.startPipeline(feature, comp);
  console.log(`\n  ${GREEN}▶${RESET} Pipeline started: ${BOLD}${feature}${RESET} [${comp}]\n`);
}

async function pausePipeline(): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();
  s.status = "paused";
  await state.logActivity("info", "Pipeline paused");
  await state.save();
  console.log(`\n  ${YELLOW}⏸${RESET} Pipeline paused.\n`);
}

async function clearBlockers(): Promise<void> {
  const state = new StateManager(targetCwd);
  const s = await state.load();
  const count = s.blockers.length;
  s.blockers = [];
  if (s.status === "blocked") s.status = "running";
  await state.logActivity("info", `Cleared ${count} blocker(s)`);
  await state.save();
  console.log(`\n  ${GREEN}✓${RESET} Cleared ${count} blocker(s).\n`);
}

async function addLog(message: string): Promise<void> {
  if (!message) {
    console.log(`  ${DIM}Usage: log <message>${RESET}`);
    return;
  }
  const state = new StateManager(targetCwd);
  await state.logActivity("info", message);
  await state.save();
  console.log(`  ${GREEN}•${RESET} Logged.\n`);
}

// ─── Display ─────────────────────────────────────────────────────

function printBanner(): void {
  console.log("");
  console.log(`  ${BOLD}╔═══════════════════════════════════════╗${RESET}`);
  console.log(`  ${BOLD}║   ADP — Autonomous Dev Pipeline      ║${RESET}`);
  console.log(`  ${BOLD}╚═══════════════════════════════════════╝${RESET}`);
  console.log(`  ${DIM}Target: ${targetCwd}${RESET}`);
  console.log("");
}

function printHelp(): void {
  console.log(`  ${BOLD}Commands:${RESET}`);
  console.log(`  ${"─".repeat(44)}`);
  console.log(`  ${GREEN}status${RESET}    ${DIM}(s)${RESET}    Quick status bar`);
  console.log(`  ${GREEN}sensors${RESET}          Run feedback sensors`);
  console.log(`  ${GREEN}guides${RESET}           List loaded guides`);
  console.log(`  ${GREEN}sprints${RESET}   ${DIM}(sp)${RESET}   Sprint table`);
  console.log(`  ${GREEN}sprint N${RESET}         Sprint detail`);
  console.log(`  ${GREEN}activity${RESET}  ${DIM}(a)${RESET}    Activity log (a 5 = last 5)`);
  console.log(`  ${"─".repeat(44)}`);
  console.log(`  ${YELLOW}start${RESET}    <feat> [complexity]  Start pipeline`);
  console.log(`  ${YELLOW}pause${RESET}            Pause pipeline`);
  console.log(`  ${YELLOW}unblock${RESET}          Clear blockers`);
  console.log(`  ${YELLOW}log${RESET} <msg>        Add activity entry`);
  console.log(`  ${"─".repeat(44)}`);
  console.log(`  ${DIM}clear${RESET}  ${DIM}exit (q)${RESET}`);
  console.log("");
}

// ─── Helpers ─────────────────────────────────────────────────────

function statusIcon(status: string): string {
  switch (status) {
    case "running": return "▶";
    case "paused": return "⏸";
    case "blocked": return "✗";
    default: return "○";
  }
}

function activityIcon(type: string): string {
  switch (type) {
    case "sprint_start": return `${GREEN}→${RESET}`;
    case "sprint_end": return `${BLUE}←${RESET}`;
    case "sensor_pass": return `${GREEN}⚡${RESET}`;
    case "sensor_fail": return `${RED}⚡${RESET}`;
    case "commit": return `${GREEN}●${RESET}`;
    case "error": return `${RED}✗${RESET}`;
    default: return `${DIM}·${RESET}`;
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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m`;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return "??:??"; }
}

function col(text: string, width: number): string {
  return text.slice(0, width).padEnd(width);
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
