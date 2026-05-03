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
