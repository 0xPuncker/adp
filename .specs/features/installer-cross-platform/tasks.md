# Tasks: installer-cross-platform

Progress: 0/8 complete

## TASK-01: Platform detection module
- [ ] **Requirement:** REQ-02.2
- [ ] **Files:** src/lifecycle/platform.ts, src/lifecycle/platform.test.ts
- [ ] **Reuses:** node:os, node:process
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** detectPlatform() returns { platform, isWindowsNative, isMsys, shell }
- [ ] **Test:** vitest covers MSYSTEM env, win32 detection, fallback shell choice
- [ ] **Commit:** `feat(lifecycle): add platform detection [ADP-TASK-01]`

## TASK-02: Uninstall command
- [ ] **Requirement:** REQ-03.1, REQ-03.2, REQ-03.3, REQ-03.4, REQ-03.5, REQ-03.6
- [ ] **Files:** src/lifecycle/uninstall.ts, src/lifecycle/uninstall.test.ts
- [ ] **Reuses:** node:fs/promises rm, child_process spawn
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** —
- [ ] **Done when:** runUninstall() removes skill dir + runs npm uninstall + removes standalone, returns UninstallReport
- [ ] **Test:** vitest with tmpdir; verify skill dir removal, mock spawn for npm
- [ ] **Commit:** `feat(lifecycle): add uninstall logic [ADP-TASK-02]`

## TASK-03: Update command
- [ ] **Requirement:** REQ-02.1, REQ-02.2, REQ-02.3, REQ-02.4, REQ-02.5
- [ ] **Files:** src/lifecycle/update.ts, src/lifecycle/update.test.ts
- [ ] **Reuses:** child_process spawn, platform.ts
- [ ] **Depends:** TASK-01
- [ ] **Parallel:** —
- [ ] **Done when:** runUpdate() spawns correct installer for platform, with branch + force env
- [ ] **Test:** vitest covers Windows native → powershell, Unix → bash; mock spawn
- [ ] **Commit:** `feat(lifecycle): add update logic [ADP-TASK-03]`

## TASK-04: PowerShell installer
- [ ] **Requirement:** REQ-01.1, REQ-01.2, REQ-01.3, REQ-01.4, REQ-01.5, REQ-01.6
- [ ] **Files:** bin/install.ps1
- [ ] **Reuses:** bin/install.sh logic translated to PowerShell idioms
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** install.ps1 mirrors install.sh: skill files, CLI install, env var support
- [ ] **Test:** Manual review; smoke-test syntax with `powershell -NoProfile -File install.ps1 -WhatIf` if possible
- [ ] **Commit:** `feat(install): add PowerShell installer for native Windows [ADP-TASK-04]`

## TASK-05: Bash installer hardening
- [ ] **Requirement:** REQ-05.1, REQ-05.2, REQ-05.3, REQ-05.4, REQ-05.5
- [ ] **Files:** bin/install.sh
- [ ] **Reuses:** existing structure
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** node version check, --dry-run flag, npm fallback hint, cleanup verified
- [ ] **Test:** Manual: `ADP_DRY_RUN=1 bash install.sh` lists actions only; node missing → clear error
- [ ] **Commit:** `feat(install): harden bash installer with --dry-run and version checks [ADP-TASK-05]`

## TASK-06: Standalone binary build script
- [ ] **Requirement:** REQ-04.1, REQ-04.2, REQ-04.3, REQ-04.4
- [ ] **Files:** scripts/build-standalone.mjs, package.json (script + devDep)
- [ ] **Reuses:** dist/cli.js (already built by `npm run build`)
- [ ] **Depends:** none
- [ ] **Parallel:** [P]
- [ ] **Done when:** `npm run build:standalone` produces dist/adp-<platform>-<arch>
- [ ] **Test:** Manual: build host platform; verify resulting binary runs `adp help`
- [ ] **Commit:** `feat(build): add standalone binary build script [ADP-TASK-06]`

## TASK-07: CLI subcommand wiring
- [ ] **Requirement:** REQ-02.1, REQ-03.1
- [ ] **Files:** src/cli.ts, src/index.ts
- [ ] **Reuses:** existing switch(command) pattern at cli.ts:23
- [ ] **Depends:** TASK-02, TASK-03
- [ ] **Parallel:** —
- [ ] **Done when:** `adp update` and `adp uninstall` route to lifecycle modules; help text updated
- [ ] **Test:** Manual: `adp update --help` and `adp uninstall --help` show usage
- [ ] **Commit:** `feat(cli): wire update and uninstall subcommands [ADP-TASK-07]`

## TASK-08: Documentation update
- [ ] **Requirement:** REQ-06.1, REQ-06.2, REQ-06.3, REQ-06.4
- [ ] **Files:** README.md, SKILL.md
- [ ] **Reuses:** existing install section
- [ ] **Depends:** TASK-04, TASK-05, TASK-06, TASK-07
- [ ] **Parallel:** —
- [ ] **Done when:** README has Windows/macOS/Linux install + update + uninstall sections; SKILL commands table updated
- [ ] **Test:** Manual review
- [ ] **Commit:** `docs: document Windows installer, update, uninstall, standalone [ADP-TASK-08]`
