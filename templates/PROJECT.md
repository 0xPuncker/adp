# {Project Name}

> One-paragraph elevator pitch — what this project is, who it's for,
> and why it exists.

---

## Vision

The long-term state you're aiming for (12–24 months). 2–4 sentences.

Example: *An internal platform that lets any engineer ship a new service to
production in under a day, without knowing our infra primitives.*

---

## Goals

Prioritised outcomes. Each goal should be verifiable.

| ID | Goal | Success Metric |
|----|------|----------------|
| G-01 | {outcome} | {how we'll know it's achieved} |
| G-02 | {outcome} | {metric} |
| G-03 | {outcome} | {metric} |

---

## Non-Goals

Deliberate exclusions — things people might assume you're doing but you are not.

- Not a replacement for {X}
- Not targeting {user segment}
- No plans to support {platform / integration}

---

## Target Users

Who uses this and in what context. One short paragraph per persona.

- **{Persona A}** — {role, what they do with the project, pain point it solves}
- **{Persona B}** — …

---

## Tech Stack

High-level only. Detailed analysis belongs in `.adp/guides/stack.md`.

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | {TypeScript / Rust / Python / …} | {rationale} |
| Framework | {Express / Axum / FastAPI / …} | {rationale} |
| Database | {PostgreSQL / SQLite / …} | {rationale} |
| Deployment | {k8s / Cloud Run / Fly.io / …} | {rationale} |
| Observability | {OTel / Datadog / …} | {rationale} |

---

## Constraints

Hard rules the project must respect. Each constraint should be unambiguous.

- **Compliance** — {e.g. GDPR, HIPAA, SOC2}
- **Performance** — {e.g. p95 < 200ms for read paths}
- **Budget** — {e.g. <$500/mo infra spend during MVP}
- **Team** — {e.g. one maintainer, bus-factor 1}
- **Timeline** — {e.g. MVP by 2026-06-30}

---

## Assumptions & Risks

Things you're betting on that could turn out wrong.

| Assumption | If wrong, impact |
|------------|------------------|
| Users have stable internet | Offline-first required — rearchitect |
| Market adopts {X} | Pivot to {Y} |

---

## Glossary *(optional)*

Domain-specific terms reviewers may not know.

- **{Term}** — {definition}

---

## Change Log

Prepend new entries. Keep it terse.

| Date | Change | By |
|------|--------|-----|
| 2026-04-20 | Initial draft | {name} |
