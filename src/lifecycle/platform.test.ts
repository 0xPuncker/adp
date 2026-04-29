import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectPlatform } from "./platform.js";

const ORIGINAL_PLATFORM = process.platform;
const ORIGINAL_MSYSTEM = process.env.MSYSTEM;

function setPlatform(p: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: p, configurable: true });
}

beforeEach(() => {
  delete process.env.MSYSTEM;
});

afterEach(() => {
  setPlatform(ORIGINAL_PLATFORM);
  if (ORIGINAL_MSYSTEM === undefined) {
    delete process.env.MSYSTEM;
  } else {
    process.env.MSYSTEM = ORIGINAL_MSYSTEM;
  }
  vi.restoreAllMocks();
});

describe("detectPlatform", () => {
  it("classifies native Windows (no MSYSTEM)", () => {
    setPlatform("win32");
    const info = detectPlatform();
    expect(info.platform).toBe("win32");
    expect(info.isWindowsNative).toBe(true);
    expect(info.isMsys).toBe(false);
    expect(info.shell).toBe("powershell");
  });

  it("classifies Git Bash on Windows (MSYSTEM=MINGW64)", () => {
    setPlatform("win32");
    process.env.MSYSTEM = "MINGW64";
    const info = detectPlatform();
    expect(info.platform).toBe("win32");
    expect(info.isWindowsNative).toBe(false);
    expect(info.isMsys).toBe(true);
    expect(info.shell).toBe("bash");
  });

  it("classifies macOS", () => {
    setPlatform("darwin");
    const info = detectPlatform();
    expect(info.platform).toBe("darwin");
    expect(info.isWindowsNative).toBe(false);
    expect(info.isMsys).toBe(false);
    expect(info.shell).toBe("bash");
  });

  it("classifies Linux", () => {
    setPlatform("linux");
    const info = detectPlatform();
    expect(info.platform).toBe("linux");
    expect(info.isWindowsNative).toBe(false);
    expect(info.shell).toBe("bash");
  });

  it("falls back to 'other' for unknown platforms", () => {
    setPlatform("freebsd" as NodeJS.Platform);
    const info = detectPlatform();
    expect(info.platform).toBe("other");
    expect(info.isWindowsNative).toBe(false);
    expect(info.shell).toBe("bash");
  });

  it("MSYSTEM on non-Windows is harmless", () => {
    setPlatform("linux");
    process.env.MSYSTEM = "MINGW64";
    const info = detectPlatform();
    expect(info.platform).toBe("linux");
    expect(info.isWindowsNative).toBe(false);
    expect(info.isMsys).toBe(true);
    expect(info.shell).toBe("bash");
  });
});
