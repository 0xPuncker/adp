import { mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Client = "cursor" | "copilot" | "windsurf" | "gemini" | "all";

export interface ExportResult {
  client: string;
  filesCreated: string[];
}

function defaultTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates");
}

interface ClientFile {
  src: string;
  dest: string;
}

interface ClientConfig {
  dir: string;
  files: ClientFile[];
}

const CLIENT_CONFIGS: Record<string, ClientConfig> = {
  cursor: {
    dir: ".cursor",
    files: [
      { src: "cursor-rules.mdc", dest: "rules/sdd.mdc" },
      { src: "cursor-discovery.md", dest: "commands/discovery.md" },
      { src: "cursor-ddd.md", dest: "commands/ddd.md" },
      { src: "cursor-feature.md", dest: "commands/feature.md" },
    ],
  },
  copilot: {
    dir: ".github",
    files: [
      { src: "copilot-instructions.md", dest: "copilot-instructions.md" },
      { src: "copilot-prompt.prompt.md", dest: "prompts/sdd-methodology.prompt.md" },
    ],
  },
  windsurf: {
    dir: ".windsurf",
    files: [
      { src: "windsurf-rules.md", dest: "rules/sdd.md" },
      { src: "windsurf-workflow.md", dest: "workflows/discovery.md" },
    ],
  },
  gemini: {
    dir: ".gemini",
    files: [
      { src: "gemini-instructions.md", dest: "instructions.md" },
      { src: "gemini-discovery.toml", dest: "commands/discovery.toml" },
      { src: "gemini-ddd.toml", dest: "commands/ddd.toml" },
      { src: "gemini-feature.toml", dest: "commands/feature.toml" },
    ],
  },
};

/**
 * Generate instruction files for other AI coding tools.
 * Supports Cursor, GitHub Copilot, Windsurf, and Gemini CLI.
 */
export async function runExport(
  cwd: string,
  clients: Client[] = ["all"],
  templatesDir?: string,
): Promise<ExportResult[]> {
  const tplDir = templatesDir ?? defaultTemplatesDir();
  const srcClients = join(tplDir, "clients");

  const clientsToExport = clients.includes("all")
    ? (["cursor", "copilot", "windsurf", "gemini"] as const)
    : (clients as Client[]).filter((c): c is Exclude<Client, "all"> => c !== "all");

  const results: ExportResult[] = [];

  for (const client of clientsToExport) {
    const config = CLIENT_CONFIGS[client];
    if (!config) continue;

    const clientDir = resolve(cwd, config.dir);
    const filesCreated: string[] = [];

    for (const file of config.files) {
      const src = join(srcClients, file.src);
      const dest = join(clientDir, file.dest);
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
      filesCreated.push(dest);
    }

    results.push({ client, filesCreated });
  }

  return results;
}
