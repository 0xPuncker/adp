# Sprint 1: TASK-01 Platform detection

## What I'll build
A `platform.ts` module that classifies the runtime environment (Windows native
vs MSYS/WSL vs Unix) so the update/uninstall code can pick the right installer
script (PowerShell vs bash).

## Files to touch
- `src/lifecycle/platform.ts` — new
- `src/lifecycle/platform.test.ts` — new

## Acceptance criteria
- [ ] detectPlatform() returns { platform, isWindowsNative, isMsys, shell }
- [ ] platform = "win32" | "darwin" | "linux" | "other"
- [ ] isWindowsNative = (platform === "win32" && !MSYSTEM env)
- [ ] isMsys = !!process.env.MSYSTEM
- [ ] shell = "powershell" if isWindowsNative else "bash"

## Verification
- Sensor: typecheck passes
- Sensor: test passes (5+ vitest cases)
- Manual: import in node REPL, call, check shape

## Requirements traced
REQ-02.2
