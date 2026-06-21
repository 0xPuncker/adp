import { mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface DiscoveryResult {
  filesCreated: string[];
  discoveryDir: string;
}

function defaultTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates");
}

/**
 * Run Lean Inception-style product discovery.
 * Creates .specs/discovery/ with vision, stakeholders, journeys, canvas, roadmap.
 */
export async function runDiscovery(cwd: string, templatesDir?: string): Promise<DiscoveryResult> {
  const tplDir = templatesDir ?? defaultTemplatesDir();
  const srcDiscovery = join(tplDir, "discovery");
  const specsDir = resolve(cwd, ".specs");
  const discoveryDir = join(specsDir, "discovery");

  await mkdir(discoveryDir, { recursive: true });

  const filesCreated: string[] = [];
  const templates = ["VISION.md", "STAKEHOLDERS.md", "JOURNEYS.md", "CANVAS.md", "ROADMAP.md"];

  for (const template of templates) {
    const src = join(srcDiscovery, template);
    const dest = join(discoveryDir, template);
    await copyFile(src, dest);
    filesCreated.push(dest);
  }

  return { filesCreated, discoveryDir };
}
