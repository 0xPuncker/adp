---
name: dependency-upgrade
description: Upgrade one or more dependencies — review changelog, run sensors, fix breakage
complexity: medium
---

# Dependency Upgrade: {package or batch}

## Complexity
Medium — single package OR coordinated batch (e.g., framework major version)

## Upgrade Scope

| Package | From | To | Type | Why now |
|---------|------|-----|------|---------|
| {pkg-a} | 1.2.3 | 2.0.0 | major | Security fix CVE-XXXX |
| {pkg-b} | 0.4.1 | 0.5.0 | minor | Required peer of pkg-a |

## Risk Assessment

- **Breaking changes:** {summary from changelog — link to release notes}
- **API surface affected:** {which call sites in this repo}
- **Test coverage on affected code:** {high / medium / low — gap}
- **Rollback plan:** {revert commit + lock file restore}

## Requirements

### ⭐ REQ-01: Update lock file and source [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | Package.json / Cargo.toml / requirements updated to target version |
| REQ-01.2 | Lock file regenerated and committed |
| REQ-01.3 | Peer dependency requirements satisfied |

### ⭐ REQ-02: Adapt to breaking changes [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | All call sites updated to new API |
| REQ-02.2 | Deprecation warnings resolved (not just suppressed) |
| REQ-02.3 | Test fixtures updated if data structures changed |

### ⭐ REQ-03: Verify nothing broke [MVP]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | All sensors pass: typecheck, lint, test, audit |
| REQ-03.2 | `audit` reports zero new vulnerabilities introduced |
| REQ-03.3 | Bundle size / startup time delta documented (if user-facing) |

### REQ-04: Document the change [P1]

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | CHANGELOG entry summarizing user-visible impact |
| REQ-04.2 | Migration notes added if downstream consumers exist |

## Workflow

1. **Read the changelog.** Note breaking changes, new features, deprecations.
2. **Inventory call sites** — `grep` / `rg` for the package's exports.
3. **Bump and regenerate lock.** Single command commit (`feat(deps): bump pkg X→Y`).
4. **Adapt code** — fix breakage in dedicated commits per logical chunk.
5. **Run sensors.** All must pass. Especially `audit`.
6. **Manual smoke test** — exercise the feature that uses the package.

## Recommended sensors
- All standard, plus `audit` mandatory
- For frontend deps: bundle size check
- For TS deps: type compatibility check (often the first to fail)

## Out of Scope
- Refactoring around the upgrade — separate refactor workflow
- Removing the dependency entirely — separate workflow
- Multi-major-version jumps in one go — split into incremental upgrades
