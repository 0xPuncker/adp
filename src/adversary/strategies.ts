import type { AdversaryStrategy, Sprint } from "../types.js";

export interface AdversaryContext {
  sprint: Sprint;
  diff: string;
  changedFiles: string[];
  contractText: string;
  testFiles: string[];
}

interface StrategySpec {
  promptSection: (ctx: AdversaryContext) => string;
}

export const STRATEGIES: Record<AdversaryStrategy, StrategySpec> = {
  "property-test": {
    promptSection: (ctx) => [
      "### Property-based test synthesis",
      "",
      "For each public function or exported symbol changed in this sprint, propose 3 invariants",
      "that should hold for ALL inputs (not just the ones the author tested). Examples of invariants:",
      "- `parse(format(x)) === x` (round-trip)",
      "- `sort(xs).length === xs.length` (length preservation)",
      "- `merge(a, b) === merge(b, a)` (commutativity, where applicable)",
      "- `f(f(x)) === f(x)` (idempotence)",
      "",
      "For each invariant, generate a fast-check / hypothesis-style test that searches for a",
      "counterexample. Run them in your head against the diff. If you find an input that breaks",
      "an invariant, report it as a finding with severity:",
      "- critical: data loss, security boundary breach, crash on common input",
      "- high: incorrect output on plausible input, broken contract guarantee",
      "- medium: edge-case failure on uncommon-but-realistic input",
      "- low: theoretical failure that requires adversarial input",
      "",
      `Changed files: ${ctx.changedFiles.length > 0 ? ctx.changedFiles.join(", ") : "(unspecified)"}`,
    ].join("\n"),
  },
  mutation: {
    promptSection: () => [
      "### Mutation testing",
      "",
      "Apply 5 mutations to the diff and check whether each is caught by the existing tests:",
      "1. Flip a boolean operator (`&&` ↔ `||`)",
      "2. Off-by-one in an index (`i < n` → `i <= n`)",
      "3. Swap `<` for `<=` in a comparison",
      "4. Replace a return with a default value (return null/0/'')",
      "5. Remove a guard clause",
      "",
      "For each mutation that does NOT cause an existing test to fail, that test suite has a",
      "coverage gap. Report it as a medium-severity finding with the mutation diff.",
    ].join("\n"),
  },
  "fault-inject": {
    promptSection: () => [
      "### Fault injection",
      "",
      "Identify external boundaries in the diff (network, filesystem, child_process, database,",
      "third-party APIs). For each boundary, ask:",
      "- What if it returns malformed data?",
      "- What if it times out?",
      "- What if it returns partial results?",
      "- What if it returns success with an empty body?",
      "",
      "Propose a test that exercises each path. If the code lacks a handler for a failure mode,",
      "that's a HIGH-severity finding.",
    ].join("\n"),
  },
  "edge-fuzz": {
    promptSection: () => [
      "### Edge-case fuzzing",
      "",
      "For each input parameter to changed functions, enumerate candidate inputs:",
      "empty string, null, undefined, MAX_SAFE_INTEGER, -0, NaN, unicode-edge (combining marks,",
      "RTL, emoji ZWJ), very long strings (10K+), deeply nested objects, circular references.",
      "",
      "Pick the 5 most likely to break this code and produce reproductions. Severity scales with",
      "how plausible the input is in production use.",
    ].join("\n"),
  },
};
