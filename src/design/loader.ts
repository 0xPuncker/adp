import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { DesignBundle, DesignToken, DesignComponent } from "../types.js";

/**
 * Loads and manages design bundles from .specs/features/{feature}/design-bundle/.
 *
 * Design bundles can come from:
 * 1. Claude Design handoff (pasted/imported)
 * 2. Extracted from project files (Tailwind, shadcn, CSS vars)
 * 3. Manually created
 */
export class DesignLoader {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  /**
   * Load a design bundle for a feature.
   */
  async loadBundle(featureSlug: string): Promise<DesignBundle | null> {
    const bundlePath = this.bundlePath(featureSlug);
    try {
      const raw = await readFile(bundlePath, "utf-8");
      return JSON.parse(raw) as DesignBundle;
    } catch {
      return null;
    }
  }

  /**
   * Save a design bundle for a feature.
   */
  async saveBundle(featureSlug: string, bundle: DesignBundle): Promise<string> {
    const bundlePath = this.bundlePath(featureSlug);
    await mkdir(dirname(bundlePath), { recursive: true });
    await writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf-8");
    return bundlePath;
  }

  /**
   * Load prototype HTML/JSX from the design bundle directory.
   */
  async loadPrototype(featureSlug: string): Promise<string | null> {
    const dir = this.bundleDir(featureSlug);
    try {
      const files = await readdir(dir);
      const proto = files.find((f) =>
        f.endsWith(".html") || f.endsWith(".tsx") || f.endsWith(".jsx")
      );
      if (proto) {
        return await readFile(resolve(dir, proto), "utf-8");
      }
    } catch {
      // No bundle dir
    }
    return null;
  }

  /**
   * Load design tokens from a standalone tokens file.
   */
  async loadTokens(featureSlug: string): Promise<DesignToken | null> {
    const tokensPath = resolve(this.bundleDir(featureSlug), "tokens.json");
    try {
      const raw = await readFile(tokensPath, "utf-8");
      return JSON.parse(raw) as DesignToken;
    } catch {
      // Try loading from the bundle itself
      const bundle = await this.loadBundle(featureSlug);
      return bundle?.tokens ?? null;
    }
  }

  /**
   * Check if a design bundle exists for a feature.
   */
  async hasBundle(featureSlug: string): Promise<boolean> {
    return (await this.loadBundle(featureSlug)) !== null;
  }

  /**
   * Parse a Claude Design handoff payload.
   * Handoff comes as structured markdown/JSON with component specs and tokens.
   */
  parseHandoff(content: string): DesignBundle {
    const bundle: DesignBundle = {
      source: "claude-design",
      timestamp: new Date().toISOString(),
      tokens: { colors: {}, spacing: {}, typography: {} },
      components: [],
    };

    // Extract JSON blocks from handoff content
    const jsonBlocks = content.match(/```(?:json)?\s*([\s\S]*?)```/g) ?? [];
    for (const block of jsonBlocks) {
      const json = block.replace(/```(?:json)?\s*/, "").replace(/```$/, "").trim();
      try {
        const parsed = JSON.parse(json);
        if (parsed.tokens || parsed.colors) {
          bundle.tokens = this.normalizeTokens(parsed.tokens ?? parsed);
        }
        if (parsed.components) {
          bundle.components = this.normalizeComponents(parsed.components);
        }
      } catch {
        // Not a valid JSON block, skip
      }
    }

    // Extract component definitions from markdown headers
    const componentMatches = content.matchAll(
      /###?\s+(?:Component:\s*)?`?(\w+)`?\s*\n([\s\S]*?)(?=\n###?\s|\n##\s|$)/g
    );
    for (const match of componentMatches) {
      const name = match[1];
      const body = match[2].trim();
      if (!bundle.components.find((c) => c.name === name)) {
        const comp: DesignComponent = {
          name,
          description: body.split("\n")[0],
        };
        // Extract props from body
        const propsMatch = body.match(/props?:\s*([^\n]+)/i);
        if (propsMatch) {
          comp.props = propsMatch[1].split(",").map((p) => p.trim());
        }
        bundle.components.push(comp);
      }
    }

    // Store the raw content as prototype
    bundle.prototype = content;

    return bundle;
  }

  /**
   * Build a design context string for injection into phases.
   * Summarizes the bundle for the LLM context window.
   */
  buildContext(bundle: DesignBundle): string {
    const lines: string[] = ["# Design Bundle"];
    lines.push(`Source: ${bundle.source} (${bundle.timestamp})`);

    // Tokens
    const { tokens } = bundle;
    if (Object.keys(tokens.colors).length > 0) {
      lines.push("\n## Colors");
      for (const [name, value] of Object.entries(tokens.colors)) {
        lines.push(`- ${name}: ${value}`);
      }
    }

    if (Object.keys(tokens.spacing).length > 0) {
      lines.push("\n## Spacing");
      for (const [name, value] of Object.entries(tokens.spacing)) {
        lines.push(`- ${name}: ${value}`);
      }
    }

    if (tokens.typography.fontFamily) {
      lines.push(`\n## Typography`);
      lines.push(`- Font: ${tokens.typography.fontFamily}`);
      if (tokens.typography.fontSize) {
        for (const [name, value] of Object.entries(tokens.typography.fontSize)) {
          lines.push(`- ${name}: ${value}`);
        }
      }
    }

    // Components
    if (bundle.components.length > 0) {
      lines.push("\n## Components");
      for (const comp of bundle.components) {
        const props = comp.props?.length ? ` (${comp.props.join(", ")})` : "";
        const file = comp.file ? ` — ${comp.file}` : "";
        lines.push(`- **${comp.name}**${props}: ${comp.description}${file}`);
      }
    }

    if (bundle.notes) {
      lines.push(`\n## Notes\n${bundle.notes}`);
    }

    return lines.join("\n");
  }

  // ─── Private ────────────────────────────────────────────────────

  private bundleDir(featureSlug: string): string {
    return resolve(this.cwd, ".specs", "features", featureSlug, "design-bundle");
  }

  private bundlePath(featureSlug: string): string {
    return resolve(this.bundleDir(featureSlug), "bundle.json");
  }

  private normalizeTokens(raw: Record<string, unknown>): DesignToken {
    return {
      colors: (raw.colors as Record<string, string>) ?? {},
      spacing: (raw.spacing as Record<string, string>) ?? {},
      typography: {
        fontFamily: (raw.typography as Record<string, unknown>)?.fontFamily as string | undefined,
        fontSize: (raw.typography as Record<string, unknown>)?.fontSize as Record<string, string> | undefined,
        fontWeight: (raw.typography as Record<string, unknown>)?.fontWeight as Record<string, string> | undefined,
      },
      radii: (raw.radii as Record<string, string>) ?? undefined,
      shadows: (raw.shadows as Record<string, string>) ?? undefined,
    };
  }

  private normalizeComponents(raw: unknown[]): DesignComponent[] {
    return raw
      .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
      .map((c) => ({
        name: String(c.name ?? "Unknown"),
        description: String(c.description ?? ""),
        props: Array.isArray(c.props) ? c.props.map(String) : undefined,
        file: c.file ? String(c.file) : undefined,
        variants: Array.isArray(c.variants) ? c.variants.map(String) : undefined,
      }));
  }
}
