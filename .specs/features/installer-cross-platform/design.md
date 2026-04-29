# Design: Cross-Platform Installer

## Component architecture

```
adp/
├── bin/
│   ├── install.sh            # MODIFIED — add --dry-run, node version check, better errors
│   └── install.ps1           # NEW — native PowerShell installer (mirrors install.sh)
├── src/
│   ├── cli.ts                # MODIFIED — add `update` and `uninstall` subcommands
│   └── lifecycle/            # NEW — install lifecycle module
│       ├── update.ts         # runs platform-appropriate installer
│       ├── uninstall.ts      # removes skill files + npm global + standalone binary
│       ├── platform.ts       # detect platform (win32/darwin/linux) + shell
│       ├── update.test.ts
│       └── uninstall.test.ts
├── scripts/                  # NEW — build scripts
│   └── build-standalone.mjs  # uses pkg or @yao-pkg/pkg to bundle dist/cli.js
├── package.json              # MODIFIED — add `build:standalone` script + `pkg` config
└── README.md                 # MODIFIED — install/update/uninstall section per platform
```

## Data flow

### `install.ps1` (native Windows)

```
iwr | iex
   ↓
Step 1: Skill files
   - Validate $env:USERPROFILE\.claude\skills\adp doesn't have .git (block clone-based installs)
   - Download SKILL.md, templates/*, README.md from raw.githubusercontent
   - Place into $env:USERPROFILE\.claude\skills\adp
   ↓
Step 2: CLI binary
   - Check git: where.exe git
   - Check node: where.exe node; verify >= 22
   - If both ok:
       - git clone --depth 1 to %TEMP%
       - npm install --silent
       - npm run build --silent
       - npm pack
       - npm install -g <tarball>
   - If node missing AND ADP_STANDALONE=1:
       - Download dist/adp-win32-x64.exe from GitHub release
       - Place at $env:USERPROFILE\.claude\skills\adp\bin\adp.exe
       - Add bin dir to user PATH (registry: HKCU:\Environment\Path)
   - If neither path possible: clear error
   ↓
Done — adp help works in new PowerShell
```

### `adp update`

```
Detect platform via process.platform
   ↓
Windows native (no MSYS/Git Bash detected):
   - Spawn PowerShell:
     powershell -NoProfile -ExecutionPolicy Bypass -Command \
       "iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/<branch>/bin/install.ps1 | iex"
   - With $env:ADP_FORCE=1
Unix-like (linux, darwin) OR Git Bash on Windows (MSYSTEM set):
   - Spawn bash:
     bash -c "curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/<branch>/bin/install.sh | bash"
   - With ADP_FORCE=1 in env
   ↓
Inherit stdio so user sees installer progress
   ↓
Exit with installer's exit code
```

Branch defaults to `main`; `--branch <name>` overrides.

### `adp uninstall`

```
Confirm (unless --yes)
   ↓
Step 1: Remove skill files
   - rm -rf ~/.claude/skills/adp (keep ~/.claude untouched)
   - Report removed
Step 2: npm uninstall -g adp
   - spawn npm with stdio inherit
   - Tolerate failure (e.g., not installed)
Step 3: Remove standalone binary if present
   - Look at ~/.claude/skills/adp/bin/adp(.exe)
   - rm if exists
   - Report removed
   ↓
Final report: what was removed, what wasn't, exit 0
```

### Standalone binary build

```
npm run build              # tsc → dist/
   ↓
node scripts/build-standalone.mjs
   ↓
@yao-pkg/pkg dist/cli.js \
  --targets node22-linux-x64,node22-macos-arm64,node22-win-x64 \
  --output dist/adp
   ↓
Outputs:
  dist/adp-linux-x64
  dist/adp-macos-arm64
  dist/adp-win-x64.exe

Note: TUI (src/ui/) is excluded because Ink/React don't bundle cleanly with pkg.
The standalone binary is CLI-only.
```

## Interface contracts

### `src/lifecycle/platform.ts`

```ts
export type Platform = "win32" | "darwin" | "linux" | "other";
export interface PlatformInfo {
  platform: Platform;
  isWindowsNative: boolean;   // win32 AND not running under MSYS/Cygwin
  isMsys: boolean;            // Git Bash / WSL
  shell: "powershell" | "bash";
}
export function detectPlatform(): PlatformInfo;
```

### `src/lifecycle/update.ts`

```ts
export interface UpdateOptions {
  branch?: string;            // default: "main"
  force?: boolean;            // default: true (for `adp update`)
}
export async function runUpdate(opts: UpdateOptions): Promise<{ exitCode: number }>;
```

### `src/lifecycle/uninstall.ts`

```ts
export interface UninstallOptions {
  yes?: boolean;              // skip confirmation
  cwd?: string;               // for testing
}
export interface UninstallReport {
  skillFilesRemoved: boolean;
  npmRemoved: boolean;
  standaloneRemoved: boolean;
  errors: string[];
}
export async function runUninstall(opts: UninstallOptions): Promise<UninstallReport>;
```

## Reuse map

- `bin/install.sh:1` — base shell logic; mirror in PowerShell
- `src/cli.ts:23` — switch(command) — extend with new cases
- `src/cli.ts:597` — launchTui pattern — model child_process spawning for installer

## Patterns followed (from guides/conventions)

- ESM imports with `.js` suffix
- Co-located `*.test.ts`
- Explicit error throws; CLI catches at top level
- No defensive checks at internal boundaries

## Contingencies

- **`pkg` doesn't support Node 22 yet:** Use `@yao-pkg/pkg` (community fork supports 22).
  If neither works, document standalone binary as future work and ship REQ-01 through REQ-03,
  REQ-05, REQ-06 only. REQ-04 becomes optional.
- **PowerShell execution policy blocks `iex`:** Document `-ExecutionPolicy Bypass` in README;
  installer itself can be invoked with `Set-ExecutionPolicy -Scope Process Bypass`.
- **Native Windows PATH update doesn't apply to running shell:** Tell user to open new
  PowerShell window. Setting `$env:Path` only affects the current process.
- **`npm install -g` still fails on Windows due to symlink/lstat:** Document as known
  issue; recommend running PowerShell as admin or using standalone binary.
- **Update on Windows can't replace itself while running:** `adp update` exits before
  installer modifies the binary; spawned installer runs in new process.
