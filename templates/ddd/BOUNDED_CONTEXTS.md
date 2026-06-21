# Bounded Contexts

> Domain-Driven Design — define the boundaries of your domain models.

**Last Updated:** {YYYY-MM-DD}

---

## Context Overview

This document defines the bounded contexts for {Project Name}. Each bounded context represents a distinct area of the domain with its own ubiquitous language and rules.

---

## Context Definitions

### {Context A}

**Purpose:** {What this context does in the domain}

**Core Domain:** {Yes/No — Is this the core business value?}

**Responsibilities:**
- {Responsibility 1}
- {Responsibility 2}

**Key Concepts:**
- {Concept 1} — {Definition}
- {Concept 2} — {Definition}

**Invariants:** {Rules that must always be true}
- {Invariant 1}
- {Invariant 2}

**Owned By:** {Team/person responsible}

---

### {Context B}

**Purpose:** {What this context does in the domain}

**Core Domain:** {Yes/No — Is this the core business value?}

**Responsibilities:**
- {Responsibility 1}
- {Responsibility 2}

**Key Concepts:**
- {Concept 1} — {Definition}
- {Concept 2} — {Definition}

**Invariants:** {Rules that must always be true}
- {Invariant 1}
- {Invariant 2}

**Owned By:** {Team/person responsible}

---

### {Context C} (Generic / Supporting)

**Purpose:** {What this context does in the domain}

**Core Domain:** {No — usually supporting context}

**Responsibilities:**
- {Responsibility 1}
- {Responsibility 2}

**Key Concepts:**
- {Concept 1} — {Definition}
- {Concept 2} — {Definition}

**Invariants:** {Rules that must always be true}
- {Invariant 1}
- {Invariant 2}

**Owned By:** {Team/person responsible}

---

## Context Relationships

### {Relationship A → B}

**Type:** {Partnership / Customer-Supplier / Conformist / ACL / Shared Kernel}

**Description:** {How these contexts interact}

**Direction:** {Upstream / Downstream / Bi-directional}

**Interface:** {What's shared between contexts}

**Translation:** {How concepts are translated between contexts}

---

### {Relationship B → C}

**Type:** {Partnership / Customer-Supplier / Conformist / ACL / Shared Kernel}

**Description:** {How these contexts interact}

**Direction:** {Upstream / Downstream / Bi-directional}

**Interface:** {What's shared between contexts}

**Translation:** {How concepts are translated between contexts}

---

## Context Mapping

See `CONTEXT_MAP.md` for the visual representation of context relationships.

---

## Implementation Notes

### Module Structure

```
src/
├── {context-a}/      # Bounded Context A
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── {context-b}/      # Bounded Context B
│   ├── domain/
│   ├── application/
│   └── infrastructure/
└── shared/           # Shared Kernel (if any)
```

### Integration Patterns

| Context A | Context B | Integration Pattern | Notes |
|-----------|-----------|---------------------|-------|
| {Context A} | {Context B} | {REST / Events / RPC / Shared DB} | {Notes} |
| {Context B} | {Context C} | {REST / Events / RPC / Shared DB} | {Notes} |

---

## Anti-Corruption Layers

| External System | ACL Implementation | Owner |
|-----------------|-------------------|-------|
| {System 1} | {How we protect our domain from external concepts} | {Owner} |
| {System 2} | {How we protect our domain from external concepts} | {Owner} |
