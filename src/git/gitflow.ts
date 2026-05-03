import type { BranchType, GitflowRules, ValidationResult } from "../types.js";

const GITFLOW_PREFIXES: Record<string, BranchType> = {
  "feature/": "feature",
  "release/": "release",
  "hotfix/": "hotfix",
  "bugfix/": "bugfix",
  "support/": "support",
};

const FIXED_BRANCHES = new Set<BranchType>(["develop", "main"]);

const RULES: GitflowRules = {
  feature:  { type: "feature",  prefix: "feature/",  mergesInto: ["develop"],          deletedAfterMerge: true  },
  release:  { type: "release",  prefix: "release/",  mergesInto: ["main", "develop"],  deletedAfterMerge: true  },
  hotfix:   { type: "hotfix",   prefix: "hotfix/",   mergesInto: ["main", "develop"],  deletedAfterMerge: true  },
  bugfix:   { type: "bugfix",   prefix: "bugfix/",   mergesInto: ["develop"],          deletedAfterMerge: true  },
  support:  { type: "support",  prefix: "support/",  mergesInto: ["main"],             deletedAfterMerge: false },
  develop:  { type: "develop",  prefix: "",           mergesInto: ["main"],             deletedAfterMerge: false },
  main:     { type: "main",     prefix: "",           mergesInto: [],                   deletedAfterMerge: false },
};

/**
 * Format a gitflow branch name from a type and a slug.
 * Fixed branches ("main", "develop") are returned as-is.
 */
export function formatBranchName(type: BranchType, name: string): string {
  if (FIXED_BRANCHES.has(type)) return type;
  const prefix = RULES[type]?.prefix ?? `${type}/`;
  return `${prefix}${name}`;
}

/**
 * Detect the gitflow branch type from a branch name string.
 * Returns null when the branch does not match any gitflow convention.
 */
export function getBranchType(branchName: string): BranchType | null {
  if (branchName === "main" || branchName === "master") return "main";
  if (branchName === "develop") return "develop";

  for (const [prefix, type] of Object.entries(GITFLOW_PREFIXES)) {
    if (branchName.startsWith(prefix)) return type;
  }
  return null;
}

/**
 * Suggest a gitflow branch name from a type and a human-readable description.
 * Converts the description to a kebab-case slug.
 */
export function suggestBranchName(type: BranchType, description: string): string {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
  return formatBranchName(type, slug);
}

/**
 * Validate a branch name against gitflow rules and git constraints.
 */
export function validateBranchName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    return { valid: false, errors: ["Branch name must not be empty"] };
  }

  // Fixed branches are always valid
  if (name === "main" || name === "master" || name === "develop") {
    return { valid: true, errors: [] };
  }

  const type = getBranchType(name);
  if (!type) {
    errors.push(
      `Branch "${name}" does not match any gitflow prefix. Expected: ${Object.keys(GITFLOW_PREFIXES).join(", ")}`
    );
  }

  if (/\s/.test(name)) {
    errors.push("Branch name must not contain whitespace");
  }
  if (/[~^:?*\[\\]/.test(name)) {
    errors.push("Branch name contains invalid git characters (~^:?*[\\)");
  }
  if (name.includes("..")) {
    errors.push("Branch name must not contain '..'");
  }
  if (name.endsWith(".") || name.endsWith("/")) {
    errors.push("Branch name must not end with '.' or '/'");
  }
  if (name.length > 100) {
    errors.push(`Branch name too long (${name.length} chars, max 100)`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Return the gitflow merge rules for all branch types.
 */
export function getGitflowRules(): GitflowRules {
  return { ...RULES };
}
