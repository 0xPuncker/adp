# RFC: {Feature Title}

> Request for Comments — Design decision record for Complex features

**Status:** {Draft / In Review / Approved / Rejected / Superseded}
**Created:** {YYYY-MM-DD}
**Author:** {Author name}
**Proposed By:** {Who proposed this}

---

## Summary

{One paragraph: What is being proposed and why. This should be a concise elevator pitch of the RFC.}

---

## Motivation

### Problem Statement

{What problem are we solving? Why is this needed now?}

### Current State

{Describe the current situation. What are the pain points? What's not working?}

### Goals

{What success looks like after this RFC is implemented.}

| Goal | Success Metric |
|------|---------------|
| {Goal 1} | {How we'll measure} |
| {Goal 2} | {How we'll measure} |

### Non-Goals

{What this RFC explicitly does NOT address.}

- {Non-goal 1}
- {Non-goal 2}

---

## Proposed Solution

### High-Level Design

{Describe the proposed solution at a high level. What are the main components? How do they interact?}

### Architecture

```mermaid
{Architecture diagram if applicable}
```

### Key Components

| Component | Responsibility | Technology |
|-----------|-----------------|------------|
| {Component 1} | {What it does} | {How it's built} |
| {Component 2} | {What it does} | {How it's built} |

### Data Flow

{Describe how data flows through the system. What are the key transformations?}

```mermaid
sequenceDiagram
    {Sequence diagram if applicable}
```

### API Surface

{If this exposes new APIs or changes existing ones, describe them.}

#### {Endpoint/Method 1}

**Purpose:** {What this does}

**Request:**
```
{Method} {path}
{Request body/schema}
```

**Response:**
```
{Response body/schema}
```

#### {Endpoint/Method 2}

**Purpose:** {What this does}

**Request:**
```
{Method} {path}
```

**Response:**
```
{Response body/schema}
```

---

## Alternatives Considered

### Alternative 1: {Name}

**Description:** {What this alternative proposes}

**Pros:**
- {Pro 1}
- {Pro 2}

**Cons:**
- {Con 1}
- {Con 2}

**Why rejected:** {Reason for not choosing this}

### Alternative 2: {Name}

**Description:** {What this alternative proposes}

**Pros:**
- {Pro 1}
- {Pro 2}

**Cons:**
- {Con 1}
- {Con 2}

**Why rejected:** {Reason for not choosing this}

### Alternative 3: Status Quo

**Description:** {Not doing anything / Current approach}

**Pros:**
- {Pro 1}

**Cons:**
- {Con 1}
- {Con 2}

**Why rejected:** {Reason for not choosing this}

---

## Implementation Plan

### Phase 1: {Phase Name}

**Timeline:** {Weeks / Duration}

**Deliverables:**
- [ ] {Deliverable 1}
- [ ] {Deliverable 2}

**Dependencies:** {What this phase depends on}

**Risks:** {What could go wrong}

### Phase 2: {Phase Name}

**Timeline:** {Weeks / Duration}

**Deliverables:**
- [ ] {Deliverable 1}
- [ ] {Deliverable 2}

**Dependencies:** {What this phase depends on}

**Risks:** {What could go wrong}

### Phase 3: {Phase Name}

**Timeline:** {Weeks / Duration}

**Deliverables:**
- [ ] {Deliverable 1}
- [ ] {Deliverable 2}

**Dependencies:** {What this phase depends on}

**Risks:** {What could go wrong}

---

## Impact Assessment

### Performance Impact

{What performance impact is expected? How will this affect latency, throughput, resource usage?}

| Metric | Current | Expected | Target |
|--------|---------|----------|--------|
| {Metric 1} | {Current value} | {Expected after} | {Target} |

### Security Impact

{What security considerations are there? New attack surfaces? Data handling?}

- {Security consideration 1}
- {Security consideration 2}

### Compatibility Impact

{What breaks? What needs migration?}

- {Breaking change 1} — {Migration path}
- {Breaking change 2} — {Migration path}

### Operational Impact

{What changes for operations? Monitoring, alerting, runbooks?}

- {Operational consideration 1}
- {Operational consideration 2}

### Developer Experience Impact

{How does this affect developers? Tooling, workflows, documentation?}

- {Developer experience consideration 1}
- {Developer experience consideration 2}

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| {Risk 1} | {High/Medium/Low} | {High/Medium/Low} | {How to mitigate} | {Who owns} |
| {Risk 2} | {High/Medium/Low} | {High/Medium/Low} | {How to mitigate} | {Who owns} |

---

## Testing Strategy

### Unit Tests

{What needs unit testing?}

- {Test area 1}
- {Test area 2}

### Integration Tests

{What needs integration testing?}

- {Test scenario 1}
- {Test scenario 2}

### E2E Tests

{What needs end-to-end testing?}

- {Test scenario 1}
- {Test scenario 2}

### Performance Tests

{What needs performance testing?}

- {Test scenario 1} — {Target metric}

---

## Rollout Plan

### Canary Strategy

{How will this be rolled out?}

- {Phase 1} — {Percentage of traffic / users}
- {Phase 2} — {Percentage of traffic / users}
- {Phase 3} — {Percentage of traffic / users}

### Monitoring

{What will be monitored during rollout?}

- {Metric 1} — {Alert threshold}
- {Metric 2} — {Alert threshold}

### Rollback Plan

{How do we roll back if something goes wrong?}

- {Rollback trigger 1}
- {Rollback trigger 2}
- {Rollback procedure}

---

## Open Questions

| Question | Importance | How to Answer | By When |
|----------|------------|---------------|---------|
| {Question 1} | {High/Medium/Low} | {Method} | {Date} |
| {Question 2} | {High/Medium/Low} | {Method} | {Date} |

---

## References

- {Link 1} — {Description}
- {Link 2} — {Description}
- {Related RFC: {link}} — {Relationship}

---

## Discussion

### {Date}: {Discussion Summary}

{Record key discussions, decisions, and pivots here.}

### {Date}: {Decision Made}

{Record final decisions and rationale.}

---

## Approval

| Role | Name | Approval | Date | Comments |
|------|------|----------|------|----------|
| {Role 1} | {Name} | ✅ / ❜ | {Date} | {Comments} |
| {Role 2} | {Name} | ✅ / ❜ | {Date} | {Comments} |
| {Role 3} | {Name} | ✅ / ❜ | {Date} | {Comments} |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {Date} | {Author} | Initial draft |
| 1.1 | {Date} | {Author} | {What changed} |
| 2.0 | {Date} | {Author} | {What changed} |
