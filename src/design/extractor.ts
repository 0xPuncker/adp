import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, extname, basename } from "node:path";
import type { DesignBundle, DesignToken, DesignComponent } from "../types.js";

/**
 * Extracts design tokens and component inventory from a project's
 * existing files (Tailwind config, shadcn components, CSS variables, etc.).
 *
 * This gives ADP design context even without a Claude Design handoff.
 */
export class DesignExtractor {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  /**
   * Extract a full design bundle from the project.
   */
  async extract(): Promise<DesignBundle> {
    const [tokens, components] = await Promise.all([
      this.extractTokens(),
      this.extractComponents(),
    ]);

    return {
      source: "extracted",
      timestamp: new Date().toISOString(),
      tokens,
      components,
      notes: `Auto-extracted from ${this.cwd}`,
    };
  }

  /**
   * Extract design tokens from Tailwind config, CSS variables, and shadcn config.
   */
  async extractTokens(): Promise<DesignToken> {
    const tokens: DesignToken = {
      colors: {},
      spacing: {},
      typography: {},
    };

    // Run all extractions in parallel
    const [tailwind, css, shadcn] = await Promise.all([
      this.extractFromTailwind(),
      this.extractFromCSS(),
      this.extractFromShadcn(),
    ]);

    // Merge: CSS vars < Tailwind config < shadcn (priority order)
    Object.assign(tokens.colors, css.colors, tailwind.colors, shadcn.colors);
    Object.assign(tokens.spacing, css.spacing, tailwind.spacing);
    tokens.typography = {
      ...css.typography,
      ...tailwind.typography,
    };
    if (tailwind.radii || css.radii) {
      tokens.radii = { ...css.radii, ...tailwind.radii };
    }

    return tokens;
  }

