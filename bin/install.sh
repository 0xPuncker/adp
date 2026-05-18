#!/usr/bin/env bash
# ADP — Autonomous Development Pipeline
#
# Install:
#   curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
#
# What it does:
#   1. Downloads SKILL.md + templates → ~/.claude/skills/adp/  (Claude Code skill)
#   2. Clones, builds, and installs CLI globally               (adp command)
#
# Options:
#   ADP_BRANCH=feat/foo    install from a specific branch (default: main)
#   ADP_FORCE=1            overwrite without prompting
#   ADP_SKILL_ONLY=1       skip CLI, just install skill files
#   ADP_DRY_RUN=1          print actions without executing

set -euo pipefail

REPO="0xPuncker/adp"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
TARGET="$SKILLS_DIR/adp"
FORCE="${ADP_FORCE:-0}"
SKILL_ONLY="${ADP_SKILL_ONLY:-0}"
DRY_RUN="${ADP_DRY_RUN:-0}"
MIN_NODE_MAJOR=22

# Resolve ref: explicit branch > latest release tag > fallback main
if [ -n "${ADP_BRANCH:-}" ]; then
  BRANCH="$ADP_BRANCH"
else
  LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
    | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
  BRANCH="${LATEST_TAG:-main}"
fi

BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH"

# Color palette mirrors src/cli/branding.ts (TUI theme).
BRAND='\033[38;5;173m'   # warm orange
ACCENT='\033[38;5;147m'  # soft blue
SUCCESS='\033[38;5;41m'
ERROR='\033[38;5;167m'
WARNING='\033[38;5;178m'
DIM='\033[38;5;244m'
SUBTLE='\033[38;5;240m'
TEXT='\033[38;5;252m'
BOLD='\033[1m'
RESET='\033[0m'

