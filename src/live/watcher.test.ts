import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { LiveWatcher, type LiveWatcherStatus } from "./watcher.js";
import type { SubagentEvent } from "./types.js";

let root: string;
let subDir: string;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "adp-watcher-"));
  subDir = resolve(root, "subagents");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function agentLines(agentId: string): string {
  return [
    JSON.stringify({
      type: "user",
      timestamp: "2026-04-30T10:00:00Z",
      cwd: "C:\\repo",
      agentId,
      message: { role: "user", content: "QA evaluator: review this sprint." },
    }),
  ].join("\n");
}

function assistantEndTurn(agentId: string): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: "2026-04-30T10:01:00Z",
    agentId,
    message: {
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Verdict: pass" }],
    },
  });
}

async function waitFor<T>(predicate: () => T | undefined | null, timeoutMs = 2000): Promise<NonNullable<T>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = predicate();
    if (v !== null && v !== undefined) return v as NonNullable<T>;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

describe("LiveWatcher", () => {
  it("emits an idle status when the dir does not yet exist (waits for it to appear)", async () => {
    const w = new LiveWatcher({ dir: subDir });
    let status: LiveWatcherStatus | null = null;
    w.on("status", (s) => (status = s));
    await w.start();
    expect(status).not.toBeNull();
    expect(status!.kind).toBe("idle");
    await w.close();
  });

  it("transitions from idle to watching once the dir appears", async () => {
    const w = new LiveWatcher({ dir: subDir });
    const seen: LiveWatcherStatus[] = [];
    w.on("status", (s) => seen.push(s));
    await w.start();
    expect(seen.some((s) => s.kind === "idle")).toBe(true);

    // Create the dir; the poller (2s) should pick it up.
    mkdirSync(subDir);
    await waitFor(() => seen.find((s) => s.kind === "watching") ?? null, 4000);
    await w.close();
  });

  it("emits a watching status when the dir exists", async () => {
    mkdirSync(subDir);
    const w = new LiveWatcher({ dir: subDir });
    const seen: LiveWatcherStatus[] = [];
    w.on("status", (s) => seen.push(s));
    await w.start();
    expect(seen.some((s) => s.kind === "watching")).toBe(true);
    await w.close();
  });

  it("emits an event when a new agent JSONL appears", async () => {
    mkdirSync(subDir);
    const w = new LiveWatcher({ dir: subDir });
    const events: SubagentEvent[] = [];
    w.on("event", (e) => events.push(e));
    await w.start();

    const file = resolve(subDir, "agent-newone.jsonl");
    writeFileSync(file, agentLines("newone") + "\n" + assistantEndTurn("newone"));

    const found = await waitFor(() => events.find((e) => e.agentId === "newone"));
    expect(found.classified).toBe("evaluator");
    expect(found.status).toBe("done");
    await w.close();
  });

  it("re-emits when an existing agent file is appended to", async () => {
    mkdirSync(subDir);
    const file = resolve(subDir, "agent-grower.jsonl");
    writeFileSync(file, agentLines("grower"));

    const w = new LiveWatcher({ dir: subDir });
    const events: SubagentEvent[] = [];
    w.on("event", (e) => events.push(e));
    await w.start();

    await waitFor(() => events.find((e) => e.agentId === "grower" && e.status === "running"));
    appendFileSync(file, "\n" + assistantEndTurn("grower"));
    await waitFor(() => events.find((e) => e.agentId === "grower" && e.status === "done"));

    await w.close();
  });

  it("ignores files that are not agent JSONL", async () => {
    mkdirSync(subDir);
    const w = new LiveWatcher({ dir: subDir });
    const events: SubagentEvent[] = [];
    w.on("event", (e) => events.push(e));
    await w.start();

    writeFileSync(resolve(subDir, "agent-skipped.meta.json"), "{}");
    writeFileSync(resolve(subDir, "agent-real.jsonl"), agentLines("real"));

    await waitFor(() => events.find((e) => e.agentId === "real"));
    expect(events.every((e) => e.agentId !== "skipped")).toBe(true);
    await w.close();
  });

  it("close() releases the watcher", async () => {
    mkdirSync(subDir);
    const w = new LiveWatcher({ dir: subDir });
    await w.start();
    await w.close();
    // calling close() twice should be safe
    await w.close();
    expect(existsSync(subDir)).toBe(true);
  });
});
