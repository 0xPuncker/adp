# ADP skill installer — PowerShell (Windows)
#
# Usage:
#   iwr -useb https://raw.githubusercontent.com/0xPuncker/adp/main/install.ps1 | iex
#
# Overrides (set env vars before piping to iex):
#   $env:CLAUDE_SKILLS_DIR = 'C:\custom\path'   # default: $HOME\.claude\skills
#   $env:ADP_REF           = 'v0.2.0'           # default: main
#   $env:ADP_REPO          = 'https://…'        # default: 0xPuncker/adp

$ErrorActionPreference = 'Stop'

$SkillsDir = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }
$Ref       = if ($env:ADP_REF)           { $env:ADP_REF }           else { 'main' }
$Repo      = if ($env:ADP_REPO)          { $env:ADP_REPO }          else { 'https://github.com/0xPuncker/adp.git' }
$Target    = Join-Path $SkillsDir 'adp'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "✗ git not found — install git first" -ForegroundColor Red
  exit 1
}

Write-Host "→ Installing ADP skill"
Write-Host "  repo:   $Repo"
Write-Host "  ref:    $Ref"
Write-Host "  target: $Target"
Write-Host ""

if (Test-Path (Join-Path $Target '.git')) {
  Write-Host "→ Existing install detected — updating"
  git -C $Target fetch --depth 1 origin $Ref
  git -C $Target checkout -q $Ref
  git -C $Target reset --hard "origin/$Ref" 2>$null
  if ($LASTEXITCODE -ne 0) { git -C $Target reset --hard $Ref }
} elseif (Test-Path $Target) {
  Write-Host "✗ $Target exists but isn't a git clone. Move or remove it first." -ForegroundColor Red
  exit 1
} else {
  New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
  git clone --depth 1 --branch $Ref $Repo $Target 2>$null
  if ($LASTEXITCODE -ne 0) { git clone $Repo $Target }
  if ($Ref -ne 'main') { git -C $Target checkout -q $Ref }
}

Write-Host ""
Write-Host "✓ ADP installed at $Target" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open Claude Code in any project"
Write-Host "  2. Say: adp init"
Write-Host "     -> creates .adp/ + .specs/, detects stack, generates guides"
Write-Host "  3. Then: adp run <feature-name>"
Write-Host ""
Write-Host "Docs: $Target\README.md"
