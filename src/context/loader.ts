import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Phase } from "../types.js";
import { DesignLoader } from "../design/loader.js";

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
   * Load a spec file from .specs/features/{feature}/spec.md
   */
  async loadSpec(featureSlug: string): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "spec.md"),
    );
  }

  /**
   * Load tasks file from .specs/features/{feature}/tasks.md
   */
  async loadTasks(featureSlug: string): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "tasks.md"),
    );
  }

  /**
   * Load a sprint contract from .specs/features/{feature}/contracts/sprint-N.md
   */
  async loadContract(featureSlug: string, sprintNumber: number): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "contracts", `sprint-${sprintNumber}.md`),
    );
  }

  /**
   * Load design doc from .specs/features/{feature}/design.md
   */
  async loadDesign(featureSlug: string): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "design.md"),
    );
  }

  /**
   * Load context doc from .specs/features/{feature}/context.md
   */
  async loadContext(featureSlug: string): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "context.md"),
    );
  }

  /**
   * Load HANDOFF.md for resume.
   */
  async loadHandoff(): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "HANDOFF.md"),
    );
  }

  /**
   * Load project state doc from .specs/project/STATE.md
   */
  async loadProjectState(): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "project", "STATE.md"),
    );
  }

  /**
   * Load project doc from .specs/project/PROJECT.md
   */
  async loadProject(): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "project", "PROJECT.md"),
    );
  }

  /**
   * Load validation doc from .specs/features/{feature}/validation.md
   */
  async loadValidation(featureSlug: string): Promise<string | null> {
    return this.readOptional(
      resolve(this.cwd, ".specs", "features", featureSlug, "validation.md"),
    );
  }

  /**
   * Load design bundle context for a feature, if available.
   * Returns a formatted string ready for LLM context injection.
   */
  async loadDesignBundle(featureSlug: string): Promise<string | null> {
    const designLoader = new DesignLoader(this.cwd);
    const bundle = await designLoader.loadBundle(featureSlug);
    if (!bundle) return null;
    return designLoader.buildContext(bundle);
  }

  /**
   * Load all context for a phase, including design bundle if available.
   */
  async loadFullContext(phase: Phase, featureSlug: string): Promise<string[]> {
    const context: string[] = [];

    // Phase-specific guides
    const guides = await this.loadForPhase(phase);
    context.push(...guides);

    // Design bundle — inject during design, tasks, and execute phases
    if (phase === "design" || phase === "tasks" || phase === "execute") {
      const designCtx = await this.loadDesignBundle(featureSlug);
      if (designCtx) context.push(designCtx);
    }

    return context;
  }

  /**
   * Estimate token count for loaded context.
   */
  estimateTokens(texts: string[]): number {
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    return Math.ceil(totalChars / 4);
  }

  private async readOptional(path: string): Promise<string | null> {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return null;
    }
  }
}
