import type { SemVer, VersionBump } from "../types.js";

// Matches: 1.2.3 | 1.2.3-alpha.1 | 1.2.3+build.1 | 1.2.3-alpha.1+build.1
const SEMVER_RE =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/;

// Commit type → version bump mapping
const BUMP_PRIORITY: Record<string, number> = {
  feat: 2,
  fix: 1,
  perf: 1,
  refactor: 0,
  docs: 0,
  test: 0,
  chore: 0,
  style: 0,
  build: 0,
  ci: 0,
};

/**
 * Parse a semver string into its numeric and pre/build components.
 * Returns null for non-semver input.
 */
export function parseSemver(version: string): SemVer | null {
  const match = SEMVER_RE.exec(version.trim());
  if (!match) return null;
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    pre: match[4] ?? null,
    build: match[5] ?? null,
  };
}

/**
 * Serialize a SemVer object to the canonical "major.minor.patch" string.
 * Pre-release and build metadata are omitted for release versions.
 */
export function formatVersion(semver: SemVer): string {
  let v = `${semver.major}.${semver.minor}.${semver.patch}`;
  if (semver.pre) v += `-${semver.pre}`;
  if (semver.build) v += `+${semver.build}`;
  return v;
}

/**
 * Bump a semver string by major, minor, or patch level.
 * Resets lower-order segments and strips pre/build metadata.
 */
export function bumpVersion(version: string, bump: VersionBump): string {
  const sv = parseSemver(version);
  if (!sv) throw new Error(`Cannot bump invalid semver: "${version}"`);

  switch (bump) {
    case "major": return `${sv.major + 1}.0.0`;
    case "minor": return `${sv.major}.${sv.minor + 1}.0`;
    case "patch": return `${sv.major}.${sv.minor}.${sv.patch + 1}`;
  }
}

/**
 * Determine the required version bump from a list of conventional commit type strings.
 * Commit types with "!" suffix (e.g. "feat!") are treated as breaking changes → major.
 */
export function getVersionBump(commitTypes: string[]): VersionBump {
  let level = 0;

  for (const raw of commitTypes) {
    const breaking = raw.endsWith("!");
    if (breaking) return "major";
    const type = raw.replace(/!$/, "");
    const priority = BUMP_PRIORITY[type] ?? 0;
    if (priority > level) level = priority;
  }

  if (level >= 2) return "minor";
  if (level >= 1) return "patch";
  return "patch";
}

/**
 * Compare two semver strings.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) throw new Error(`Cannot compare invalid semver: "${a}" vs "${b}"`);

  for (const field of ["major", "minor", "patch"] as const) {
    if (av[field] < bv[field]) return -1;
    if (av[field] > bv[field]) return 1;
  }
  return 0;
}
