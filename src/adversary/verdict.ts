import type { AdversaryFinding, AdversarySeverity, AdversaryReport } from "../types.js";

export const SEVERITY_WEIGHTS: Record<AdversarySeverity, number> = {
  critical: 30,
  high: 15,
  medium: 7,
  low: 2,
};

export const SEVERITY_RANK: Record<AdversarySeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

/**
 * Compute a resilience score from a list of findings.
 *
 * 100 with no findings; subtracts severity weights for each. Floor at 0.
 */
export function computeResilienceScore(findings: AdversaryFinding[]): number {
  const penalty = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHTS[f.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Derive the verdict from findings: any critical → broken, any high → fragile, else robust.
 */
export function deriveVerdict(findings: AdversaryFinding[]): AdversaryReport["verdict"] {
  if (findings.some((f) => f.severity === "critical")) return "broken";
  if (findings.some((f) => f.severity === "high")) return "fragile";
  return "robust";
}
