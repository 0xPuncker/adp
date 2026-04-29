# Cross-Platform Installer

## Complexity
Large — PowerShell installer + standalone binary build + update/uninstall commands + bash hardening + docs

## Background

Current state:
- `bin/install.sh` works on bash — clones, builds, packs, `npm install -g`. Used by `curl … | bash`.
- No native Windows installer. PowerShell users must install Git Bash or WSL.
- No self-update flow. Users manually re-clone or re-run install.
- No clean uninstall — leaves skill files at `~/.claude/skills/adp` even after `npm uninstall -g adp`.
- No standalone binary — `adp` requires Node 22+ on PATH.

## Requirements

### ⭐ REQ-01: Native Windows installer (PowerShell) [MVP]

**User Story:** As a Windows developer using PowerShell, I want to install ADP
with one command so that I don't need Git Bash, WSL, or any Unix tooling.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | `iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.ps1 \| iex` installs ADP end-to-end |
| REQ-01.2 | Skill files copied to `$env:USERPROFILE\.claude\skills\adp\` (SKILL.md + templates + README) |
| REQ-01.3 | CLI installed via `npm install -g <tarball>` after clone+build, OR standalone binary if Node missing |
| REQ-01.4 | After install, `adp help` works in a new PowerShell window (PATH integrated) |
| REQ-01.5 | Supports env var overrides: `$env:ADP_BRANCH`, `$env:ADP_FORCE`, `$env:ADP_SKILL_ONLY`, `$env:ADP_STANDALONE` |
| REQ-01.6 | Errors with clear message if prerequisites missing (git, node OR --standalone fallback) |

### ⭐ REQ-02: `adp update` command [MVP]

**User Story:** As an existing ADP user, I want `adp update` to upgrade ADP to
latest so that I don't have to remember the install URL or re-run a long script.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | `adp update` re-runs the platform-appropriate installer (bash on Unix/Git Bash, PowerShell on native Windows) |
| REQ-02.2 | Detects platform automatically (Windows native vs Unix-like) via `process.platform` |
| REQ-02.3 | `adp update --branch <name>` upgrades to a specific branch |
| REQ-02.4 | After update, version info reflects the new install (verifiable via package.json or git rev) |
| REQ-02.5 | Aborts cleanly if installer prerequisites missing (no half-update) |

### ⭐ REQ-03: `adp uninstall` command [MVP]

**User Story:** As a user removing ADP, I want one command to remove everything
so that I don't leave skill files orphaned in `~/.claude/skills/adp`.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | `adp uninstall` removes `~/.claude/skills/adp/` directory |
| REQ-03.2 | `adp uninstall` runs `npm uninstall -g adp` to remove the global CLI |
| REQ-03.3 | `adp uninstall` removes any standalone binary at the install location |
| REQ-03.4 | Confirms before removing (unless `--yes` / `-y` passed) |
| REQ-03.5 | Reports what was removed and any failures |
| REQ-03.6 | After uninstall, `adp` command is no longer available |

### REQ-04: Standalone binary build [P1]

**User Story:** As a user without Node 22+ installed, I want a standalone `adp`
binary so that I can use ADP without installing Node first.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | `npm run build:standalone` produces a single-file binary for the host platform |
| REQ-04.2 | Binary outputs to `dist/adp-<platform>-<arch>` (e.g., `adp-linux-x64`, `adp-win32-x64.exe`, `adp-darwin-arm64`) |
| REQ-04.3 | Binary works without Node installed (bundle includes runtime) |
| REQ-04.4 | Binary is functional for `adp help`, `adp status`, `adp sensors`, `adp validate` (TUI excluded — Ink/React too heavy for `pkg`) |
| REQ-04.5 | Installer scripts can fall back to standalone when Node not detected |

### REQ-05: Bash installer hardening [P1]

**User Story:** As a Unix/Git-Bash user, I want the existing `install.sh` to be
more robust so that prerequisite issues are caught early with clear messages.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-05.1 | Detects `node --version` and warns if < 22 |
| REQ-05.2 | Detects available disk space; aborts cleanly if too small |
| REQ-05.3 | Has `--dry-run` flag that prints what would happen without executing |
| REQ-05.4 | On `npm install -g` failure, suggests `sudo` or `npm config set prefix` |
| REQ-05.5 | Cleans up tmpdir on any exit (already does this — verify) |

### REQ-06: Documentation [P1]

**User Story:** As a new user, I want clear install instructions for both
platforms so that I can pick the right command immediately.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-06.1 | README.md "Install" section has tabs/sections for Windows (PowerShell), macOS, Linux |
| REQ-06.2 | Each platform shows the one-liner + the env var options |
| REQ-06.3 | "Update" and "Uninstall" sections document those commands |
| REQ-06.4 | Standalone binary install path documented for non-Node users |

## Non-Functional Requirements

| ID | Category | Criterion |
|----|----------|-----------|
| NFR-01 | Performance | `adp uninstall` completes in <5 seconds (no network) |
| NFR-02 | Security | Installers verify GitHub HTTPS; no `--insecure` flags |
| NFR-03 | Compatibility | PowerShell installer works on PS 5.1+ (Windows 10/11 default) |
| NFR-04 | Idempotency | Re-running install with `--force` is safe; doesn't corrupt state |

## Prerequisites

None — all changes are local code/scripts/docs. Final test of installers
requires manual run, but no external services or keys.

## Out of Scope

- Publishing to npm registry (REQ #4 is its own future feature)
- Homebrew / Chocolatey / winget formulas
- Building binaries for ARM Linux (host + 64-bit only initially)
- Auto-update on schedule (manual `adp update` only)
- Telemetry / install analytics

## Open Questions

None — all gray areas resolved in `context.md`.
