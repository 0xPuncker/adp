# Domain-Driven Design

**Trigger:** User says "ddd" or "adp ddd"

Model the domain using DDD patterns: bounded contexts, ubiquitous language, domain models, and context mapping.

## What You Do

1. **Create `.specs/ddd/` directory**

2. **Generate DDD templates:**
   - `BOUNDED_CONTEXTS.md` — Context definitions and relationships
   - `UBIQUITOUS_LANG.md` — Domain language glossary
   - `DOMAIN_MODELS.md` — Entities, VOs, Aggregates, Repositories
   - `CONTEXT_MAP.md` — Mermaid context map diagram

3. **Fill in each template:**
   - Identify bounded contexts from the discovery artifacts
   - Define the ubiquitous language for each context
   - Specify domain models with invariants and behaviors
   - Map context relationships (Partnership, Customer-Supplier, ACL, etc.)

4. **Generate context map diagram** in Mermaid showing:
   - All bounded contexts as systems
   - Relationship types between contexts
   - External systems and their relationships
   - Communication protocols and data flow

5. **Output summary:**
   ```
   DDD modeling complete ✓
   Specs: .specs/ddd/
   Bounded Contexts: {count}
   Core Domains: {list}
   Ubiquitous Language Terms: {count}
   Context Map: CONTEXT_MAP.md
   ```

## Templates

Use the templates in `templates/ddd/` as the source structure.

## Next Steps

After DDD, run:
- `adp architecture` — Generate architecture documentation
- `adp init` — Initialize project
- `adp run {feature}` — Execute pipeline using DDD models
