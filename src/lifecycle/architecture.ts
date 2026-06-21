import { mkdir, copyFile, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ArchitectureResult {
  filesCreated: string[];
  architectureDir: string;
}

function defaultTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates");
}

/**
 * Generate architecture documentation.
 * Creates .specs/architecture/ with overview, context map, diagrams, assessment, ADR.
 */
export async function runArchitecture(
  cwd: string,
  templatesDir?: string,
): Promise<ArchitectureResult> {
  const tplDir = templatesDir ?? defaultTemplatesDir();
  const srcArch = join(tplDir, "architecture");
  const specsDir = resolve(cwd, ".specs");
  const archDir = join(specsDir, "architecture");

  await mkdir(archDir, { recursive: true });

  const filesCreated: string[] = [];

  // Main architecture files
  const mainFiles = ["OVERVIEW.md", "CONTEXT_MAP.md", "DIAGRAMS.md", "ASSESSMENT.md"];
  for (const file of mainFiles) {
    const src = join(srcArch, file);
    const dest = join(archDir, file);
    await copyFile(src, dest);
    filesCreated.push(dest);
  }

  // ADR directory with template
  const adrDir = join(archDir, "adr");
  await mkdir(adrDir, { recursive: true });

  const adrFiles = await readdir(join(srcArch, "adr"));
  for (const file of adrFiles) {
    const src = join(srcArch, "adr", file);
    const dest = join(adrDir, file);
    await copyFile(src, dest);
    filesCreated.push(dest);
  }

  return { filesCreated, architectureDir: archDir };
}
