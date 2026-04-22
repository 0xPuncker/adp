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

set -euo pipefail

REPO="0xPuncker/adp"
BRANCH="${ADP_BRANCH:-main}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
TARGET="$SKILLS_DIR/adp"
FORCE="${ADP_FORCE:-0}"
SKILL_ONLY="${ADP_SKILL_ONLY:-0}"
BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH"

log()  { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

echo ""
echo "  ADP — Autonomous Development Pipeline"
echo "  ────────────────────────────────────────"
echo ""

# ── Prerequisites ──────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || fail "curl is required"

# ── Step 1: Install skill files ────────────────────────────────
log "Step 1: Skill files → $TARGET"

if [ -d "$TARGET" ]; then
  if [ -d "$TARGET/.git" ]; then
    fail "$TARGET is a git clone — update with: git -C \"$TARGET\" pull"
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
  rm -rf "$TARGET"
fi

mkdir -p "$TARGET/templates"

log "Downloading from github.com/$REPO ($BRANCH)..."
curl -fsSL "$BASE_URL/SKILL.md" -o "$TARGET/SKILL.md" && ok "SKILL.md" || fail "Failed to download SKILL.md"
curl -fsSL "$BASE_URL/templates/sprint-contract.md" -o "$TARGET/templates/sprint-contract.md" && ok "templates/sprint-contract.md" || fail "download failed"
curl -fsSL "$BASE_URL/templates/evaluator-prompt.md" -o "$TARGET/templates/evaluator-prompt.md" && ok "templates/evaluator-prompt.md" || fail "download failed"
curl -fsSL "$BASE_URL/README.md" -o "$TARGET/README.md" 2>/dev/null && ok "README.md" || true

echo ""
ok "Skill installed"

# ── Step 2: Install CLI globally ───────────────────────────────
if [ "$SKILL_ONLY" = "1" ]; then
  warn "Skipping CLI install (ADP_SKILL_ONLY=1)"
else
  echo ""
  log "Step 2: CLI binary"

  for cmd in node npm git; do
    command -v "$cmd" >/dev/null 2>&1 || { warn "$cmd not found — skipping CLI install"; SKILL_ONLY=1; break; }
  done

  if [ "$SKILL_ONLY" != "1" ]; then
    TMPDIR=$(mktemp -d)
    trap 'rm -rf "$TMPDIR"' EXIT

    log "Cloning repo..."
    git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMPDIR/adp" --quiet 2>&1 && ok "Cloned" || fail "Failed to clone"

    log "Installing dependencies..."
    (cd "$TMPDIR/adp" && npm install --ignore-scripts --silent 2>&1) && ok "Dependencies" || fail "npm install failed"

    log "Building..."
    (cd "$TMPDIR/adp" && npm run build --silent 2>&1) && ok "Built" || fail "Build failed"

    log "Packing..."
    TARBALL=$(cd "$TMPDIR/adp" && npm pack --silent 2>&1 | tail -1)
    ok "Packed: $TARBALL"

    log "Installing globally..."
    npm install -g "$TMPDIR/adp/$TARBALL" --silent 2>&1 && ok "Global install" || fail "npm install -g failed"

    if command -v adp >/dev/null 2>&1; then
      ok "CLI ready: $(which adp 2>/dev/null || echo 'adp')"
    else
      warn "Installed but 'adp' not in PATH — restart your shell"
    fi
  fi
fi

# ── Done ───────────────────────────────────────────────────────
echo ""
echo "  ────────────────────────────────────────"
ok "ADP ready"
echo ""
log "Usage:"
log "  Skill:  open Claude Code in any project → say 'adp init'"
log "  CLI:    adp status | adp sensors | adp evaluate | adp help"
echo ""
