import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parseSubagentFile, agentFilePath } from "./subagents.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(resolve(tmpdir(), "adp-subagent-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeRaw(name: string, lines: object[]): string {
  const path = resolve(dir, name);
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n"));
  return path;
}

describe("parseSubagentFile", () => {
  it("extracts prompt, verdict, and tool calls from a typical run", async () => {
    const path = writeRaw("agent-abc.jsonl", [
      {
        type: "user",
        timestamp: "2026-04-30T10:00:00Z",
        cwd: "C:\\repo",
        message: { role: "user", content: "Review this sprint contract." },
      },
      {
        type: "assistant",
        timestamp: "2026-04-30T10:00:05Z",
        message: {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              name: "Read",
              input: { file_path: "src/foo.ts" },
            },
          ],
        },
      },
      {
        type: "assistant",
        timestamp: "2026-04-30T10:00:10Z",
        message: {
          stop_reason: "end_turn",
          content: [{ type: "text", text: "All good. Verdict: pass" }],
        },
      },
    ]);
    writeFileSync(path.replace(/\.jsonl$/, ".meta.json"), JSON.stringify({ agentType: "general-purpose" }));

    const ev = await parseSubagentFile(path);
    expect(ev).not.toBeNull();
    expect(ev!.agentId).toBe("abc");
    expect(ev!.agentType).toBe("general-purpose");
    expect(ev!.prompt).toContain("sprint contract");
    expect(ev!.classified).toBe("contract-review");
    expect(ev!.recentToolCalls).toHaveLength(1);
    expect(ev!.recentToolCalls[0]).toMatchObject({ name: "Read", target: "src/foo.ts" });
    expect(ev!.startedAt).toBe("2026-04-30T10:00:00Z");
    expect(ev!.endedAt).toBe("2026-04-30T10:00:10Z");
    expect(ev!.status).toBe("done");
    expect(ev!.verdict.pass).toBe(true);
  });

  it("parses an evaluator-shaped JSON verdict and applies thresholds", async () => {
    const verdictJson = JSON.stringify({
      sprint: 1,
      verdict: "fail",
      scores: {
        correctness: 70,
        completeness: 80,
        code_quality: 88,
        test_coverage: 90,
      },
      issues: [],
      suggestions: [],
    });
    const path = writeRaw("agent-eval1.jsonl", [
      {
        type: "user",
        timestamp: "2026-04-30T10:00:00Z",
        message: { role: "user", content: "You are a QA evaluator. Grading Criteria follow." },
      },
      {
        type: "assistant",
        timestamp: "2026-04-30T10:01:00Z",
        message: {
          stop_reason: "end_turn",
          content: [{ type: "text", text: verdictJson }],
        },
      },
    ]);

    const ev = await parseSubagentFile(path, {
      evaluatorThresholds: {
        correctness: 90,
        completeness: 85,
        code_quality: 85,
        test_coverage: 90,
      },
    });
    expect(ev).not.toBeNull();
    expect(ev!.classified).toBe("evaluator");
    expect(ev!.verdict.parsedScores).toMatchObject({ correctness: 70, completeness: 80 });
    expect(ev!.verdict.pass).toBe(false);
  });

  it("returns null for an empty file", async () => {
    const path = resolve(dir, "agent-empty.jsonl");
    writeFileSync(path, "");
    const ev = await parseSubagentFile(path);
    expect(ev).toBeNull();
  });

  it("treats absent end_turn as still running", async () => {
    const path = writeRaw("agent-running.jsonl", [
      {
        type: "user",
        timestamp: "2026-04-30T10:00:00Z",
        message: { role: "user", content: "Do work" },
      },
      {
        type: "assistant",
        timestamp: "2026-04-30T10:00:05Z",
        message: {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", name: "Bash", input: { command: "ls" } }],
        },
      },
    ]);
    const ev = await parseSubagentFile(path);
    expect(ev!.status).toBe("running");
    expect(ev!.endedAt).toBeNull();
  });

  it("skips malformed JSON lines without throwing", async () => {
    const path = resolve(dir, "agent-mixed.jsonl");
    writeFileSync(
      path,
      [
        "not json at all",
        JSON.stringify({
          type: "user",
          timestamp: "2026-04-30T10:00:00Z",
          message: { role: "user", content: "QA evaluator: review." },
        }),
      ].join("\n"),
    );
    const ev = await parseSubagentFile(path);
    expect(ev).not.toBeNull();
    expect(ev!.classified).toBe("evaluator");
  });

  it("keeps only the last 5 tool calls", async () => {
    const lines: object[] = [
      {
        type: "user",
        timestamp: "2026-04-30T10:00:00Z",
        message: { role: "user", content: "x" },
      },
    ];
    for (let i = 0; i < 8; i++) {
      lines.push({
        type: "assistant",
        timestamp: `2026-04-30T10:00:${String(i).padStart(2, "0")}Z`,
        message: {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", name: "Bash", input: { command: `echo ${i}` } }],
        },
      });
    }
    const path = writeRaw("agent-many.jsonl", lines);
    const ev = await parseSubagentFile(path);
    expect(ev!.recentToolCalls).toHaveLength(5);
    expect(ev!.recentToolCalls[0].target).toBe("echo 3");
    expect(ev!.recentToolCalls[4].target).toBe("echo 7");
  });

  it("agentFilePath joins subagents root and agent id", () => {
    const p = agentFilePath(dir, "abc");
    expect(p.endsWith("agent-abc.jsonl")).toBe(true);
    expect(p.startsWith(dir)).toBe(true);
  });
});
