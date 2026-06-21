# Ubiquitous Language

> The shared language of the domain — used by developers and domain experts.

**Last Updated:** {YYYY-MM-DD}

---

## Language Principles

1. **One word, one meaning** — Avoid synonyms for the same concept
2. **Domain-focused** — Language reflects the business, not technical implementation
3. **Ubiquitous** — Use the same terms in code, conversation, and documentation

---

## Core Terms

### {Term A}

**Definition:** {Clear, concise definition}

**Context:** {Which bounded context does this belong to?}

**Examples:**
- Positive example: {What IS this}
- Negative example: {What this is NOT}

**Synonyms to Avoid:**
- {Term 1} — {Why not to use}
- {Term 2} — {Why not to use}

**Code References:**
- `src/{context-a}/domain/{TermA}.ts` — {Primary implementation}

---

### {Term B}

**Definition:** {Clear, concise definition}

**Context:** {Which bounded context does this belong to?}

**Examples:**
- Positive example: {What IS this}
- Negative example: {What this is NOT}

**Synonyms to Avoid:**
- {Term 1} — {Why not to use}
- {Term 2} — {Why not to use}

**Code References:**
- `src/{context-b}/domain/{TermB}.ts` — {Primary implementation}

---

### {Term C}

**Definition:** {Clear, concise definition}

**Context:** {Which bounded context does this belong to?}

**Examples:**
- Positive example: {What IS this}
- Negative example: {What this is NOT}

**Synonyms to Avoid:**
- {Term 1} — {Why not to use}
- {Term 2} — {Why not to use}

**Code References:**
- `src/{context-a}/domain/{TermC}.ts` — {Primary implementation}

---

## Domain Events

| Event Name | Definition | Raised By | Handled By |
|------------|-----------|----------|------------|
| {EventA} | {What happened} | {Context} | {Context(s)} |
| {EventB} | {What happened} | {Context} | {Context(s)} |

---

## Commands

| Command Name | Definition | Issued By | Handler |
|--------------|-----------|-----------|---------|
| {CommandA} | {What it does} | {Actor} | {Context} |
| {CommandB} | {What it does} | {Actor} | {Context} |

---

## Business Rules

| Rule ID | Rule | Context | Enforcement |
|---------|------|--------|-------------|
| BR-001 | {Business rule} | {Context} | {How enforced} |
| BR-002 | {Business rule} | {Context} | {How enforced} |

---

## Glossary by Context

### {Context A}

| Term | Definition |
|------|------------|
| {Term A} | {Definition} |
| {Term B} | {Definition} |

### {Context B}

| Term | Definition |
|------|------------|
| {Term C} | {Definition} |
| {Term D} | {Definition} |

---

## Translation Dictionary

When concepts must cross bounded contexts:

| Source Context | Source Term | Target Context | Target Term | Translation Notes |
|----------------|-------------|----------------|-------------|-------------------|
| {Context A} | {Term} | {Context B} | {Term} | {How to translate} |
| {Context B} | {Term} | {Context A} | {Term} | {How to translate} |
