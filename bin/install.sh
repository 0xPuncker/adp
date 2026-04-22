#!/usr/bin/env bash
# ADP — Autonomous Development Pipeline
# One-liner install: curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/bin/install.sh | bash
#
# What it does:
#   1. Downloads SKILL.md + templates from GitHub
#   2. Places them in ~/.claude/skills/adp/
#   3. Done — say "adp init" in any Claude Code session
#
# Options:
#   ADP_BRANCH=feat/foo  install from a specific branch (default: main)
#   ADP_FORCE=1          overwrite existing install without prompting

set -euo pipefail

REPO="0xPuncker/adp"
BRANCH="${ADP_BRANCH:-main}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
TARGET="$SKILLS_DIR/adp"
FORCE="${ADP_FORCE:-0}"
BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH"

log()  { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

echo ""
echo "  ADP — Autonomous Development Pipeline"
echo "  ────────────────────────────────────────"
echo ""

# Check for curl
command -v curl >/dev/null 2>&1 || fail "curl is required but not found"

# Check for existing install
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

# Create target directory
mkdir -p "$TARGET/templates"

# Download files
log "Downloading from github.com/$REPO ($BRANCH)..."

curl -fsSL "$BASE_URL/SKILL.md" -o "$TARGET/SKILL.md" && ok "SKILL.md" || fail "Failed to download SKILL.md"

curl -fsSL "$BASE_URL/templates/sprint-contract.md" -o "$TARGET/templates/sprint-contract.md" && ok "templates/sprint-contract.md" || fail "Failed to download sprint-contract.md"

curl -fsSL "$BASE_URL/templates/evaluator-prompt.md" -o "$TARGET/templates/evaluator-prompt.md" && ok "templates/evaluator-prompt.md" || fail "Failed to download evaluator-prompt.md"

# Optional: README
curl -fsSL "$BASE_URL/README.md" -o "$TARGET/README.md" 2>/dev/null && ok "README.md" || true

echo ""
ok "ADP installed at $TARGET"
echo ""
log "Next steps:"
log "  1. Open Claude Code in any project"
log "  2. Say: adp init"
log "  3. Then: adp run <feature-name>"
echo ""
