# Roadmap

> Living document. Update at the end of every milestone and after each feature ships.

Status legend: `◯ planned` · `◐ in-progress` · `● done` · `✕ dropped` · `⏸ paused`

---

## Now (current milestone)

**Milestone:** {M-01 — name}
**Target date:** {YYYY-MM-DD}
**Theme:** {one-line goal, e.g. "Prove core value with 3 internal users"}

| Status | Feature | Spec | Owner | Notes |
|--------|---------|------|-------|-------|
| ● | {feature-a} | `.specs/features/feature-a/spec.md` | {name} | shipped {date} |
| ◐ | {feature-b} | `.specs/features/feature-b/spec.md` | {name} | 4/8 tasks done |
| ◯ | {feature-c} | — | {name} | not started |

---

## Next (1–2 milestones out)

**Milestone:** {M-02 — name}
**Target date:** {YYYY-MM-DD}
**Theme:** {…}

| Status | Feature | Rationale |
|--------|---------|-----------|
| ◯ | {feature-d} | Unblocks {goal G-02} |
| ◯ | {feature-e} | Requested by {persona A} |

---

## Later (parked / exploratory)

Ideas worth remembering but not scheduled. Move to *Next* when prioritised.

- {idea} — {why it might matter}
- {idea} — …

---

## Done

Oldest last. Keep a terse record of what shipped and when.

| Milestone | Feature | Shipped | Commit |
|-----------|---------|---------|--------|
| M-00 | bootstrap | 2026-04-01 | `abc123f` |

---

## Dropped *(optional)*

Features intentionally abandoned — with reason. Prevents rediscovery churn.

| Feature | Dropped | Reason |
|---------|---------|--------|
| {name} | 2026-03-15 | Superseded by {other-feature}; market signal weak |

---

## Dependency Map *(optional)*

```
feature-c  ──▶  feature-b  ──▶  feature-a
feature-e  ──▶  feature-d
```

Use when ordering matters and isn't obvious from the tables.
