import { describe, it, expect, beforeEach, vi } from "vitest";
import { DesignCatalog, parseDesignMd, getRecommendations } from "./catalog.js";
import type { DesignEntry } from "./catalog.js";

describe("DesignCatalog", () => {
  let catalog: DesignCatalog;
  const mockCwd = "/tmp/test-project";

  beforeEach(() => {
    catalog = new DesignCatalog(mockCwd);
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all known designs", async () => {
      const designs = await catalog.list();
      expect(designs.length).toBeGreaterThan(50);
      expect(designs[0]).toHaveProperty("slug");
      expect(designs[0]).toHaveProperty("name");
      expect(designs[0]).toHaveProperty("category");
      expect(designs[0]).toHaveProperty("url");
    });

    it("should include Claude design", async () => {
      const designs = await catalog.list();
      const claude = designs.find((d: DesignEntry) => d.slug === "claude");
      expect(claude).toBeDefined();
      expect(claude?.name).toBe("Claude");
      expect(claude?.category).toBe("ai-llm");
    });

    it("should include Stripe design", async () => {
      const designs = await catalog.list();
      const stripe = designs.find((d: DesignEntry) => d.slug === "stripe");
      expect(stripe).toBeDefined();
      expect(stripe?.name).toBe("Stripe");
      expect(stripe?.category).toBe("fintech-crypto");
    });
  });

  describe("search", () => {
    it("should find designs by name", async () => {
      const results = await catalog.search("stripe");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].slug).toBe("stripe");
    });

    it("should find designs by category", async () => {
      const results = await catalog.search("ai-llm");
      expect(results.length).toBeGreaterThan(5);
      expect(results.every((r: DesignEntry) => r.category === "ai-llm")).toBe(true);
    });

    it("should be case-insensitive", async () => {
      const lower = await catalog.search("claude");
      const upper = await catalog.search("CLAUDE");
      expect(lower.length).toBe(upper.length);
    });

    it("should return empty for no matches", async () => {
      const results = await catalog.search("nonexistent-design-xyz");
      expect(results).toEqual([]);
    });
  });

  describe("getByCategory", () => {
    it("should return all AI/LLM designs", async () => {
      const designs = await catalog.getByCategory("ai-llm");
      expect(designs.length).toBeGreaterThan(8);
      expect(designs.every((d: DesignEntry) => d.category === "ai-llm")).toBe(true);
    });

    it("should return fintech designs", async () => {
      const designs = await catalog.getByCategory("fintech-crypto");
      expect(designs.length).toBeGreaterThan(5);
      expect(designs.some((d: DesignEntry) => d.slug === "stripe")).toBe(true);
      expect(designs.some((d: DesignEntry) => d.slug === "coinbase")).toBe(true);
    });
  });

  describe("get", () => {
    it("should return a design by slug", async () => {
      const design = await catalog.get("vercel");
      expect(design).toBeDefined();
      expect(design?.slug).toBe("vercel");
      expect(design?.name).toBe("Vercel");
    });

    it("should return null for unknown slug", async () => {
      const design = await catalog.get("nonexistent");
      expect(design).toBeNull();
    });
  });
});

describe("parseDesignMd", () => {
  it("should parse a basic DESIGN.md", () => {
    const content = `# Stripe

## Colors
\`--color-primary\`: #635bff
\`--color-secondary\`: #8a4fff

## Typography
**Sans:** \`SF Pro Text\`

## Components
### Component: Button
Primary button with gradient background.`;

    const result = parseDesignMd(content);
    expect(result.theme).toBe("Stripe");
    expect(result.colors).toBeGreaterThan(0);
    expect(result.typography).toBe("SF Pro Text");
    expect(result.components).toContain("Button");
  });

  it("should handle missing sections", () => {
    const content = "# Minimal Design\n\nNo colors here.";
    const result = parseDesignMd(content);
    expect(result.theme).toBe("Minimal Design");
    expect(result.colors).toBe(0);
    expect(result.typography).toBeNull();
    expect(result.components).toEqual([]);
  });
});

describe("getRecommendations", () => {
  it("should recommend AI designs for AI keywords", () => {
    const recs = getRecommendations(["ai", "agent"]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.slug === "claude" || r.slug === "voltagent")).toBe(true);
  });

  it("should recommend fintech designs for finance keywords", () => {
    const recs = getRecommendations(["fintech", "payment"]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.slug === "stripe")).toBe(true);
  });

  it("should recommend SaaS designs for productivity keywords", () => {
    const recs = getRecommendations(["saas", "workflow"]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.slug === "linear" || r.slug === "notion")).toBe(true);
  });

  it("should return empty for no matching keywords", () => {
    const recs = getRecommendations(["random", "words", "xyz"]);
    expect(recs).toEqual([]);
  });
});
