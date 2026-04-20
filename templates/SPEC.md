# {Feature Name}

> One-paragraph summary of what this feature is and why it matters.
> Who are the users? What problem does it solve?

---

## Complexity

**{Small | Medium | Large | Complex}** — {one-sentence rationale}

| Scope | Criteria | Phases |
|-------|----------|--------|
| Small | ≤3 files, ≤1h, no new deps, no design decisions | Quick mode |
| Medium | Clear feature, <10 tasks | Specify → Execute |
| Large | Multi-component, 10+ tasks | Specify → Design → Tasks → Execute |
| Complex | Ambiguous or new domain | All + gray-area discussion + UAT |

---

## Requirements

Priority tags: `⭐ [MVP]` (must-have), `[P1]` (high), `[P2]` (medium), `[P3]` (low).
Each top-level `REQ-NN` MUST have a User Story and ≥1 sub-criterion `REQ-NN.N`
written in WHEN/THEN form so it is individually testable.

---

### ⭐ REQ-01: {Short title} [MVP]

**User Story**
As a {role}, I want to {action}, so that {benefit}.

**Acceptance Criteria**

| ID | Criterion |
|----|-----------|
| REQ-01.1 | WHEN {event / trigger} THEN {system behavior} |
| REQ-01.2 | WHEN {event} AND {condition} THEN {system behavior} |
| REQ-01.3 | GIVEN {precondition} WHEN {event} THEN {system behavior} |

**Notes** *(optional)*
- Link to designs, related REQs, external references.
- Flag any gray areas — they should be resolved in `context.md`.

---

### REQ-02: {Short title} [P1]

**User Story**
As a {role}, I want to {action}, so that {benefit}.

**Acceptance Criteria**

| ID | Criterion |
|----|-----------|
| REQ-02.1 | WHEN … THEN … |
| REQ-02.2 | WHEN … THEN … |

---

## Non-Functional Requirements *(optional)*

| ID | Category | Criterion |
|----|----------|-----------|
| NFR-01 | Performance | p95 latency < 200ms for GET /api/… |
| NFR-02 | Security | All routes require auth except /health |
| NFR-03 | Observability | Errors logged with correlation ID |
| NFR-04 | Accessibility | All inputs keyboard-navigable |

---

## Out of Scope

List things deliberately NOT in this feature so reviewers don't expect them.
Discovered ideas mid-execution go to `.specs/project/STATE.md → Deferred Ideas`.

- Item A — deferred because {reason}
- Item B — covered by feature {other-feature}

---

## Open Questions

Gray areas that need user input before Design. If present, these block progress
and should be mirrored into `context.md` with the user's answers once resolved.

1. Question …
2. Question …

---

## Traceability

Downstream artifacts MUST cite REQ IDs:

- `tasks.md` — each `TASK-NN` lists `Requirement: REQ-NN.N`
- commit body — `Implements: REQ-NN[, REQ-NN.N]`
- `validation.md` — one row per REQ confirming it passed

A REQ with zero passing tasks at the Validate phase is a **coverage gap** and
must be logged to `STATE.md → Blockers`.
