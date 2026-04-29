---
name: perf-investigation
description: Diagnose and fix a performance regression or hot spot — measure, locate, fix, verify
complexity: medium
---

# Performance: {Hot path / regression name}

## Complexity
Medium — measurement-driven; scope locked to one bottleneck

## Symptom

**Observed:** {p95 latency, throughput, memory, CPU — with numbers}
**Target:** {budget — what's acceptable}
**Where reported:** {profiler, APM dashboard, user complaint, regression test}
**Reproduction:** {how to trigger the slow path}

## Hypothesis

> What you currently believe is slow and why. This will be invalidated or confirmed
> by measurement. Do NOT optimize before measuring.

## Requirements

### ⭐ REQ-01: Measure before optimizing [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | A reproducible benchmark exists (test, script, or load tool config) |
| REQ-01.2 | Baseline metrics recorded: p50, p95, p99, mean, allocations |
| REQ-01.3 | Profile captured (flamegraph / pprof / Node `--prof`) — committed or attached |

### ⭐ REQ-02: Identify root cause [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | Bottleneck identified at `file:line` with profile evidence |
| REQ-02.2 | Common patterns checked: N+1 queries, unbounded loops, allocations in hot path, sync I/O, missing index |
| REQ-02.3 | Hypothesis from above is confirmed or replaced with documented finding |

### ⭐ REQ-03: Fix and verify [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | Fix targets the identified root cause (not symptoms) |
| REQ-03.2 | Benchmark re-run; metric meets target with statistical confidence |
| REQ-03.3 | No regression in other paths (full test suite + sensor pass) |
| REQ-03.4 | Regression test added that fails if performance regresses past budget |

## Anti-patterns to avoid
- "Optimize first, measure later" — always measure first
- Micro-optimizations on cold paths
- Caching without invalidation strategy
- Adding indexes without understanding query plan

## Recommended sensors
- All standard sensors
- Custom: benchmark command (e.g., `npm run bench`) — add to harness.yaml

## Out of Scope
- Architectural rewrites — separate workflow if the bottleneck is structural
- General "make it faster" without target — needs concrete budget first
