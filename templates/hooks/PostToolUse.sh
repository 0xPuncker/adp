#!/usr/bin/env bash
# ADP PostToolUse Hook — Guardrail Layer (L3)
# Optionally triggers a lightweight typecheck after Write/Edit tool calls.
# Install: Claude Code → Settings → Hooks → PostToolUse
#
# Receives tool result on stdin as JSON: { "tool_name": "...", "tool_input": {...}, "tool_result": {...} }
# Set ADP_POST_TYPECHECK=1 to enable automatic typecheck after file writes.

set -euo pipefail

# Skip unless opt-in is set
if [[ "${ADP_POST_TYPECHECK:-0}" != "1" ]]; then
  exit 0
fi

input=$(cat)
tool=$(echo "$input" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)

# Only act on file-mutation tools
if [[ "$tool" != "Write" && "$tool" != "Edit" && "$tool" != "NotebookEdit" ]]; then
  exit 0
fi

# Only run if we're inside a TypeScript project with tsc available
if [[ ! -f "tsconfig.json" ]] || ! command -v npx &>/dev/null; then
  exit 0
fi

# Run a fast syntax-only typecheck (no emit, no project references)
npx tsc --noEmit --skipLibCheck 2>&1 | tail -5 || true

exit 0