  /**
   * Extract component inventory from the project.
   */
  async extractComponents(): Promise<DesignComponent[]> {
    const components: DesignComponent[] = [];

    // Look for common component directories
    // Prefer top-level dirs (they recurse into subdirs).
    // Only use specific subdirs if parent doesn't exist.
    const primaryDirs = ["components", "src/components", "app/components"];
    const fallbackDirs = ["components/ui", "src/components/ui", "src/ui"];
    const scannedPaths = new Set<string>();

    for (const dir of [...primaryDirs, ...fallbackDirs]) {
      const fullPath = resolve(this.cwd, dir);
      // Skip if a parent was already scanned (avoids double-scanning subdirs)
      const isSubdir = [...scannedPaths].some((p) => fullPath.startsWith(p + "/") || fullPath.startsWith(p + "\\"));
      if (isSubdir) continue;

      try {
        const dirStat = await stat(fullPath);
        if (!dirStat.isDirectory()) continue;
        scannedPaths.add(fullPath);
        const found = await this.scanComponentDir(fullPath, dir);
        components.push(...found);
      } catch {
        // Dir doesn't exist
      }
    }

    // Deduplicate by name+file
    const seen = new Set<string>();
    return components.filter((c) => {
      const key = `${c.name}:${c.file}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Tailwind ─────────────────────────────────────────────────

  private async extractFromTailwind(): Promise<Partial<DesignToken>> {
    const result: Partial<DesignToken> = { colors: {}, spacing: {}, typography: {} };

    // Try both config file names
    for (const name of ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs"]) {
      try {
        const content = await readFile(resolve(this.cwd, name), "utf-8");
        return this.parseTailwindConfig(content);
      } catch {
        // Try next
      }
    }

    return result;
  }

  private parseTailwindConfig(content: string): Partial<DesignToken> {
    const result: Partial<DesignToken> = { colors: {}, spacing: {}, typography: {}, radii: {} };

    // Extract colors from extend.colors
    const colorsMatch = content.match(/colors\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
    if (colorsMatch) {
      const colorEntries = colorsMatch[1].matchAll(
        /['"]?(\w[\w-]*)['"]?\s*:\s*['"]([^'"]+)['"]/g
      );
      for (const m of colorEntries) {
        result.colors![m[1]] = m[2];
      }
    }

    // Extract spacing
    const spacingMatch = content.match(/spacing\s*:\s*\{([^}]*)\}/);
    if (spacingMatch) {
      const entries = spacingMatch[1].matchAll(
        /['"]?(\w[\w-]*)['"]?\s*:\s*['"]([^'"]+)['"]/g
      );
      for (const m of entries) {
        result.spacing![m[1]] = m[2];
      }
    }

    // Extract fontFamily
    const fontMatch = content.match(/fontFamily\s*:\s*\{([^}]*(?:\[[^\]]*\][^}]*)*)\}/);
    if (fontMatch) {
      const entries = fontMatch[1].matchAll(
        /['"]?(\w+)['"]?\s*:\s*\[['"]([^'"]+)['"]/g
      );
      for (const m of entries) {
        result.typography!.fontFamily = m[2];
        break; // Take the first (usually `sans`)
      }
    }

    // Extract fontSize
    const sizeMatch = content.match(/fontSize\s*:\s*\{([^}]*)\}/);
    if (sizeMatch) {
      const entries = sizeMatch[1].matchAll(
        /['"]?(\w[\w-]*)['"]?\s*:\s*['"]([^'"]+)['"]/g
      );
      const sizes: Record<string, string> = {};
      for (const m of entries) {
        sizes[m[1]] = m[2];
      }
      if (Object.keys(sizes).length > 0) {
        result.typography!.fontSize = sizes;
      }
    }

    // Extract borderRadius
    const radiusMatch = content.match(/borderRadius\s*:\s*\{([^}]*)\}/);
    if (radiusMatch) {
      const entries = radiusMatch[1].matchAll(
        /['"]?(\w[\w-]*)['"]?\s*:\s*['"]([^'"]+)['"]/g
      );
      for (const m of entries) {
        result.radii![m[1]] = m[2];
      }
    }

    return result;
  }

  // ─── CSS Variables ────────────────────────────────────────────

  private async extractFromCSS(): Promise<Partial<DesignToken>> {
    const result: Partial<DesignToken> = { colors: {}, spacing: {}, typography: {}, radii: {} };

    // Common CSS entry points
    const cssFiles = [
      "app/globals.css", "src/globals.css", "styles/globals.css",
      "app/layout.css", "src/index.css",
    ];

    for (const file of cssFiles) {
      try {
        const content = await readFile(resolve(this.cwd, file), "utf-8");
        this.parseCSSVars(content, result);
        break; // Use first found
      } catch {
        // Try next
      }
    }

    return result;
  }

  private parseCSSVars(content: string, result: Partial<DesignToken>): void {
    // Extract CSS custom properties from :root
    const rootMatch = content.match(/:root\s*\{([^}]*)\}/);
    if (!rootMatch) return;

    const vars = rootMatch[1].matchAll(
      /--(\w[\w-]*)\s*:\s*([^;]+)/g
    );

    for (const m of vars) {
      const name = m[1];
      const value = m[2].trim();

      // Categorize by name pattern
      if (name.match(/color|bg|foreground|background|primary|secondary|accent|muted|destructive|border|ring|card|popover/i)) {
        result.colors![name] = value;
      } else if (name.match(/spacing|gap|padding|margin/i)) {
        result.spacing![name] = value;
      } else if (name.match(/radius/i)) {
        result.radii![name] = value;
      } else if (name.match(/font|text|leading|tracking/i)) {
        if (name.includes("family")) {
          result.typography!.fontFamily = value;
        }
      }
    }
  }

  // ─── shadcn/ui ────────────────────────────────────────────────

  private async extractFromShadcn(): Promise<Partial<DesignToken>> {
    const result: Partial<DesignToken> = { colors: {} };

    try {
      const raw = await readFile(resolve(this.cwd, "components.json"), "utf-8");
      const config = JSON.parse(raw);

      // Extract style and base color
      if (config.style) {
        result.colors!["_shadcn_style"] = config.style;
      }
      if (config.tailwind?.baseColor) {
        result.colors!["_shadcn_baseColor"] = config.tailwind.baseColor;
      }
      if (config.tailwind?.cssVariables !== undefined) {
        result.colors!["_shadcn_cssVars"] = String(config.tailwind.cssVariables);
      }
    } catch {
      // No shadcn config
    }

    return result;
  }

  // ─── Component scanning ───────────────────────────────────────

  private async scanComponentDir(dirPath: string, relativeDir: string): Promise<DesignComponent[]> {
    const components: DesignComponent[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          const subComponents = await this.scanComponentDir(
            resolve(dirPath, entry.name),
            `${relativeDir}/${entry.name}`
          );
          components.push(...subComponents);
          continue;
        }

        const ext = extname(entry.name);
        if (![".tsx", ".jsx", ".ts", ".js"].includes(ext)) continue;

        // Skip test/story files
        const base = basename(entry.name, ext);
        if (base.match(/\.(test|spec|stories|story)$/)) continue;

        const filePath = resolve(dirPath, entry.name);
        const comp = await this.parseComponentFile(filePath, `${relativeDir}/${entry.name}`, base);
        if (comp) components.push(comp);
      }
    } catch {
      // Can't read dir
    }

    return components;
  }

  private async parseComponentFile(
    filePath: string,
    relativePath: string,
    name: string,
  ): Promise<DesignComponent | null> {
    try {
      const content = await readFile(filePath, "utf-8");

      // Check if it exports a React component
      const exportMatch = content.match(
        /export\s+(?:default\s+)?(?:function|const)\s+(\w+)/
      );
      if (!exportMatch) return null;

      const componentName = exportMatch[1];

      // Extract props interface/type
      const propsMatch = content.match(
        /interface\s+\w*Props\s*\{([^}]*)\}/
      );
      let props: string[] | undefined;
      if (propsMatch) {
        props = propsMatch[1]
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("//"))
          .map((l) => l.replace(/[;,]$/, "").trim())
          .filter(Boolean);
      }

      // Extract variants (CVA or variant props)
      const variantsMatch = content.match(
        /variants?\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/
      );
      let variants: string[] | undefined;
      if (variantsMatch) {
        const vEntries = variantsMatch[1].matchAll(/(\w+)\s*:/g);
        variants = Array.from(vEntries, (m) => m[1]);
      }

      // First line of JSDoc (multi-line or single-line)
      const docMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/) ??
        content.match(/\/\*\*\s+([^*\n]+)\s*\*\//);
      const description = docMatch?.[1]?.trim() ?? `${componentName} component`;

      return {
        name: componentName,
        description,
        props,
        file: relativePath,
        variants,
      };
    } catch {
      return null;
    }
  }
}
