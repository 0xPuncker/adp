import type { EvaluatorConfig, EvaluatorScores } from "../types.js";
import type { MobilePlatform } from "./detector.js";

/**
 * Mobile-specific evaluator criteria.
 * Extends base criteria with mobile-focused quality gates.
 */
export interface MobileEvaluatorConfig extends EvaluatorConfig {
  criteria: EvaluatorScores & {
    mobile_ui: number;
    performance: number;
    accessibility: number;
  };
}

/**
 * Default mobile evaluator thresholds.
 * Platforms can customize these based on their specific requirements.
 */
export const DEFAULT_MOBILE_EVALUATOR: MobileEvaluatorConfig = {
  enabled: true,
  timing: "per_sprint",
  criteria: {
    correctness: 90,
    completeness: 85,
    code_quality: 85,
    test_coverage: 90,
    security: 85,
    resilience: 75,
    // Mobile-specific criteria
    mobile_ui: 88,
    performance: 82,
    accessibility: 80,
  },
  live_test: false,
  live_test_timeout: 30,
};

/**
 * Platform-specific evaluator overrides.
 * Some platforms may have stricter or looser requirements.
 */
export const PLATFORM_EVALUATOR_OVERRIDES: Partial<
  Record<MobilePlatform, Partial<MobileEvaluatorConfig>>
> = {
  ios: {
    criteria: {
      ...DEFAULT_MOBILE_EVALUATOR.criteria,
      mobile_ui: 90, // Stricter UI requirements for iOS
      accessibility: 85, // Higher accessibility expectations on iOS
    } as any,
  },
  android: {
    criteria: {
      ...DEFAULT_MOBILE_EVALUATOR.criteria,
      mobile_ui: 86, // Slightly lower due to fragmentation
      performance: 84, // Better performance expectations on Android
    } as any,
  },
  flutter: {
    criteria: {
      ...DEFAULT_MOBILE_EVALUATOR.criteria,
      code_quality: 82, // Dart/Flutter has different patterns
      performance: 80, // Cross-platform performance tradeoffs
    } as any,
  },
  "react-native": {
    criteria: {
      ...DEFAULT_MOBILE_EVALUATOR.criteria,
      code_quality: 82, // JavaScript/TypeScript patterns
      performance: 78, // React Native has more performance constraints
    } as any,
  },
};

/**
 * Get mobile evaluator config for a platform.
 * Merges defaults with platform-specific overrides.
 */
export function getMobileEvaluator(
  platform: MobilePlatform
): MobileEvaluatorConfig {
  const overrides = PLATFORM_EVALUATOR_OVERRIDES[platform] || {};
  const baseCriteria = DEFAULT_MOBILE_EVALUATOR.criteria as any;
  const overrideCriteria = (overrides.criteria || {}) as any;

  return {
    ...DEFAULT_MOBILE_EVALUATOR,
    ...overrides,
    criteria: {
      ...baseCriteria,
      ...overrideCriteria,
    },
  };
}

/**
 * Mobile evaluation prompt template.
 * Used by the evaluator sub-agent to judge mobile code quality.
 */
