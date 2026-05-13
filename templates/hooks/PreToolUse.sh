#!/usr/bin/env bash
# ADP PreToolUse Hook — Guardrail Layer (L3)
# Blocks destructive shell commands during ADP pipeline runs.
# Install: Claude Code → Settings → Hooks → PreToolUse
#
# Receives tool input on stdin as JSON: { "tool_name": "...", "tool_input": {...} }

set -euo pipefail

input=$(cat)
tool=$(echo "$input" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
command_val=$(echo "$input" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)

# Only inspect Bash tool calls
if [[ "$tool" != "Bash" ]]; then
  exit 0
fi

# Block: rm -rf targeting non-.adp paths
if echo "$command_val" | grep -qE 'rm\s+-[^-]*r[^-]*f|rm\s+--force.*-r|rm\s+-rf'; then
  # Allow removing .adp worktrees only
  if ! echo "$command_val" | grep -qE '\.adp/worktrees'; then
    echo "ADP PreToolUse: blocked rm -rf outside .adp/worktrees" >&2
    exit 1
  fi
fi

# Block: git reset --hard
if echo "$command_val" | grep -qE 'git\s+reset\s+--hard'; then
  echo "ADP PreToolUse: blocked git reset --hard (use git stash instead)" >&2
  exit 1
fi

# Block: git push --force to main/master
if echo "$command_val" | grep -qE 'git\s+push.*--force.*\b(main|master)\b|git\s+push.*\b(main|master)\b.*--force'; then
  echo "ADP PreToolUse: blocked git push --force to main/master" >&2
  exit 1
fi

# Block: direct push to main (not a feature branch)
if echo "$command_val" | grep -qE 'git\s+push\s+(origin\s+)?main\b|git\s+push\s+(origin\s+)?master\b'; then
  echo "ADP PreToolUse: blocked direct push to main — use a feature branch" >&2
  exit 1
fi

exit 0
