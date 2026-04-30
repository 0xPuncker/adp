#!/usr/bin/env node
/**
 * Smoke test for the live sub-agent watcher.
 *
 * Writes a synthetic agent JSONL into a temp subagents/ dir, starts the LiveWatcher,
 * waits for the corresponding SubagentEvent, then exits 0 on success / 1 on failure.
 *
 *   node scripts/smoke-live.mjs
 *
 * Used by CI to confirm the chokidar plumbing is intact across platforms without
 * having to spin up the Ink TUI.
 */

import { mkdtemp, mkdir, writeFile, appendFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FAIL = (msg) => {
  console.error(`smoke-live: FAIL — ${msg}`);
  process.exit(1);
};

async function loadWatcher() {
  // Prefer compiled dist/, fall back to tsx-via-source if dist isn't built yet.
  const fromDist = resolve(process.cwd(), "dist", "live", "watcher.js");
  try {
    const mod = await import(pathToFileURL(fromDist).href);
    return mod.LiveWatcher;
  } catch {
    const mod = await import(
      pathToFileURL(resolve(process.cwd(), "src", "live", "watcher.ts")).href
    );
    return mod.LiveWatcher;
  }
}

async function main() {
  const root = await mkdtemp(resolve(tmpdir(), "adp-smoke-live-"));
  const subDir = resolve(root, "subagents");
  await mkdir(subDir, { recursive: true });

  const LiveWatcher = await loadWatcher();
  const watcher = new LiveWatcher({ dir: subDir });

  const seen = [];
  watcher.on("event", (ev) => seen.push(ev));
  watcher.on("status", (s) => {
    if (s.kind === "degraded") FAIL(`watcher reported degraded — ${s.reason}`);
  });
  watcher.on("error", (err) => FAIL(`watcher emitted error: ${err.message}`));

  await watcher.start();

  const file = resolve(subDir, "agent-smoke.jsonl");
  const userLine = JSON.stringify({
    type: "user",
    timestamp: "2026-04-30T12:00:00Z",
    cwd: process.cwd(),
    message: { role: "user", content: "QA evaluator smoke test" },
  });
  await writeFile(file, userLine);

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (seen.find((e) => e.agentId === "smoke")) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  if (!seen.find((e) => e.agentId === "smoke")) {
    await watcher.close();
    await rm(root, { recursive: true, force: true });
    FAIL("did not observe SubagentEvent for synthetic agent within 5s");
  }

  // Also confirm append → re-emit
  const assistantLine = JSON.stringify({
    type: "assistant",
    timestamp: "2026-04-30T12:01:00Z",
    message: {
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Verdict: pass" }],
    },
  });
  await appendFile(file, "\n" + assistantLine);

  const deadline2 = Date.now() + 5000;
  while (Date.now() < deadline2) {
    const done = seen.find((e) => e.agentId === "smoke" && e.status === "done");
    if (done) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  await watcher.close();
  await rm(root, { recursive: true, force: true });

  if (!seen.find((e) => e.agentId === "smoke" && e.status === "done")) {
    FAIL("did not observe completion (status=done) after appending end_turn");
  }

  console.log(`smoke-live: OK — ${seen.length} events observed`);
}

main().catch((err) => FAIL(err?.message ?? String(err)));
