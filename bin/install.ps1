# ADP - Autonomous Development Pipeline
#
# Install (PowerShell, native Windows):
#   iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.ps1 | iex
#
# What it does:
#   1. Downloads SKILL.md + templates -> $env:USERPROFILE\.claude\skills\adp\
#   2. Clones, builds, packs, installs CLI globally via npm
#
# Options (env vars):
#   $env:ADP_BRANCH      install from a specific branch (default: main)
#   $env:ADP_FORCE       overwrite existing install without prompting
#   $env:ADP_SKILL_ONLY  skip CLI install, just install the skill files
#   $env:ADP_DRY_RUN     print actions without executing

$ErrorActionPreference = "Stop"

$Repo       = "0xPuncker/adp"
$Branch     = if ($env:ADP_BRANCH) { $env:ADP_BRANCH } else { "main" }
$SkillsDir  = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $env:USERPROFILE ".claude\skills" }
$Target     = Join-Path $SkillsDir "adp"
$Force      = $env:ADP_FORCE -eq "1"
$SkillOnly  = $env:ADP_SKILL_ONLY -eq "1"
$DryRun     = $env:ADP_DRY_RUN -eq "1"
$BaseUrl    = "https://raw.githubusercontent.com/$Repo/$Branch"

function Write-Log  { param($Msg) Write-Host "  $Msg" -ForegroundColor Gray }
function Write-Ok   { param($Msg) Write-Host "  " -NoNewline; Write-Host "[ok]" -ForegroundColor Green -NoNewline; Write-Host " $Msg" -ForegroundColor Gray }
function Write-Warn { param($Msg) Write-Host "  " -NoNewline; Write-Host "[!]"  -ForegroundColor Yellow -NoNewline; Write-Host " $Msg" -ForegroundColor Gray }
function Write-Fail { param($Msg) Write-Host "  " -NoNewline; Write-Host "[x]"  -ForegroundColor Red -NoNewline; Write-Host " $Msg" -ForegroundColor Gray; exit 1 }

# Render a rounded ASCII panel matching the TUI's <Panel/> visual language.
# PowerShell 5.1 reads non-BOM UTF-8 as Windows-1252, so we use ASCII box chars.
function Write-Panel {
  param(
    [string]$Title,
    [System.ConsoleColor]$TitleColor = "Yellow",
    [string[]]$Lines,
    [int]$Width = 64
  )
  $inner = $Width - 4
  $border = "+" + ("-" * ($Width - 2)) + "+"
  Write-Host $border -ForegroundColor DarkGray
  if ($Title) {
    Write-Host "| " -ForegroundColor DarkGray -NoNewline
    Write-Host $Title.PadRight($inner) -ForegroundColor $TitleColor -NoNewline
    Write-Host " |" -ForegroundColor DarkGray
    Write-Host ("| " + (" " * $inner) + " |") -ForegroundColor DarkGray
  }
  foreach ($line in $Lines) {
    $clipped = if ($line.Length -gt $inner) { $line.Substring(0, $inner - 1) + "~" } else { $line }
    Write-Host "| " -ForegroundColor DarkGray -NoNewline
    Write-Host $clipped.PadRight($inner) -ForegroundColor Gray -NoNewline
    Write-Host " |" -ForegroundColor DarkGray
  }
  Write-Host $border -ForegroundColor DarkGray
}

Write-Host ""
Write-Panel `
  -Title "ADP - Autonomous Development Pipeline" `
  -TitleColor "Yellow" `
  -Lines @(
    "Spec-to-code sprints with feedback control",
    "",
    "Repo:   github.com/0xPuncker/adp",
    "Branch: $Branch"
  )
Write-Host ""

if ($DryRun) {
  Write-Warn "DRY RUN - no changes will be made"
  Write-Host ""
}

# Step 1: Skill files
Write-Log "Step 1: Skill files -> $Target"

if (Test-Path (Join-Path $Target ".git")) {
  Write-Fail "$Target is a git clone - update with: git -C `"$Target`" pull"
}

