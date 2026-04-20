#!/usr/bin/env bash
# ADP skill installer — bash / zsh
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/0xPuncker/adp/main/install.sh | bash
#
# Overrides:
#   CLAUDE_SKILLS_DIR=/custom/path  (default: ~/.claude/skills)
#   ADP_REF=v0.2.0                  (default: main — any branch/tag/commit)
#   ADP_REPO=https://github.com/…   (default: 0xPuncker/adp)

set -euo pipefail

CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
ADP_REF="${ADP_REF:-main}"
ADP_REPO="${ADP_REPO:-https://github.com/0xPuncker/adp.git}"
TARGET="$CLAUDE_SKILLS_DIR/adp"

command -v git >/dev/null 2>&1 || { echo "✗ git not found — install git first"; exit 1; }

echo "→ Installing ADP skill"
echo "  repo:   $ADP_REPO"
echo "  ref:    $ADP_REF"
echo "  target: $TARGET"
echo

if [ -d "$TARGET/.git" ]; then
  echo "→ Existing install detected — updating"
  git -C "$TARGET" fetch --depth 1 origin "$ADP_REF"
  git -C "$TARGET" checkout -q "$ADP_REF"
  git -C "$TARGET" reset --hard "origin/$ADP_REF" 2>/dev/null || git -C "$TARGET" reset --hard "$ADP_REF"
elif [ -e "$TARGET" ]; then
  echo "✗ $TARGET exists but isn't a git clone. Move or remove it first." >&2
  exit 1
else
  mkdir -p "$CLAUDE_SKILLS_DIR"
  git clone --depth 1 --branch "$ADP_REF" "$ADP_REPO" "$TARGET" 2>/dev/null \
    || git clone "$ADP_REPO" "$TARGET"
  if [ "$ADP_REF" != "main" ]; then
    git -C "$TARGET" checkout -q "$ADP_REF"
  fi
fi

echo
echo "✓ ADP installed at $TARGET"
echo
echo "Next steps:"
echo "  1. Open Claude Code in any project"
echo "  2. Say: adp init"
echo "     → creates .adp/ + .specs/, detects stack, generates guides"
echo "  3. Then: adp run <feature-name>"
echo
echo "Docs: $TARGET/README.md"
