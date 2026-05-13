#!/usr/bin/env bash
# ADP SessionStart Hook — Guardrail Layer (L3)
# Prints current ADP pipeline state at the start of every Claude Code session.
# This orients the agent immediately without reading state.json manually.
# Install: Claude Code → Settings → Hooks → SessionStart

set -euo pipefail

STATE_FILE=".adp/state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  # No ADP state in this project — silently skip
  exit 0
fi

status=$(grep -o '"status":"[^"]*"' "$STATE_FILE" | head -1 | cut -d'"' -f4)
feature=$(grep -o '"feature":"[^"]*"' "$STATE_FILE" | head -1 | cut -d'"' -f4)
phase=$(grep -o '"phase":"[^"]*"' "$STATE_FILE" | head -1 | cut -d'"' -f4)

# Count done sprints
done_count=$(grep -o '"status":"done"' "$STATE_FILE" | wc -l | tr -d ' ')
# Count total sprints (rough: count "id": entries in sprints array)
total_count=$(grep -o '"id":[0-9]*' "$STATE_FILE" | wc -l | tr -d ' ')

echo ""
echo "  ADP Pipeline State"
echo "  ══════════════════"
echo "  Status:   ${status:-idle}"
echo "  Feature:  ${feature:----}"
echo "  Phase:    ${phase:----}"
echo "  Sprints:  ${done_count}/${total_count} done"
echo ""

if [[ "$status" == "running" || "$status" == "paused" ]]; then
  echo "  → Resume: say 'adp resume' to continue from last sprint."
  echo ""
fi
