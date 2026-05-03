import type { ConventionalCommit, AdpCommitParams, ValidationResult } from "../types.js";

const VALID_TYPES = new Set([
  "feat", "fix", "refactor", "docs", "test", "chore", "perf", "build", "ci", "style", "revert", "wip",
]);

// Regex: type(scope)!: summary — scope and ! are optional
const COMMIT_HEADER_RE = /^([a-z]+)(\([^)]+\))?(!)?: (.+)$/;

/**
 * Parse a conventional commit message into its structured parts.
 * Returns null if the message does not match the conventional commit format.
 */
export function parseConventionalCommit(message: string): ConventionalCommit | null {
  const lines = message.split("\n");
  const header = lines[0]?.trim();
  if (!header) return null;

  const match = COMMIT_HEADER_RE.exec(header);
  if (!match) return null;

  const [, type, rawScope, bang] = match;
  const summary = match[4];
  const scope = rawScope ? rawScope.slice(1, -1) : null;
  const breaking = bang === "!" || message.includes("BREAKING CHANGE:");

  const rest = lines.slice(1);
  const blankIdx = rest.findIndex((l) => l.trim() === "");
  let body: string | null = null;
  let footer: string | null = null;

  if (blankIdx !== -1) {
    const bodyLines = rest.slice(blankIdx + 1);
    const footerIdx = bodyLines.findIndex((l) => /^(BREAKING CHANGE:|[\w-]+: )/.test(l));
    if (footerIdx !== -1) {
      body = bodyLines.slice(0, footerIdx).join("\n").trim() || null;
      footer = bodyLines.slice(footerIdx).join("\n").trim() || null;
    } else {
      body = bodyLines.join("\n").trim() || null;
    }
  }

  return { type, scope, breaking, summary, body, footer };
}

/**
 * Validate a conventional commit message. Returns specific errors per violation.
 */
export function validateConventionalCommit(message: string): ValidationResult {
  const errors: string[] = [];
  const lines = message.split("\n");
  const header = lines[0]?.trim() ?? "";

  const match = COMMIT_HEADER_RE.exec(header);
  if (!match) {
    errors.push("Header must match: type(scope): summary");
    return { valid: false, errors };
  }

  const [, type] = match;
  if (!VALID_TYPES.has(type)) {
    errors.push(`Unknown commit type "${type}". Valid types: ${[...VALID_TYPES].join(", ")}`);
  }

  const summary = match[4];
  if (!summary || summary.trim().length === 0) {
    errors.push("Summary must not be empty");
  }
  if (summary && summary.length > 72) {
    errors.push(`Summary too long (${summary.length} chars, max 72)`);
  }
  if (summary && /[A-Z]/.test(summary[0]!)) {
    errors.push("Summary should start with a lowercase letter");
  }
  if (summary && summary.endsWith(".")) {
    errors.push("Summary should not end with a period");
  }
  if (lines[1] !== undefined && lines[1].trim() !== "") {
    errors.push("Second line must be blank (separating header from body)");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build the full ADP commit message format from sprint params.
 */
export function buildAdpCommitMessage(params: AdpCommitParams): string {
  const {
    type, scope, summary, taskId, requirements, body,
    sensorResults, score, evaluatorScores, breaking, breakingDescription,
  } = params;

  const breakingMark = breaking ? "!" : "";
  const header = `${type}(${scope})${breakingMark}: ${summary} [${taskId}]`;

  const lines: string[] = [header, ""];

  if (body) lines.push(body, "");

  if (requirements.length > 0) {
    lines.push(`Implements: ${requirements.join(", ")}`);
  }

  if (sensorResults) {
    const sensorLine = Object.entries(sensorResults)
      .map(([name, passed]) => `${name} ${passed ? "✓" : "✗"}`)
      .join(" ");
    lines.push(`Sensors: ${sensorLine}`);
  }

  if (evaluatorScores) {
    const scoreDetails = Object.entries(evaluatorScores)
      .map(([k, v]) => `${k} ${v}`)
      .join(" | ");
    lines.push(`Evaluator: ${scoreDetails}`);
  }

  if (score !== undefined) {
    lines.push(`Score: ${score}/100`);
  }

  if (breaking && breakingDescription) {
    lines.push("", `BREAKING CHANGE: ${breakingDescription}`);
  }

  return lines.join("\n");
}

/**
 * Serialize a ConventionalCommit object back to a commit message string.
 */
export function formatConventionalCommit(commit: ConventionalCommit): string {
  const scopePart = commit.scope ? `(${commit.scope})` : "";
  const breakingMark = commit.breaking ? "!" : "";
  let message = `${commit.type}${scopePart}${breakingMark}: ${commit.summary}`;

  if (commit.body) message += `\n\n${commit.body}`;
  if (commit.footer) message += `\n\n${commit.footer}`;

  return message;
}
