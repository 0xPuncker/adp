import { describe, it, expect } from "vitest";
import { parseTasks } from "./parser.js";

const SAMPLE = `# Tasks: feature

Progress: 0/3 complete

## TASK-01: Setup module
- [ ] **Requirement:** REQ-01, REQ-01.1
- [ ] **Files:** src/foo/bar.ts, src/foo/baz.ts
- [ ] **Reuses:** src/lib/db.ts:42
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** module imports cleanly
- [ ] **Test:** vitest src/foo/bar.test.ts
- [ ] **Commit:** \`feat(foo): add bar [ADP-TASK-01]\`

## TASK-02: Add validation
- [ ] **Requirement:** REQ-02
- [ ] **Files:** src/foo/bar.ts
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** —
- [ ] **Done when:** invalid input returns 400
- [ ] **Commit:** \`feat(foo): validate input [ADP-TASK-02]\`

## TASK-03: Add wiring
- [ ] **Requirement:** REQ-03
- [ ] **Files:** src/cli.ts
- [ ] **Depends:** TASK-01, TASK-02
- [ ] **Parallel:** —
- [ ] **Done when:** CLI command works
- [ ] **Commit:** \`feat(cli): wire foo command [ADP-TASK-03]\`
`;

describe("parseTasks", () => {
  it("parses 3 tasks with id and summary", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].id).toBe("TASK-01");
    expect(tasks[0].summary).toBe("Setup module");
    expect(tasks[2].summary).toBe("Add wiring");
  });

  it("parses requirements as a list", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks[0].requirements).toEqual(["REQ-01", "REQ-01.1"]);
    expect(tasks[1].requirements).toEqual(["REQ-02"]);
  });

  it("parses files list", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks[0].files).toEqual(["src/foo/bar.ts", "src/foo/baz.ts"]);
    expect(tasks[1].files).toEqual(["src/foo/bar.ts"]);
  });

  it("parses dependsOn — 'none' becomes empty array", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks[0].dependsOn).toEqual([]);
    expect(tasks[1].dependsOn).toEqual(["TASK-01"]);
    expect(tasks[2].dependsOn).toEqual(["TASK-01", "TASK-02"]);
  });

  it("detects [P] parallel marker", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks[0].parallel).toBe(true);
    expect(tasks[1].parallel).toBe(false);
    expect(tasks[2].parallel).toBe(false);
  });

  it("captures doneWhen and commit", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks[0].doneWhen).toBe("module imports cleanly");
    expect(tasks[0].commit).toBe("feat(foo): add bar [ADP-TASK-01]");
  });

  it("returns empty array on empty input", () => {
    expect(parseTasks("")).toEqual([]);
    expect(parseTasks("# Tasks\n\nProgress: 0/0\n")).toEqual([]);
  });

  it("ignores tasks without proper headers", () => {
    const malformed = `## Not a TASK header
- [ ] **Requirement:** X
`;
    expect(parseTasks(malformed)).toEqual([]);
  });
});
