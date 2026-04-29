import { spawn } from "node:child_process";
import { detectPlatform, type PlatformInfo } from "./platform.js";

export interface UpdateOptions {
  branch?: string;
  force?: boolean;
  /** Override platform detection. For tests. */
  platformInfo?: PlatformInfo;
  /** Override how the installer is spawned. For tests. */
  runInstaller?: (cmd: string, args: string[], env: NodeJS.ProcessEnv) => Promise<number>;
}

export interface UpdateResult {
  exitCode: number;
  shell: "powershell" | "bash";
  command: string;
}

const REPO = "0xPuncker/adp";

/**
 * Re-run the platform-appropriate installer to upgrade ADP.
 *
 * Native Windows  → powershell -Command "iwr ... | iex"
 * Unix / Git Bash → bash -c   "curl -fsSL ... | bash"
 *
 * Sets ADP_FORCE=1 so the installer doesn't prompt for overwrite.
 */
export async function runUpdate(opts: UpdateOptions = {}): Promise<UpdateResult> {
  const branch = opts.branch ?? "main";
  const force = opts.force ?? true;
  const info = opts.platformInfo ?? detectPlatform();
  const runner = opts.runInstaller ?? defaultRunInstaller;

  const baseUrl = `https://raw.githubusercontent.com/${REPO}/${branch}/bin`;
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (force) env.ADP_FORCE = "1";

  let cmd: string;
  let args: string[];

  if (info.shell === "powershell") {
    const url = `${baseUrl}/install.ps1`;
    const psCommand = `iwr -useb ${url} | iex`;
    cmd = "powershell";
    args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCommand];
  } else {
    const url = `${baseUrl}/install.sh`;
    cmd = "bash";
    args = ["-c", `curl -fsSL ${url} | bash`];
  }

  const exitCode = await runner(cmd, args, env);
  return { exitCode, shell: info.shell, command: cmd };
}

function defaultRunInstaller(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, { stdio: "inherit", env });
    child.on("error", rejectP);
    child.on("exit", (code) => resolveP(code ?? 1));
  });
}
