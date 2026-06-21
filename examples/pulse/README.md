# Pulse — Authentication Service Example

A complete reference implementation demonstrating ADP's spec-to-code pipeline.

## Overview

This example shows a simple JWT-based authentication service built with TypeScript, Express, and PostgreSQL. It demonstrates the full ADP workflow:

- **Discovery**: Product vision and stakeholder analysis
- **DDD**: Bounded contexts and ubiquitous language
- **Architecture**: System design with C4 diagrams
- **Specification**: User Stories with acceptance criteria
- **Implementation**: Sprint contracts with evaluator scores
- **Validation**: Spec-to-code traceability

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x
- **Database**: PostgreSQL with pg
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Testing**: Vitest
- **Linting**: ESLint
- **Type Checking**: TypeScript

## Running the Example

```bash
# Install dependencies
cd examples/pulse
npm install

# Run sensors
npm run typecheck
npm run lint
npm test

# Start the server
npm start
```

## ADP Artifacts

Explore the `.specs/` directory to see the complete pipeline artifacts:

- `.specs/project/` — Project vision, roadmap, and state
- `.specs/discovery/` — Lean Inception discovery artifacts
- `.specs/ddd/` — Domain-driven design models
- `.specs/architecture/` — Architecture documentation and ADRs
- `.specs/features/user-auth/` — Complete feature spec with RFC, design, tasks, contracts, and validation

## What This Demonstrates

1. **Discovery Phase**: VISION.md, STAKEHOLDERS.md, JOURNEYS.md, CANVAS.md
2. **DDD Phase**: Bounded contexts, ubiquitous language, context map
3. **Architecture Phase**: C4 diagrams, ADRs, technical assessment
4. **Specification Phase**: REQ-NN IDs, acceptance criteria, user stories
5. **RFC Phase**: Design decision documentation for complex features
6. **Implementation Phase**: Sprint contracts with evaluator QA
7. **Validation Phase**: REQ coverage confirmation, spec fidelity

## State History

The `.adp/state.json` shows a completed pipeline run with scored sprints:

| Sprint | Task | Score | REQs |
|--------|------|-------|------|
| 1 | Setup design tokens & shared styles | 92/100 | REQ-01 |
| 2 | Database schema & pool setup | 88/100 | REQ-02 |
| 3 | JWT token generation | 91/100 | REQ-03 |
| 4 | Login endpoint | 89/100 | REQ-04 |
| 5 | Registration endpoint | 87/100 | REQ-05 |
| 6 | Auth middleware | 94/100 | REQ-06 |

## Next Steps

Use this example as a template for your own features:

1. Run `adp init` in your project
2. Run `adp discovery` to define your product vision
3. Run `adp ddd` to model your domain
4. Run `adp architecture` to document design decisions
5. Run `adp feature "<request>"` to start a new feature
