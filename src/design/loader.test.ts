import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { DesignLoader } from "./loader.js";
import type { DesignBundle } from "../types.js";

const TEST_DIR = resolve(tmpdir(), "adp-design-test-" + Date.now());

beforeEach(async () => {
  await mkdir(resolve(TEST_DIR, ".specs", "features", "auth", "design-bundle"), { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("DesignLoader", () => {
  it("returns null when no bundle exists", async () => {
    const loader = new DesignLoader(TEST_DIR);
    const bundle = await loader.loadBundle("nonexistent");
    expect(bundle).toBeNull();
  });

  it("saves and loads a bundle", async () => {
    const loader = new DesignLoader(TEST_DIR);
    const bundle: DesignBundle = {
      source: "extracted",
      timestamp: "2026-04-21T00:00:00Z",
      tokens: {
        colors: { primary: "#2563eb", destructive: "#dc2626" },
        spacing: { unit: "4px" },
        typography: { fontFamily: "Inter" },
      },
      components: [
        { name: "Button", description: "Primary button component", props: ["variant", "size"] },
      ],
    };

    const path = await loader.saveBundle("auth", bundle);
    expect(path).toContain("design-bundle");

    const loaded = await loader.loadBundle("auth");
    expect(loaded).not.toBeNull();
    expect(loaded!.source).toBe("extracted");
    expect(loaded!.tokens.colors.primary).toBe("#2563eb");
    expect(loaded!.components).toHaveLength(1);
    expect(loaded!.components[0].name).toBe("Button");
  });

  it("loads prototype files", async () => {
    const loader = new DesignLoader(TEST_DIR);
    const protoPath = resolve(TEST_DIR, ".specs", "features", "auth", "design-bundle", "prototype.html");
    await writeFile(protoPath, "<div>Mock prototype</div>", "utf-8");

    const proto = await loader.loadPrototype("auth");
    expect(proto).toBe("<div>Mock prototype</div>");
  });

  it("hasBundle returns correct status", async () => {
    const loader = new DesignLoader(TEST_DIR);
    expect(await loader.hasBundle("auth")).toBe(false);

    await loader.saveBundle("auth", {
      source: "manual",
      timestamp: "2026-04-21T00:00:00Z",
      tokens: { colors: {}, spacing: {}, typography: {} },
      components: [],
    });

    expect(await loader.hasBundle("auth")).toBe(true);
  });

  it("parses a Claude Design handoff payload", () => {
    const loader = new DesignLoader(TEST_DIR);

    const handoff = `# Design Handoff — Auth Feature

## Tokens
\`\`\`json
{
  "tokens": {
    "colors": { "primary": "#2563eb", "accent": "#f59e0b" },
    "spacing": { "unit": "4px", "page": "24px" },
    "typography": { "fontFamily": "Inter, system-ui" }
  }
}
\`\`\`

## Components
\`\`\`json
{
  "components": [
    { "name": "LoginForm", "description": "Email + password login", "props": ["onSubmit", "error"] },
    { "name": "AuthGuard", "description": "Route protection wrapper", "props": ["role"] }
  ]
}
\`\`\`

### Component: NavBar
A top navigation bar with auth state.
Props: logo, user, onLogout
`;

    const bundle = loader.parseHandoff(handoff);
    expect(bundle.source).toBe("claude-design");
    expect(bundle.tokens.colors.primary).toBe("#2563eb");
    expect(bundle.tokens.spacing.unit).toBe("4px");
    expect(bundle.tokens.typography.fontFamily).toBe("Inter, system-ui");
    // JSON components + markdown-parsed components (may include extra header matches)
    expect(bundle.components.find((c) => c.name === "LoginForm")).toBeDefined();
    expect(bundle.components.find((c) => c.name === "AuthGuard")).toBeDefined();
    expect(bundle.components.find((c) => c.name === "NavBar")).toBeDefined();
    expect(bundle.prototype).toContain("Design Handoff");
  });

  it("builds context string from bundle", () => {
    const loader = new DesignLoader(TEST_DIR);
    const bundle: DesignBundle = {
      source: "claude-design",
      timestamp: "2026-04-21T00:00:00Z",
      tokens: {
        colors: { primary: "#2563eb" },
        spacing: { unit: "4px" },
        typography: { fontFamily: "Inter" },
      },
      components: [
        { name: "Button", description: "Primary button", props: ["variant"], file: "components/ui/button.tsx" },
      ],
      notes: "Use shadcn patterns",
    };

    const ctx = loader.buildContext(bundle);
    expect(ctx).toContain("# Design Bundle");
    expect(ctx).toContain("primary: #2563eb");
    expect(ctx).toContain("Font: Inter");
    expect(ctx).toContain("**Button**");
    expect(ctx).toContain("shadcn patterns");
  });
});