# Render a rounded panel matching the Ink TUI's <Panel/>.
# Usage: panel "<title>" "<title-color>" "<line1>" "<line2>" ...
panel() {
  local title="$1"; shift
  local title_color="$1"; shift
  local width=68
  local inner=$((width - 4))
  local border="$SUBTLE"
  printf '%b╭' "$border"; printf '─%.0s' $(seq 1 $((width - 2))); printf '╮%b\n' "$RESET"
  if [ -n "$title" ]; then
    printf '%b│%b %b%b%-*s%b %b│%b\n' "$border" "$RESET" "$BOLD" "$title_color" "$inner" "$title" "$RESET" "$border" "$RESET"
    printf '%b│%b %*s %b│%b\n' "$border" "$RESET" "$inner" "" "$border" "$RESET"
  fi
  for line in "$@"; do
    # Strip ANSI for length calc.
    local plain
    plain=$(printf '%b' "$line" | sed -E 's/\x1b\[[0-9;]*m//g')
    local pad=$((inner - ${#plain}))
    [ $pad -lt 0 ] && pad=0
    printf '%b│%b %b%*s %b│%b\n' "$border" "$RESET" "$line" "$pad" "" "$border" "$RESET"
  done
  printf '%b╰' "$border"; printf '─%.0s' $(seq 1 $((width - 2))); printf '╯%b\n' "$RESET"
}

# One-line dividers with optional label.
divider() {
  local label="$1"
  if [ -z "$label" ]; then
    printf '%b────────────────────────────────────────────────────────────────────%b\n' "$SUBTLE" "$RESET"
  else
    printf '%b── %b%b%b%b %s%b\n' "$SUBTLE" "$RESET" "$BOLD" "$ACCENT" "$label" "$RESET" "$RESET"
  fi
}

log()  { printf '  %b%s%b\n' "$TEXT" "$*" "$RESET"; }
ok()   { printf '  %b✓%b %b%s%b\n' "$SUCCESS" "$RESET" "$TEXT" "$*" "$RESET"; }
warn() { printf '  %b!%b %b%s%b\n' "$WARNING" "$RESET" "$TEXT" "$*" "$RESET"; }
fail() { printf '  %b✗%b %b%s%b\n' "$ERROR" "$RESET" "$TEXT" "$*" "$RESET" >&2; exit 1; }

if [ "$FORCE" != "1" ]; then
  echo ""
  panel "ADP — Autonomous Development Pipeline" "$BRAND" \
    "$(printf '%b' "${DIM}Spec-to-code sprints with feedback control${RESET}")" \
    "" \
    "$(printf '%b' "${DIM}Repo:   ${RESET}${ACCENT}github.com/0xPuncker/adp${RESET}")" \
    "$(printf '%b' "${DIM}Branch: ${RESET}${TEXT}${BRANCH}${RESET}")"
  echo ""
fi

if [ "$DRY_RUN" = "1" ]; then
  warn "DRY RUN — no changes will be made"
  echo ""
fi

# ── Prerequisites ──────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || fail "curl is required"

# Node version warning (non-fatal — skill-only install still works)
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0")
  if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    warn "Node $(node -v) detected — ADP requires Node ${MIN_NODE_MAJOR}+ for the CLI"
    warn "Skill install will proceed; CLI may fail to run"
  fi
fi

# ── Step 1: Install skill files ────────────────────────────────
log "Step 1: Skill files → $TARGET"

if [ -d "$TARGET" ]; then
  if [ -d "$TARGET/.git" ]; then
    if [ "$DRY_RUN" = "1" ]; then
      log "[dry-run] Would run: git -C \"$TARGET\" fetch origin && git -C \"$TARGET\" reset --hard origin/$BRANCH"
    else
      log "Detected git clone at $TARGET — syncing to origin/$BRANCH..."
      git -C "$TARGET" fetch origin --quiet 2>&1 || fail "git fetch failed in $TARGET"
      git -C "$TARGET" reset --hard "origin/$BRANCH" --quiet 2>&1 || fail "git reset failed in $TARGET"
      ok "Skill updated via git"
    fi
    # Skip the download steps below — git already synced everything.
    [ "$SKILL_ONLY" = "1" ] && { echo ""; warn "Skipping CLI install (ADP_SKILL_ONLY=1)"; } || true
    echo ""; ok "Skill installed"; [ "$FORCE" != "1" ] && { echo ""; panel "Done — ADP ready" "$SUCCESS" \
      "$(printf '%b' "${DIM}Skill:${RESET} ${TEXT}open Claude Code in any project, say \"adp init\"${RESET}")" \
      "$(printf '%b' "${DIM}CLI:  ${RESET} ${TEXT}adp status | adp sensors | adp evaluate | adp help${RESET}")" \
      "$(printf '%b' "${DIM}TUI:  ${RESET} ${TEXT}adp tui${RESET} ${SUBTLE}(or 'adp dashboard')${RESET}")"; echo ""; }
    exit 0
  fi
  if [ "$FORCE" != "1" ]; then
    log "Found existing install at $TARGET"
    printf '  Overwrite? [y/N] '
    read -r answer
    case "$answer" in
      [yY]*) ;;
      *) fail "Aborted. Re-run with ADP_FORCE=1 to skip prompt." ;;
    esac
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log "[dry-run] Would remove $TARGET"
  else
    rm -rf "$TARGET"
  fi
fi

if [ "$DRY_RUN" = "1" ]; then
  log "[dry-run] Would create $TARGET/templates and download SKILL.md, templates/, README.md"
else
  mkdir -p "$TARGET/templates"

  log "Downloading from github.com/$REPO ($BRANCH)..."
  curl -fsSL "$BASE_URL/SKILL.md" -o "$TARGET/SKILL.md" && ok "SKILL.md" || fail "Failed to download SKILL.md"
  curl -fsSL "$BASE_URL/templates/sprint-contract.md" -o "$TARGET/templates/sprint-contract.md" && ok "templates/sprint-contract.md" || fail "download failed"
  curl -fsSL "$BASE_URL/templates/evaluator-prompt.md" -o "$TARGET/templates/evaluator-prompt.md" && ok "templates/evaluator-prompt.md" || fail "download failed"
  curl -fsSL "$BASE_URL/README.md" -o "$TARGET/README.md" 2>/dev/null && ok "README.md" || true
fi

echo ""
ok "Skill installed"

# ── Step 2: Install CLI globally ───────────────────────────────
if [ "$SKILL_ONLY" = "1" ]; then
  warn "Skipping CLI install (ADP_SKILL_ONLY=1)"
else
  echo ""
  log "Step 2: CLI binary"

  for cmd in node npm git; do
    command -v "$cmd" >/dev/null 2>&1 || { warn "$cmd not found — skipping CLI install"; warn "Install Node ${MIN_NODE_MAJOR}+ from https://nodejs.org and re-run for the 'adp' command"; SKILL_ONLY=1; break; }
  done

  if [ "$SKILL_ONLY" != "1" ]; then
    if [ "$DRY_RUN" = "1" ]; then
      log "[dry-run] Would clone $REPO#$BRANCH, npm install, npm run build, npm pack, npm install -g <tarball>"
    else
      TMPDIR=$(mktemp -d)
      trap 'rm -rf "$TMPDIR"' EXIT INT TERM

      log "Cloning repo..."
      # `-c advice.detachedHead=false` suppresses the "you are in 'detached HEAD' state"
      # advisory that git emits when $BRANCH is a tag (e.g. v0.8.0 from the release-latest
      # resolver above) — the clone is always one-shot, so the detached state is expected
      # and the advisory just adds noise to `adp update` output. --quiet does not cover it.
      git -c advice.detachedHead=false clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMPDIR/adp" --quiet 2>&1 && ok "Cloned" || fail "Failed to clone"

      log "Installing dependencies..."
      (cd "$TMPDIR/adp" && npm install --ignore-scripts --silent 2>&1) && ok "Dependencies" || fail "npm install failed"

      log "Building..."
      (cd "$TMPDIR/adp" && npm run build --silent 2>&1) && ok "Built" || fail "Build failed"

      log "Packing..."
      TARBALL=$(cd "$TMPDIR/adp" && npm pack --silent 2>&1 | tail -1)
      ok "Packed: $TARBALL"

      log "Installing globally..."
      if ! npm install -g "$TMPDIR/adp/$TARBALL" --silent 2>&1; then
        warn "npm install -g failed"
        warn "Try one of:"
        warn "  • Run with sudo (Linux/macOS):    sudo bash -c 'curl -fsSL ... | bash'"
        warn "  • Set user-writable npm prefix:  npm config set prefix \"\$HOME/.npm-global\""
        warn "  • On Windows: run PowerShell as Administrator"
        fail "Aborted"
      fi
      ok "Global install"

      if command -v adp >/dev/null 2>&1; then
        ok "CLI ready: $(which adp 2>/dev/null || echo 'adp')"
      else
        warn "Installed but 'adp' not in PATH — restart your shell"
      fi
    fi
  fi
fi

# ── Done ───────────────────────────────────────────────────────
if [ "$FORCE" != "1" ]; then
  echo ""
  panel "Done — ADP ready" "$SUCCESS" \
    "$(printf '%b' "${DIM}Skill:${RESET} ${TEXT}open Claude Code in any project, say \"adp init\"${RESET}")" \
    "$(printf '%b' "${DIM}CLI:  ${RESET} ${TEXT}adp status | adp sensors | adp evaluate | adp help${RESET}")" \
    "$(printf '%b' "${DIM}TUI:  ${RESET} ${TEXT}adp tui${RESET} ${SUBTLE}(or 'adp dashboard')${RESET}")"
  echo ""
fi
