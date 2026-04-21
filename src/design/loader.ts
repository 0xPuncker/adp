import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { DesignBundle, DesignToken, DesignComponent, DesignScreen, DesignDataShape } from "../types.js";

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
   * Handles both JSON-based and markdown-based handoff formats.
   */
  parseHandoff(content: string): DesignBundle {
    const bundle: DesignBundle = {
      source: "claude-design",
      timestamp: new Date().toISOString(),
      tokens: { colors: {}, spacing: {}, typography: {} },
      components: [],
      screens: [],
      apiEndpoints: [],
      dataShapes: [],
      businessRules: [],
    };

    // 1. Extract JSON blocks (structured handoffs)
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
        // Not JSON, skip
      }
    }

    // 2. Extract color tokens from markdown tables: | `--token` | value | use |
    // Parse section-aware: detect "Dark" vs "Light" theme sections
    const sections = content.split(/\n(?=###?\s)/);
    for (const section of sections) {
      const isLight = /light/i.test(section.split("\n")[0]);
      const prefix = isLight ? "light:" : "";
      const tableRows = section.matchAll(
        /\|\s*`?(--[\w-]+)`?\s*\|\s*`?([^|`\n]+)`?\s*\|(?:\s*([^|\n]*)\|)?/g
      );
      for (const m of tableRows) {
        const token = m[1].trim();
        const value = m[2].trim();
        if (value && !value.startsWith("---") && !value.toLowerCase().startsWith("value")) {
          bundle.tokens.colors[`${prefix}${token}`] = value;
        }
      }
    }

    // 3. Extract typography
    const sansMatch = content.match(/\*\*Sans:\*\*\s*`([^`]+)`/);
    if (sansMatch) bundle.tokens.typography.fontFamily = sansMatch[1];
    const monoMatch = content.match(/\*\*Mono:\*\*\s*`([^`]+)`/);
    if (monoMatch) {
      bundle.tokens.typography.fontSize = bundle.tokens.typography.fontSize ?? {};
      bundle.tokens.typography.fontSize["mono"] = monoMatch[1];
    }
    const baseSizeMatch = content.match(/Base size:\s*(\d+px[^*\n]*)/);
    if (baseSizeMatch) {
      bundle.tokens.typography.fontSize = bundle.tokens.typography.fontSize ?? {};
      bundle.tokens.typography.fontSize["base"] = baseSizeMatch[1].trim();
    }
    const displayMatch = content.match(/Display title:\s*([^\n]+)/);
    if (displayMatch) {
      bundle.tokens.typography.fontSize = bundle.tokens.typography.fontSize ?? {};
      bundle.tokens.typography.fontSize["display"] = displayMatch[1].trim();
    }

    // 4. Extract spacing ("4, 8, 12, ... → --s-1...--s-10" or "4px grid" patterns)
    const spacingLine = content.match(/(?:Spacing\s*\((\d+)px grid\)\s*\n|Spacing[^:]*:\s*\n?)([^\n]*\d+\s*,\s*\d+[^\n]*)/i);
    if (spacingLine) {
      const numsStr = spacingLine[2] ?? spacingLine[0];
      // Only match comma-separated number lists (not random dimensions)
      const commaSep = numsStr.match(/(\d+(?:\s*,\s*\d+){2,})/);
      if (commaSep) {
        const nums = commaSep[1].split(",").map((n) => n.trim());
        for (let i = 0; i < nums.length; i++) {
          bundle.tokens.spacing[`--s-${i + 1}`] = `${nums[i]}px`;
        }
      }
    }

    // 5. Extract radii ("4 / 6 / 10 / 14 / 20 / 999 → --r-xs / --r-sm / ...")
    const radiiLine = content.match(/(\d+\s*\/\s*\d+[^→\n]*→\s*`?--r-[^\n]+)/);
    if (radiiLine) {
      const line = radiiLine[1];
      const [valuesPart, namesPart] = line.split("→").map((s) => s.trim());
      if (valuesPart && namesPart) {
        const values = valuesPart.split("/").map((v) => v.trim());
        const names = namesPart.split("/").map((n) => n.trim().replace(/`/g, ""));
        bundle.tokens.radii = bundle.tokens.radii ?? {};
        for (let i = 0; i < Math.min(values.length, names.length); i++) {
          if (names[i].startsWith("--r-")) {
            bundle.tokens.radii[names[i]] = `${values[i]}px`;
          }
        }
      }
    }

    // 6. Extract shadows
    const shadowMatches = content.matchAll(/`(--shadow-[\w-]+)`\s+([^\n]+)/g);
    bundle.tokens.shadows = bundle.tokens.shadows ?? {};
    for (const s of shadowMatches) {
      bundle.tokens.shadows[s[1]] = s[2].trim();
    }

    // 7. Extract screens (### N. ScreenName — nav_id OR ### N. ScreenName — description)
    const screenMatches = content.matchAll(
      /###\s+(\d+)\.\s+([^—\n]+?)(?:\s*—\s*([^\n]*)?)?\s*\n([\s\S]*?)(?=\n###\s+\d+\.|\n---|\n##\s|$)/g
    );
    for (const m of screenMatches) {
      const name = m[2].trim();
      const afterDash = m[3]?.trim() ?? "";
      // If after the dash is a nav_id (backtick-wrapped word), use it; otherwise it's a description
      const navIdMatch = afterDash.match(/^`?(\w+)`?$/);
      const navId = navIdMatch ? navIdMatch[1] : undefined;
      const extraDesc = navIdMatch ? "" : afterDash;
      const body = m[4].trim();
      const bodyDesc = body.split("\n").slice(0, 3).join(" ").replace(/^-\s*/, "").trim();
      const screen: DesignScreen = {
        name,
        navId,
        description: extraDesc ? `${extraDesc}. ${bodyDesc}` : bodyDesc,
      };
      // Extract layout info
      const layoutMatch = body.match(/grid[^:]*:\s*`([^`]+)`/i) ??
        body.match(/columns?:\s*`([^`]+)`/i);
      if (layoutMatch) screen.layout = layoutMatch[1];
      // Extract interactions
      const interactions = body.match(/(?:click|hover|submit|navigate|trigger|show)[^\n]*/gi);
      if (interactions) screen.interactions = interactions.map((i) => i.trim());

      bundle.screens!.push(screen);
    }

    // 8. Extract API endpoints
    const apiMatches = content.matchAll(/`((?:GET|POST|PUT|PATCH|DELETE)\s+\/[^\s`]+)`/g);
    for (const m of apiMatches) {
      bundle.apiEndpoints!.push(m[1]);
    }

    // 9. Extract data shapes
    const dataMatches = content.matchAll(
      /`(\w+)\s*\{([^}]+)\}`/g
    );
    for (const m of dataMatches) {
      bundle.dataShapes!.push({ name: m[1], fields: m[2].trim() });
    }

    // 10. Extract business rules (lines starting with "**" inside "Important" sections)
    const rulesSection = content.match(/(?:Important|Rules)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
    if (rulesSection) {
      const rules = rulesSection[1].matchAll(/^-\s*\*\*([^*]+)\*\*([^\n]*)/gm);
      for (const r of rules) {
        bundle.businessRules!.push(`${r[1].trim()}${r[2].trim()}`);
      }
    }

    // 11. Extract i18n info
    const langMatch = content.match(/Languages?:\s*([^\n]+)/i) ??
      content.match(/\(primary\)\s+and\s+(\w+)/i);
    if (langMatch) {
      const langs = langMatch[1].match(/\b(PT|EN|ES|FR|DE|IT|NL|JA|ZH|KO)\b/gi) ?? [];
      // Deduplicate
      const uniqueLangs = [...new Set(langs.map((l) => l.toUpperCase()))];
      if (uniqueLangs.length > 0) {
        bundle.i18n = { languages: uniqueLangs };
      }
      const i18nNote = content.match(/do not ship[^.\n]*\.?/i);
      if (i18nNote && bundle.i18n) {
        bundle.i18n.note = i18nNote[0].replace(/\*+/g, "").trim();
      }
    }

    // 12. Extract explicit component definitions from JSON or markdown
    // (Only add markdown-header components that look like actual UI components,
    //  not section headers like "Overview", "Fidelity", "Layout")
    const sectionHeaders = new Set([
      "overview", "fidelity", "surface", "type", "color", "layout", "radii",
      "shadows", "motion", "screens", "interactions", "icons", "files",
    ]);
    const componentMatches = content.matchAll(
      /###?\s+(?:Component:\s*)?`?(\w+)`?\s*\n([\s\S]*?)(?=\n###?\s|\n##\s|$)/g
    );
    for (const match of componentMatches) {
      const name = match[1];
      if (sectionHeaders.has(name.toLowerCase())) continue;
      if (bundle.components.find((c) => c.name === name)) continue;
      // Skip numbered screen entries (handled above)
      if (/^\d+$/.test(name)) continue;

      const body = match[2].trim();
      const comp: DesignComponent = {
        name,
        description: body.split("\n")[0].replace(/^-\s*/, "").trim(),
      };
      const propsMatch = body.match(/props?:\s*([^\n]+)/i);
      if (propsMatch) {
        comp.props = propsMatch[1].split(",").map((p) => p.trim());
      }
      bundle.components.push(comp);
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

    // Radii
    if (bundle.tokens.radii && Object.keys(bundle.tokens.radii).length > 0) {
      lines.push("\n## Radii");
      for (const [name, value] of Object.entries(bundle.tokens.radii)) {
        lines.push(`- ${name}: ${value}`);
      }
    }

    // Shadows
    if (bundle.tokens.shadows && Object.keys(bundle.tokens.shadows).length > 0) {
      lines.push("\n## Shadows");
      for (const [name, value] of Object.entries(bundle.tokens.shadows)) {
        lines.push(`- ${name}: ${value}`);
      }
    }

    // Screens
    if (bundle.screens && bundle.screens.length > 0) {
      lines.push(`\n## Screens (${bundle.screens.length})`);
      for (const screen of bundle.screens) {
        const nav = screen.navId ? ` [${screen.navId}]` : "";
        lines.push(`- **${screen.name}**${nav}: ${screen.description}`);
      }
    }

    // API Endpoints
    if (bundle.apiEndpoints && bundle.apiEndpoints.length > 0) {
      lines.push(`\n## API Endpoints (${bundle.apiEndpoints.length})`);
      for (const ep of bundle.apiEndpoints) {
        lines.push(`- \`${ep}\``);
      }
    }

    // Data Shapes
    if (bundle.dataShapes && bundle.dataShapes.length > 0) {
      lines.push("\n## Data Shapes");
      for (const ds of bundle.dataShapes) {
        lines.push(`- **${ds.name}**: ${ds.fields}`);
      }
    }

    // Business Rules
    if (bundle.businessRules && bundle.businessRules.length > 0) {
      lines.push("\n## Business Rules");
      for (const rule of bundle.businessRules) {
        lines.push(`- ${rule}`);
      }
    }

    // i18n
    if (bundle.i18n) {
      lines.push(`\n## i18n: ${bundle.i18n.languages.join(", ")}`);
      if (bundle.i18n.note) lines.push(`- ${bundle.i18n.note}`);
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
