import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadHarnessConfig } from "./config.js";

const TMP = join(process.cwd(), ".adp-test-tmp");
const HARNESS_PATH = join(TMP, ".adp", "harness.yaml");

async function writeHarness(content: string): Promise<void> {
  await mkdir(join(TMP, ".adp"), { recursive: true });
  await writeFile(HARNESS_PATH, content, "utf-8");
}

describe("loadHarnessConfig — autonomy", () => {
  beforeEach(() => mkdir(join(TMP, ".adp"), { recursive: true }));
  afterEach(() => rm(TMP, { recursive: true, force: true }));

  it("defaults to critical/minimal when autonomy section is absent", async () => {
    await writeHarness(`mode: sprint\nmin_score: 85\n`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.autonomy.clarify).toBe("critical");
    expect(cfg.autonomy.output).toBe("minimal");
  });

  it("parses explicit autonomy values", async () => {
    await writeHarness(`
mode: sprint
min_score: 85
autonomy:
  clarify: never
  output: verbose
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.autonomy.clarify).toBe("never");
    expect(cfg.autonomy.output).toBe("verbose");
  });

  it("falls back to defaults for invalid autonomy values", async () => {
    await writeHarness(`
mode: sprint
min_score: 85
autonomy:
  clarify: bogus
  output: bogus
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.autonomy.clarify).toBe("critical");
    expect(cfg.autonomy.output).toBe("minimal");
  });

  it("handles partial autonomy config (only clarify set)", async () => {
    await writeHarness(`
mode: sprint
min_score: 85
autonomy:
  clarify: always
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.autonomy.clarify).toBe("always");
    expect(cfg.autonomy.output).toBe("minimal");
  });

  it("returns default autonomy when harness.yaml does not exist", async () => {
    const cfg = await loadHarnessConfig(join(TMP, "nonexistent"));
    expect(cfg.autonomy.clarify).toBe("critical");
    expect(cfg.autonomy.output).toBe("minimal");
  });
});

describe("loadHarnessConfig — adversary", () => {
  beforeEach(() => mkdir(join(TMP, ".adp"), { recursive: true }));
  afterEach(() => rm(TMP, { recursive: true, force: true }));

  it("defaults adversary to disabled with property-test strategy when section is absent (REQ-01.2)", async () => {
    await writeHarness(`mode: sprint\nmin_score: 85\n`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.adversary.enabled).toBe(false);
    expect(cfg.adversary.strategies).toEqual(["property-test"]);
    expect(cfg.adversary.fail_on_severity).toBe("high");
    expect(cfg.adversary.parallel).toBe(true);
    expect(cfg.adversary.timeout_ms).toBe(180_000);
  });

  it("parses explicit adversary block (REQ-01.1)", async () => {
    await writeHarness(`
mode: sprint
min_score: 85
adversary:
  enabled: true
  strategies: [property-test]
  timeout_ms: 60000
  fail_on_severity: medium
  parallel: false
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.adversary.enabled).toBe(true);
    expect(cfg.adversary.timeout_ms).toBe(60_000);
    expect(cfg.adversary.fail_on_severity).toBe("medium");
    expect(cfg.adversary.parallel).toBe(false);
  });

  it("filters unknown strategies (REQ-01.3)", async () => {
    await writeHarness(`
mode: sprint
adversary:
  enabled: true
  strategies: [property-test, sql-injection, mutation, made-up]
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.adversary.strategies).toEqual(["property-test", "mutation"]);
  });

  it("falls back to default strategies when all listed strategies are invalid", async () => {
    await writeHarness(`
mode: sprint
adversary:
  enabled: true
  strategies: [made-up, also-fake]
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.adversary.strategies).toEqual(["property-test"]);
  });

  it("falls back fail_on_severity to 'high' when invalid (REQ-01.4)", async () => {
    await writeHarness(`
mode: sprint
adversary:
  enabled: true
  fail_on_severity: catastrophic
`);
    const cfg = await loadHarnessConfig(TMP);
    expect(cfg.adversary.fail_on_severity).toBe("high");
  });

  it("returns default adversary block when harness.yaml does not exist", async () => {
    const cfg = await loadHarnessConfig(join(TMP, "nonexistent"));
    expect(cfg.adversary.enabled).toBe(false);
    expect(cfg.adversary.strategies).toEqual(["property-test"]);
  });
});
