import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Complexity } from "../types.js";
import { StateManager } from "../state/manager.js";
import { FeatureBranchManager, type FeatureBranchAction } from "../git/feature.js";

export interface FeatureStartResult {
  feature: string;
  slug: string;
  branch: string;
  branchAction: FeatureBranchAction;
  complexity: Complexity;
  specPath: string;
  specCreated: boolean;
}

export async function startFeature(
  cwd: string,
  feature: string,
  complexity: Complexity = "medium",
): Promise<FeatureStartResult> {
  const branchResult = await new FeatureBranchManager(cwd).createOrCheckout(feature);

  const featureDir = resolve(cwd, ".specs", "features", branchResult.slug);
  const contractsDir = resolve(featureDir, "contracts");
  const specPath = resolve(featureDir, "spec.md");
  await mkdir(contractsDir, { recursive: true });

  let specCreated = false;
  if (!existsSync(specPath)) {
    await writeFile(
      specPath,
      buildFeatureSpec({
        feature,
        slug: branchResult.slug,
        branch: branchResult.branch,
        complexity,
      }),
      "utf-8",
    );
    specCreated = true;
  }

  const state = new StateManager(cwd);
  await state.startPipeline(branchResult.slug, complexity);
  await state.setBranch(branchResult.branch);

  return {
    feature,
    slug: branchResult.slug,
    branch: branchResult.branch,
    branchAction: branchResult.action,
    complexity,
    specPath,
    specCreated,
  };
}

function buildFeatureSpec(params: {
  feature: string;
  slug: string;
  branch: string;
  complexity: Complexity;
}): string {
  return `# ${toTitle(params.slug)}

Status: draft
Feature: ${params.slug}
Branch: ${params.branch}
Complexity: ${params.complexity}

## Request

${params.feature}

## Specify Instructions

- Convert the request into concrete REQ IDs with observable acceptance criteria.
- Ask only for critical ambiguity that cannot be resolved from project docs or code.
- Record assumptions and gray-area decisions in context.md when needed.
- Continue through Design, Tasks, Execute, and Validate according to ADP rules.
`;
}

function toTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
