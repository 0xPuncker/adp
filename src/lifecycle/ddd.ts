import { mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface DddResult {
  filesCreated: string[];
  dddDir: string;
}

function defaultTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates");
}

/**
 * Run Domain-Driven Design modeling.
 * Creates .specs/ddd/ with bounded contexts, ubiquitous language, domain models, context map.
 */
export async function runDdd(cwd: string, templatesDir?: string): Promise<DddResult> {
  const tplDir = templatesDir ?? defaultTemplatesDir();
  const srcDdd = join(tplDir, "ddd");
  const specsDir = resolve(cwd, ".specs");
  const dddDir = join(specsDir, "ddd");

  await mkdir(dddDir, { recursive: true });

  const filesCreated: string[] = [];
  const templates = [
    "BOUNDED_CONTEXTS.md",
    "UBIQUITOUS_LANG.md",
    "DOMAIN_MODELS.md",
    "CONTEXT_MAP.md",
  ];

  for (const template of templates) {
    const src = join(srcDdd, template);
    const dest = join(dddDir, template);
    await copyFile(src, dest);
    filesCreated.push(dest);
  }

  return { filesCreated, dddDir };
}
