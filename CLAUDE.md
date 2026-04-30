# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**ADP (Autonomous Development Pipeline)** — a Claude Code skill + TypeScript library for harness-driven autonomous development. The skill (SKILL.md) defines the methodology; the library provides the runtime components (sensor execution, state management, context loading).

## Build & Run

```bash
npm install
npm run build          # tsc → dist/
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
```

Single test:
```bash
npx vitest run src/harness/engine.test.ts
npx vitest run -t "passes on exit code 0"
```

## Architecture

```
adp/
├── SKILL.md                    # Skill definition — Claude Code loads this
├── src/
│   ├── index.ts                # Public exports
│   ├── types.ts                # Domain types (Sprint, Activity, PipelineState, etc.)
│   ├── harness/
│   │   ├── engine.ts           # Runs sensor commands, reports pass/fail
│   │   │                       # also: runSensorsStreaming() for live tail in TUI
│   │   ├── config.ts           # Loads .adp/harness.yaml
│   │   └── engine.test.ts
│   ├── context/
│   │   └── loader.ts           # Loads guides + specs from .adp/ and .specs/
│   ├── live/                   # Live sub-agent observation
│   │   ├── types.ts            # SubagentEvent, SensorChunk, LiveEvent
│   │   ├── classifier.ts       # prompt → evaluator | contract-review | worktree | unknown
│   │   └── watcher.ts          # chokidar tail of <session>/subagents/*.jsonl
│   ├── session/
│   │   ├── paths.ts            # resolveProjectSessionDir / findActiveSession helpers
│   │   ├── activity.ts         # extract events from session JSONL
│   │   ├── sprints.ts          # extract sprint records from session JSONL
│   │   └── subagents.ts        # parse one subagent JSONL → SubagentEvent
│   └── state/
│       ├── manager.ts          # Reads/writes .adp/state.json, sprint tracking
│       └── manager.test.ts
├── package.json
└── tsconfig.json
```

The live module (`src/live/`) backs the TUI's **Live Agents** panel. The watcher
tails `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl`, the
parser turns each transcript into a `SubagentEvent`, and the classifier maps it
to one of `evaluator | contract-review | worktree | unknown` so the panel can
color scores and surface sprint correlation.

**SKILL.md** tells Claude Code *what to do* (the phases, the rules, when to run sensors).
**src/** provides *how to do it* (execute shell commands, persist state, load guides).

## How ADP Gets Used

1. SKILL.md is installed as a Claude Code skill
2. User says `adp init` in a target project → Claude Code creates `.adp/` + `.specs/`
3. User says `adp run <feature>` → Claude Code follows SKILL.md to execute the pipeline
4. At each sensor gate, Claude Code uses HarnessEngine to run lint/typecheck/test
5. State persists via StateManager so sessions can resume
