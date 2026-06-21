# Domain Models

> Core domain building blocks: Entities, Value Objects, Aggregates, and Repositories.

**Last Updated:** {YYYY-MM-DD}

---

## Aggregate: {Aggregate A}

**Purpose:** {What this aggregate manages}

**Aggregate Root:** {Entity that is the root of this aggregate}

---

### Entity: {RootEntity}

**Identity:** {How this entity is uniquely identified}

**Attributes:**
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| {attribute} | {type} | {Yes/No} | {description} |
| {attribute} | {type} | {Yes/No} | {description} |

**Behaviors:**
- `{methodA}()` — {what it does, what state changes}
- `{methodB}()` — {what it does, what state changes}

**Invariants:**
- {Invariant 1} — {what must always be true}
- {Invariant 2} — {what must always be true}

**Lifecycle:**
- **Created:** {when/how}
- **Deleted:** {when/how} (if applicable)

---

### Entity: {ChildEntity}

**Identity:** {How this entity is uniquely identified}

**Attributes:**
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| {attribute} | {type} | {Yes/No} | {description} |

**Behaviors:**
- `{methodA}()` — {what it does}

**Invariants:**
- {Invariant 1}

---

### Value Objects

#### {ValueObjectA}

**Immutable:** {Yes/No}

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| {attribute} | {type} | {description} |

**Creation:** {How to create / factory method}

**Validation:** {Rules that must be true to create}

**Equality:** {How equality is determined (usually all attributes)}

---

#### {ValueObjectB}

**Immutable:** {Yes/No}

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| {attribute} | {type} | {description} |

**Creation:** {How to create / factory method}

**Validation:** {Rules that must be true to create}

**Equality:** {How equality is determined}

---

### Repository: {AggregateA}Repository

**Interface:**
```typescript
interface {AggregateA}Repository {
  save(aggregate: {AggregateA}): Promise<void>
  findById(id: {IdType}): Promise<{AggregateA} | null>
  find_by_{query}(criteria: {Criteria}): Promise<{AggregateA}[]>
  delete(id: {IdType}): Promise<void>
}
```

**Implementation Notes:**
- Storage: {PostgreSQL / MongoDB / In-memory / etc.}
- Indexes: {What indexes are needed}
- Caching: {Any caching strategy}

---

## Aggregate: {Aggregate B}

**Purpose:** {What this aggregate manages}

**Aggregate Root:** {Entity that is the root of this aggregate}

---

### Entity: {RootEntityB}

**Identity:** {How this entity is uniquely identified}

**Attributes:**
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| {attribute} | {type} | {Yes/No} | {description} |

**Behaviors:**
- `{methodA}()` — {what it does}

**Invariants:**
- {Invariant 1}

---

### Value Objects

#### {ValueObjectC}

**Immutable:** {Yes/No}

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| {attribute} | {type} | {description} |

**Creation:** {How to create / factory method}

**Validation:** {Rules that must be true to create}

---

### Repository: {AggregateB}Repository

**Interface:**
```typescript
interface {AggregateB}Repository {
  save(aggregate: {AggregateB}): Promise<void>
  findById(id: {IdType}): Promise<{AggregateB} | null>
  delete(id: {IdType}): Promise<void>
}
```

---

## Domain Services

### {ServiceA}

**Purpose:** {What this service does — why it's not part of an aggregate}

**Interface:**
```typescript
interface {ServiceA} {
  {methodA}(input: {Input}): Promise<{Output}>
}
```

**Dependencies:**
- {Repository or Service 1}
- {Repository or Service 2}

---

## Factories

### {AggregateA}Factory

**Purpose:** {How to create complex aggregates}

**Interface:**
```typescript
interface {AggregateA}Factory {
  create_{variant}(params: {Params}): {AggregateA}
}
```

---

## Cross-Aggregate Rules

| Rule | Aggregates Involved | Enforcement |
|------|---------------------|-------------|
| {Rule 1} | {Aggregate A}, {Aggregate B} | {Where enforced} |
| {Rule 2} | {Aggregate A} | {Where enforced} |

---

## Implementation Notes

**Module Structure:**
```
src/
├── {context-a}/
│   ├── domain/
│   │   ├── {aggregate-a}/
│   │   │   ├── {RootEntity}.ts
│   │   │   ├── {ChildEntity}.ts
│   │   │   ├── {ValueObjectA}.ts
│   │   │   ├── {ValueObjectB}.ts
│   │   │   ├── {AggregateA}Repository.ts
│   │   │   └── index.ts
│   │   └── shared/
│   │       └── {DomainService}.ts
│   └── infrastructure/
│       └── persistence/
│           └── {PostgreAggregateA}Repository.ts
```

**Validation Strategy:**
- {How invariants are enforced}
- {Where validation happens}

**Persistence Strategy:**
- {ORM pattern}
- {Transaction boundaries}
