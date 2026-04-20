import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Phase } from "../types.js";

/**
 * Loads feedforward guides from .adp/guides/ into context.
 * Guides are markdown files injected before each phase.
 */
export class ContextLoader {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  /**
   * Load all guides from .adp/guides/
   */
  async loadGuides(): Promise<Map<string, string>> {
    const guidesDir = resolve(this.cwd, ".adp", "guides");
    const guides = new Map<string, string>();

    try {
      const files = await readdir(guidesDir);
      for (const file of files.filter((f) => f.endsWith(".md"))) {
        const content = await readFile(resolve(guidesDir, file), "utf-8");
        guides.set(file.replace(".md", ""), content);
      }
    } catch {
      // No guides yet
    }

    return guides;
  }

  /**
   * Load guides relevant to a specific phase.
   */
  async loadForPhase(phase: Phase): Promise<string[]> {
    const guides = await this.loadGuides();
    const relevant: string[] = [];

    switch (phase) {
      case "specify":
        if (guides.has("conventions")) relevant.push(guides.get("conventions")!);
        if (guides.has("architecture")) relevant.push(guides.get("architecture")!);
        break;
      case "design":
        if (guides.has("architecture")) relevant.push(guides.get("architecture")!);
        break;
      case "tasks":
        if (guides.has("testing")) relevant.push(guides.get("testing")!);
        break;
      case "execute":
        // Load all guides during execute
        for (const content of guides.values()) {
          relevant.push(content);
        }
        break;
    }

    return relevant;
  }

  /**
   * Load a spec file from .specs/
   */
  async loadSpec(featureSlug: string): Promise<string | null> {
    try {
      return await readFile(
        resolve(this.cwd, ".specs", "features", featureSlug, "spec.md"),
        "utf-8",
      );
    } catch {
      return null;
    }
  }

  /**
   * Load tasks file from .specs/
   */
  async loadTasks(featureSlug: string): Promise<string | null> {
    try {
      return await readFile(
        resolve(this.cwd, ".specs", "features", featureSlug, "tasks.md"),
        "utf-8",
      );
    } catch {
      return null;
    }
  }

  /**
   * Estimate token count for loaded context.
   */
  estimateTokens(texts: string[]): number {
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    return Math.ceil(totalChars / 4);
  }
}
