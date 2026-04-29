import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface WorkflowTemplate {
  name: string;
  description: string;
  complexity: "small" | "medium" | "large" | "complex";
  filePath: string;
}

const VALID_COMPLEXITY = new Set(["small", "medium", "large", "complex"]);

export class TemplateCatalog {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir ?? this.resolveDefaultDir();
  }

  async list(): Promise<WorkflowTemplate[]> {
    const files = await readdir(this.templatesDir);
    const templates: WorkflowTemplate[] = [];

    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const filePath = resolve(this.templatesDir, file);
      const content = await readFile(filePath, "utf-8");
      const meta = parseFrontmatter(content);

      if (meta.name && meta.description && meta.complexity) {
        templates.push({
          name: meta.name,
          description: meta.description,
          complexity: meta.complexity,
          filePath,
        });
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async show(name: string): Promise<string> {
    const templates = await this.list();
    const tpl = templates.find((t) => t.name === name);
    if (!tpl) {
      throw new Error(`Template "${name}" not found. Available: ${templates.map((t) => t.name).join(", ")}`);
    }
    return readFile(tpl.filePath, "utf-8");
  }

  async use(name: string, feature: string, cwd: string): Promise<{ written: string }> {
    const content = await this.show(name);
    const targetDir = resolve(cwd, ".specs", "features", feature);
    const targetPath = resolve(targetDir, "spec.md");

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, stripFrontmatter(content), "utf-8");

    return { written: targetPath };
  }

  /**
   * Resolve the default templates directory by checking, in order:
   * 1. <package-root>/templates/workflows  (when running from dev or installed package)
   * 2. <skill-install>/templates/workflows  (when invoked from a skill install)
   */
  private resolveDefaultDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/templates/catalog.js → ../../templates/workflows
    return join(here, "..", "..", "templates", "workflows");
  }
}

interface Frontmatter {
  name?: string;
  description?: string;
  complexity?: "small" | "medium" | "large" | "complex";
}

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const out: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();
    if (key === "name") out.name = val;
    else if (key === "description") out.description = val;
    else if (key === "complexity" && VALID_COMPLEXITY.has(val)) {
      out.complexity = val as Frontmatter["complexity"];
    }
  }
  return out;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n+/, "");
}
