export type Platform = "win32" | "darwin" | "linux" | "other";

export interface PlatformInfo {
  platform: Platform;
  isWindowsNative: boolean;
  isMsys: boolean;
  shell: "powershell" | "bash";
}

/**
 * Classify the runtime environment so installer/update/uninstall code can
 * pick the right script:
 *   - Windows PowerShell (native cmd.exe / PowerShell)  → install.ps1
 *   - MSYS / Git Bash / WSL / Linux / macOS              → install.sh
 *
 * isMsys is true when MSYSTEM env var is set (Git Bash on Windows uses MSYS2).
 * isWindowsNative excludes MSYS so we don't try to spawn PowerShell from Git Bash.
 */
export function detectPlatform(): PlatformInfo {
  const raw = process.platform;
  const platform: Platform =
    raw === "win32" || raw === "darwin" || raw === "linux" ? raw : "other";

  const isMsys = !!process.env.MSYSTEM;
  const isWindowsNative = platform === "win32" && !isMsys;
  const shell = isWindowsNative ? "powershell" : "bash";

  return { platform, isWindowsNative, isMsys, shell };
}
