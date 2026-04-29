import { rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

export interface UninstallOptions {
  yes?: boolean;
  cwd?: string;
  homeDir?: string;
  /** Override how `npm uninstall -g adp` is executed. For tests. */
  runNpmUninstall?: () => Promise<number>;
}

export interface UninstallReport {
  skillFilesRemoved: boolean;
  npmRemoved: boolean;
  standaloneRemoved: boolean;
  errors: string[];
}

const STANDALONE_BIN_NAMES = ["adp", "adp.exe"];

export async function runUninstall(opts: UninstallOptions = {}): Promise<UninstallReport> {
  const home = opts.homeDir ?? homedir();
  const skillDir = resolve(home, ".claude", "skills", "adp");
  const npmRunner = opts.runNpmUninstall ?? defaultNpmUninstall;
  const report: UninstallReport = {
    skillFilesRemoved: false,
    npmRemoved: false,
    standaloneRemoved: false,
    errors: [],
  };

  // 1. Remove standalone binary BEFORE the skill dir, since it lives inside it
  for (const name of STANDALONE_BIN_NAMES) {
    const binPath = resolve(skillDir, "bin", name);
    if (await pathExists(binPath)) {
      try {
        await rm(binPath, { force: true });
        report.standaloneRemoved = true;
      } catch (err) {
        report.errors.push(`Failed to remove standalone ${binPath}: ${(err as Error).message}`);
      }
    }
  }

  // 2. Remove skill directory
  if (await pathExists(skillDir)) {
    try {
      await rm(skillDir, { recursive: true, force: true });
      report.skillFilesRemoved = true;
    } catch (err) {
      report.errors.push(`Failed to remove ${skillDir}: ${(err as Error).message}`);
    }
  }

  // 3. npm uninstall -g adp (best-effort)
  try {
    const code = await npmRunner();
    report.npmRemoved = code === 0;
    if (code !== 0) {
      report.errors.push(`npm uninstall -g adp exited with code ${code}`);
    }
  } catch (err) {
    report.errors.push(`npm uninstall failed to launch: ${(err as Error).message}`);
  }

  return report;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function defaultNpmUninstall(): Promise<number> {
  return new Promise((resolveP, rejectP) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "npm.cmd" : "npm";
    const child = spawn(cmd, ["uninstall", "-g", "adp"], {
      stdio: "inherit",
      shell: false,
    });
    child.on("error", rejectP);
    child.on("exit", (code) => resolveP(code ?? 1));
  });
}
