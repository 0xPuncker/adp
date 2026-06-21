# Discovery: Product Definition

**Trigger:** User says "discovery" or "adp discovery"

Run the Lean Inception-style discovery workshop to define the product vision, stakeholders, user journeys, and MVP canvas.

## What You Do

1. **Create `.specs/discovery/` directory**

2. **Generate discovery templates:**
   - `VISION.md` — Product vision, goals, constraints
   - `STAKEHOLDERS.md` — Personas, pain points, goals
   - `JOURNEYS.md` — User journey maps
   - `CANVAS.md` — MVP canvas (features, risks, assumptions)
   - `ROADMAP.md` — Discovery roadmap and next steps

3. **Fill in each template interactively:**
   - Ask clarifying questions to gather information
   - Apply Lean Inception patterns (5 Why, Persona, Journey Map, MVP Canvas)
   - Keep sections practical and evidence-based

4. **Output summary** when complete:
   ```
   Discovery complete ✓
   Specs: .specs/discovery/
   Vision: {brief vision}
   MVP Features: {count} features
   Target Launch: {date}
   ```

## Templates

Use the templates in `templates/discovery/` as the source structure. Copy each to `.specs/discovery/` and fill with project-specific information.

## Next Steps

After discovery, run:
- `adp ddd` — Domain modeling (bounded contexts, ubiquitous language)
- `adp init` — Initialize project with generated specs
- `adp run {feature}` — Execute pipeline for first MVP feature