if (Test-Path $Target) {
  if (-not $Force) {
    Write-Log "Found existing install at $Target"
    $answer = Read-Host "  Overwrite? [y/N]"
    if ($answer -notmatch "^[yY]") {
      Write-Fail "Aborted. Re-run with `$env:ADP_FORCE=1 to skip prompt."
    }
  }
  if (-not $DryRun) {
    Remove-Item $Target -Recurse -Force
  } else {
    Write-Log "[dry-run] Would remove $Target"
  }
}

if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Target "templates") | Out-Null
}

Write-Log "Downloading from github.com/$Repo ($Branch)..."

$Files = @(
  @{ Url = "$BaseUrl/SKILL.md";                          Dest = Join-Path $Target "SKILL.md";                       Required = $true },
  @{ Url = "$BaseUrl/templates/sprint-contract.md";      Dest = Join-Path $Target "templates\sprint-contract.md";   Required = $true },
  @{ Url = "$BaseUrl/templates/evaluator-prompt.md";     Dest = Join-Path $Target "templates\evaluator-prompt.md";  Required = $true },
  @{ Url = "$BaseUrl/README.md";                         Dest = Join-Path $Target "README.md";                      Required = $false }
)

foreach ($f in $Files) {
  if ($DryRun) {
    Write-Log "[dry-run] Would download $($f.Url)"
    continue
  }
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $f.Url -OutFile $f.Dest
    Write-Ok (Split-Path -Leaf $f.Dest)
  } catch {
    if ($f.Required) {
      Write-Fail "Failed to download $($f.Url): $_"
    }
  }
}

Write-Host ""
Write-Ok "Skill installed"

# Step 2: CLI binary
if ($SkillOnly) {
  Write-Warn "Skipping CLI install (`$env:ADP_SKILL_ONLY=1)"
} else {
  Write-Host ""
  Write-Log "Step 2: CLI binary"

  $missing = @()
  foreach ($cmd in @("git", "node", "npm")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
      $missing += $cmd
    }
  }

  if ($missing.Count -gt 0) {
    Write-Warn "Missing prerequisites: $($missing -join ', ')"
    Write-Warn "Skipping CLI install - you can still use ADP as a Claude Code skill"
    Write-Warn "Install Node 22+ from https://nodejs.org and re-run to get the 'adp' command"
  } elseif ($DryRun) {
    Write-Log "[dry-run] Would clone $Repo#$Branch, npm install, npm run build, npm pack, npm install -g <tarball>"
  } else {
    $tmp = Join-Path $env:TEMP ("adp-install-" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmp | Out-Null

    try {
      Write-Log "Cloning repo..."
      git clone --depth 1 --branch $Branch "https://github.com/$Repo.git" "$tmp\adp" --quiet
      if ($LASTEXITCODE -ne 0) { Write-Fail "git clone failed" }
      Write-Ok "Cloned"

      Push-Location "$tmp\adp"
      try {
        Write-Log "Installing dependencies..."
        npm install --silent 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed" }
        Write-Ok "Dependencies"

        Write-Log "Building..."
        npm run build --silent 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed" }
        Write-Ok "Built"

        Write-Log "Packing..."
        $pack = npm pack --silent
        $tarball = ($pack | Select-Object -Last 1).Trim()
        Write-Ok "Packed: $tarball"

        Write-Log "Installing globally..."
        npm install -g (Join-Path "$tmp\adp" $tarball) --silent 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
          Write-Warn "npm install -g failed - you may need to run PowerShell as Administrator"
          Write-Warn "Or set a user-writable npm prefix: npm config set prefix `"$env:USERPROFILE\npm-global`""
        } else {
          Write-Ok "Global install"
        }
      } finally {
        Pop-Location
      }

      if (Get-Command adp -ErrorAction SilentlyContinue) {
        Write-Ok "CLI ready: $((Get-Command adp).Source)"
      } else {
        Write-Warn "Installed but 'adp' not in PATH - open a new PowerShell window"
      }
    } finally {
      Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

# Done
Write-Host ""
Write-Panel `
  -Title "Done - ADP ready" `
  -TitleColor "Green" `
  -Lines @(
    "Skill: open Claude Code in any project, say 'adp init'",
    "CLI:   adp status | adp sensors | adp evaluate | adp help",
    "TUI:   adp tui  (or 'adp dashboard')"
  )
Write-Host ""
