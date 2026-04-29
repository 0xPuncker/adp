import { describe, it, expect } from "vitest";
import { runUpdate } from "./update.js";
import type { PlatformInfo } from "./platform.js";

const winNative: PlatformInfo = { platform: "win32", isWindowsNative: true, isMsys: false, shell: "powershell" };
const linux: PlatformInfo = { platform: "linux", isWindowsNative: false, isMsys: false, shell: "bash" };
const gitBash: PlatformInfo = { platform: "win32", isWindowsNative: false, isMsys: true, shell: "bash" };
const macOS: PlatformInfo = { platform: "darwin", isWindowsNative: false, isMsys: false, shell: "bash" };

describe("runUpdate", () => {
  it("uses PowerShell on native Windows", async () => {
    let captured: { cmd: string; args: string[]; env: NodeJS.ProcessEnv } | null = null;
    const result = await runUpdate({
      platformInfo: winNative,
      runInstaller: async (cmd, args, env) => {
        captured = { cmd, args, env };
        return 0;
      },
    });

    expect(result.shell).toBe("powershell");
    expect(result.command).toBe("powershell");
    expect(captured!.cmd).toBe("powershell");
    expect(captured!.args[0]).toBe("-NoProfile");
    expect(captured!.args.join(" ")).toContain("install.ps1");
    expect(captured!.args.join(" ")).toContain("iwr");
  });

  it("uses bash on Linux", async () => {
    let captured: { cmd: string; args: string[] } | null = null;
    await runUpdate({
      platformInfo: linux,
      runInstaller: async (cmd, args) => {
        captured = { cmd, args };
        return 0;
      },
    });

    expect(captured!.cmd).toBe("bash");
    expect(captured!.args[0]).toBe("-c");
    expect(captured!.args[1]).toContain("install.sh");
    expect(captured!.args[1]).toContain("curl");
  });

  it("uses bash on macOS", async () => {
    let captured: { cmd: string } | null = null;
    await runUpdate({
      platformInfo: macOS,
      runInstaller: async (cmd) => { captured = { cmd }; return 0; },
    });
    expect(captured!.cmd).toBe("bash");
  });

  it("uses bash on Git Bash even on win32 platform", async () => {
    let captured: { cmd: string } | null = null;
    await runUpdate({
      platformInfo: gitBash,
      runInstaller: async (cmd) => { captured = { cmd }; return 0; },
    });
    expect(captured!.cmd).toBe("bash");
  });

  it("respects branch option in URL", async () => {
    let captured: { args: string[] } | null = null;
    await runUpdate({
      branch: "feat/foo",
      platformInfo: linux,
      runInstaller: async (_cmd, args) => { captured = { args }; return 0; },
    });
    expect(captured!.args[1]).toContain("/feat/foo/");
  });

  it("sets ADP_FORCE=1 by default", async () => {
    let captured: { env: NodeJS.ProcessEnv } | null = null;
    await runUpdate({
      platformInfo: linux,
      runInstaller: async (_cmd, _args, env) => { captured = { env }; return 0; },
    });
    expect(captured!.env.ADP_FORCE).toBe("1");
  });

  it("does not set ADP_FORCE when force=false", async () => {
    let captured: { env: NodeJS.ProcessEnv } | null = null;
    await runUpdate({
      force: false,
      platformInfo: linux,
      runInstaller: async (_cmd, _args, env) => { captured = { env }; return 0; },
    });
    expect(captured!.env.ADP_FORCE).toBeUndefined();
  });

  it("propagates installer exit code", async () => {
    const result = await runUpdate({
      platformInfo: linux,
      runInstaller: async () => 7,
    });
    expect(result.exitCode).toBe(7);
  });
});
