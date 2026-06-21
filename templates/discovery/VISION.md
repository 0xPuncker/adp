# Product Vision

> The north star — what we're building and why it matters.

---

## Elevator Pitch

{One paragraph: What is this product? Who is it for? What problem does it solve? Why now?}

---

## Vision Statement

{2-4 sentences describing the long-term desired state (12-24 months). This is the destination we're aiming for.}

**Example:** *An internal platform that lets any engineer ship a new service to production in under a day, without knowing our infrastructure primitives. The platform abstracts away k8s, CI/CD, observability, and security so developers can focus on business logic.*

---

## Goals

Prioritised outcomes. Each goal should be verifiable.

| ID | Goal | Success Metric | Priority |
|----|------|----------------|----------|
| G-01 | {outcome} | {how we'll know it's achieved} | P0 |
| G-02 | {outcome} | {metric} | P1 |
| G-03 | {outcome} | {metric} | P2 |

---

## Non-Goals

Deliberate exclusions — things people might assume we're doing but we are not.

- Not a replacement for {X}
- Not targeting {user segment}
- No plans to support {platform / integration}

---

## Success Criteria

How we'll know the vision has been achieved.

1. {Measurable outcome}
2. {Measurable outcome}
3. {Measurable outcome}

---

## Constraints

Hard rules the project must respect.

- **Compliance** — {e.g. GDPR, HIPAA, SOC2}
- **Performance** — {e.g. p95 < 200ms for read paths}
- **Budget** — {e.g. <$500/mo infra spend during MVP}
- **Team** — {e.g. one maintainer, bus-factor 1}
- **Timeline** — {e.g. MVP by 2026-06-30}

---

## Assumptions & Risks

Things we're betting on that could turn out wrong.

| Assumption | If wrong, impact | Mitigation |
|------------|-----------------|------------|
| Users have stable internet | Offline-first required — rearchitect | {Plan B} |
| Market adopts {X} | Pivot to {Y} | {Plan B} |
