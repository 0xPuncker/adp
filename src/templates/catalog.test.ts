import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { TemplateCatalog } from "./catalog.js";

let tmpDir: string;
let templatesDir: string;

beforeEach(async () => {
  tmpDir = resolve(tmpdir(), `adp-catalog-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  templatesDir = resolve(tmpDir, "templates");
  await mkdir(templatesDir, { recursive: true });

  await writeFile(
    resolve(templatesDir, "fix-bug.md"),
    `---
name: fix-bug
description: Fix a reported bug
complexity: small
---

# Fix: {Bug summary}

Body content here.
`,
    "utf-8",
  );

  await writeFile(
    resolve(templatesDir, "add-feature.md"),
    `---
name: add-feature
description: Add a new feature
complexity: medium
---

# Feature
`,
    "utf-8",
  );

  // Should be ignored — no frontmatter
  await writeFile(resolve(templatesDir, "stray.md"), "no frontmatter", "utf-8");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("TemplateCatalog.list", () => {
  it("returns templates sorted by name", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const templates = await catalog.list();
    expect(templates).toHaveLength(2);
    expect(templates[0].name).toBe("add-feature");
    expect(templates[1].name).toBe("fix-bug");
  });

  it("parses complexity correctly", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const templates = await catalog.list();
    expect(templates.find((t) => t.name === "fix-bug")?.complexity).toBe("small");
    expect(templates.find((t) => t.name === "add-feature")?.complexity).toBe("medium");
  });

  it("ignores files without valid frontmatter", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const templates = await catalog.list();
    expect(templates.find((t) => t.name === "stray")).toBeUndefined();
  });
});

describe("TemplateCatalog.show", () => {
  it("returns full content of named template", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const content = await catalog.show("fix-bug");
    expect(content).toContain("# Fix: {Bug summary}");
    expect(content).toContain("name: fix-bug");
  });

  it("throws with available list when template not found", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    await expect(catalog.show("nonexistent")).rejects.toThrow(/Available:.*fix-bug/);
  });
});

describe("TemplateCatalog.use", () => {
  it("writes spec.md into .specs/features/<feature>/", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const cwd = resolve(tmpDir, "project");
    await mkdir(cwd, { recursive: true });

    const result = await catalog.use("fix-bug", "auth-fix", cwd);
    expect(result.written).toContain("auth-fix");
    expect(result.written).toMatch(/spec\.md$/);

    const written = await readFile(result.written, "utf-8");
    expect(written).toContain("# Fix: {Bug summary}");
    expect(written).not.toContain("---\nname:"); // frontmatter stripped
  });

  it("creates parent directories if missing", async () => {
    const catalog = new TemplateCatalog(templatesDir);
    const cwd = resolve(tmpDir, "fresh-project");

    const result = await catalog.use("add-feature", "deeply/nested/feature", cwd);
    expect(result.written).toContain("deeply");
  });
});