export function getMobileEvaluatorPrompt(
  platform: MobilePlatform,
  contract: string,
  diff: string,
  sensorOutput: string
): string {
  const mobileCriteria = getMobileCriteriaDescription(platform);

  return `You are a mobile QA evaluator for ${platform} development. You did NOT write this code. Review it critically.

## Sprint Contract
${contract}

## Files Changed (git diff)
${diff}

## Sensor Results
${sensorOutput}

## Grading Criteria (hard thresholds)
${mobileCriteria}

## Mobile-Specific Evaluation Guidelines

### Correctness (${DEFAULT_MOBILE_EVALUATOR.criteria.correctness}/100)
- Does the implementation match the contract requirements?
- Are all user flows working as specified?
- Does it handle edge cases (network failures, empty states, errors)?

### Completeness (${DEFAULT_MOBILE_EVALUATOR.criteria.completeness}/100)
- Are ALL acceptance criteria from the contract addressed?
- Are all required UI elements present?
- Are error states handled?

### Code Quality (${DEFAULT_MOBILE_EVALUATOR.criteria.code_quality}/100)
- Is the code clean and idiomatic for the platform?
- Does it follow platform conventions (Swift/Kotlin/Dart patterns)?
- Are there no force unwraps (iOS), no ANRs (Android), no memory leaks?
- Is error handling proper?

### Test Coverage (${DEFAULT_MOBILE_EVALUATOR.criteria.test_coverage}/100)
- Are unit tests covering the main logic?
- Are UI tests covering critical user flows?
- Are edge cases tested?

### Security (${DEFAULT_MOBILE_EVALUATOR.criteria.security}/100)
- No secrets (API keys, tokens) in source code?
- Proper use of Keychain/Keystore/secure storage?
- Secure network communication (HTTPS, certificate pinning)?
- No hardcoded credentials?

### Resilience (${DEFAULT_MOBILE_EVALUATOR.criteria.resilience}/100)
- Are errors handled gracefully?
- Is there proper timeout handling?
- Are retries implemented for transient failures?
- Does the app handle network failures?

### Mobile UI (${DEFAULT_MOBILE_EVALUATOR.criteria.mobile_ui}/100)
- Does it follow platform UI patterns (Material Design/Human Interface Guidelines)?
- Are navigation patterns correct?
- Are loading/content/error states shown?
- Is the layout responsive to different screen sizes?
- Do animations follow platform guidelines?

### Performance (${DEFAULT_MOBILE_EVALUATOR.criteria.performance}/100)
- Does the UI run at 60fps (no jank)?
- Are there no main thread blocks?
- Is memory usage reasonable?
- Are animations smooth?
- Are there no memory leaks?

### Accessibility (${DEFAULT_MOBILE_EVALUATOR.criteria.accessibility}/100)
- Are UI elements labeled for screen readers?
- Does it support Dynamic Type (iOS) or font scaling (Android)?
- Does it respect Reduce Motion setting?
- Are touch targets at least 44pt (iOS) or 48dp (Android)?
- Is color contrast sufficient (WCAG AA)?

## Instructions
1. Read the contract carefully. Note every acceptance criterion.
2. Review the code diff against the contract. Check for gaps.
3. If live_test is enabled: launch the app and test each acceptance criterion.
4. Score each criterion 0-100. Be skeptical — do not praise mediocre work.
5. List concrete ISSUES (things that must be fixed to pass).
6. List SUGGESTIONS (improvements that won't block the sprint).
7. Verdict: "pass" if ALL scores >= thresholds, otherwise "fail".

Output JSON only with this structure:
{
  "sprint": <number>,
  "verdict": "pass" | "fail",
  "scores": {
    "correctness": <number>,
    "completeness": <number>,
    "code_quality": <number>,
    "test_coverage": <number>,
    "security": <number>,
    "resilience": <number>,
    "mobile_ui": <number>,
    "performance": <number>,
    "accessibility": <number>
  },
  "issues": ["<concrete issue 1>", "<concrete issue 2>"],
  "suggestions": ["<improvement suggestion 1>"]
}`;
}

function getMobileCriteriaDescription(platform: MobilePlatform): string {
  return `- Correctness (min ${DEFAULT_MOBILE_EVALUATOR.criteria.correctness}): Implementation matches contract
- Completeness (min ${DEFAULT_MOBILE_EVALUATOR.criteria.completeness}): All acceptance criteria met
- Code Quality (min ${DEFAULT_MOBILE_EVALUATOR.criteria.code_quality}): Clean, idiomatic ${getLanguageName(platform)} code
- Test Coverage (min ${DEFAULT_MOBILE_EVALUATOR.criteria.test_coverage}): Unit + UI tests for critical paths
- Security (min ${DEFAULT_MOBILE_EVALUATOR.criteria.security}): No secrets, secure storage, HTTPS
- Resilience (min ${DEFAULT_MOBILE_EVALUATOR.criteria.resilience}): Error handling, timeouts, retries
- Mobile UI (min ${DEFAULT_MOBILE_EVALUATOR.criteria.mobile_ui}): Platform UI patterns, navigation, states
- Performance (min ${DEFAULT_MOBILE_EVALUATOR.criteria.performance}): 60fps, no main thread blocking
- Accessibility (min ${DEFAULT_MOBILE_EVALUATOR.criteria.accessibility}): Screen readers, scaling, contrast`;
}

function getLanguageName(platform: MobilePlatform): string {
  switch (platform) {
    case "ios":
      return "Swift";
    case "android":
      return "Kotlin";
    case "flutter":
      return "Dart";
    case "react-native":
      return "JavaScript/TypeScript";
    default:
      return "platform";
  }
}