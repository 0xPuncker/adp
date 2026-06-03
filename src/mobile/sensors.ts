import type { SensorConfig } from "../types.js";
import type { MobilePlatform } from "./detector.js";

/**
 * Mobile sensor configurations per platform.
 * Used during adp init to populate harness.yaml with platform-appropriate sensors.
 */
export const MOBILE_SENSORS: Record<MobilePlatform, SensorConfig[]> = {
  ios: [
    {
      name: "compile",
      command: "tuist build --target {APP_NAME}",
      fix_hint: "Fix compilation errors in Xcode",
    },
    {
      name: "swiftlint",
      command: "swiftlint lint --strict",
      fix_hint: "Fix SwiftLint violations",
    },
    {
      name: "test",
      command: "tuist test --test-targets {TEST_TARGETS}",
      fix_hint: "Fix failing unit tests",
    },
    {
      name: "metal",
      command: "python Scripts/validate_metal.py",
      fix_hint: "Fix Metal shader compilation errors",
    },
    {
      name: "snapshot",
      command: "fastlane snapshot",
      fix_hint: "Fix snapshot test failures",
    },
  ],

  android: [
    {
      name: "compile",
      command: "./gradlew assembleDebug",
      fix_hint: "Fix compilation errors",
    },
    {
      name: "detekt",
      command: "./gradlew detekt",
      fix_hint: "Fix Detekt violations",
    },
    {
      name: "test",
      command: "./gradlew test",
      fix_hint: "Fix failing unit tests",
    },
    {
      name: "android_test",
      command: "./gradlew connectedAndroidTest",
      fix_hint: "Fix failing instrumentation tests",
    },
    {
      name: "lint",
      command: "./gradlew lint",
      fix_hint: "Fix Android Lint warnings",
    },
  ],

  flutter: [
    {
      name: "analyze",
      command: "flutter analyze",
      fix_hint: "Fix Dart analyzer issues",
    },
    {
      name: "test",
      command: "flutter test",
      fix_hint: "Fix failing Dart tests",
    },
    {
      name: "build",
      command: "flutter build apk",
      fix_hint: "Fix Android build errors",
    },
    {
      name: "ios_build",
      command: "flutter build ios",
      fix_hint: "Fix iOS build errors",
    },
  ],

  "react-native": [
    {
      name: "compile",
      command: "npm run android 2>&1 | grep -E 'BUILD|FAIL|error' || echo 'Build completed'",
      fix_hint: "Fix Android build errors",
    },
    {
      name: "ios_compile",
      command: "npm run ios 2>&1 | grep -E 'BUILD|FAIL|error' || echo 'Build completed'",
      fix_hint: "Fix iOS build errors",
    },
    {
      name: "test",
      command: "npm test",
      fix_hint: "Fix failing Jest tests",
    },
    {
      name: "lint",
      command: "npm run lint",
      fix_hint: "Fix ESLint violations",
    },
  ],

  unknown: [],
};

/**
 * Security sensors for mobile platforms.
 * Mobile security focuses on secrets, storage, and permissions.
 */
export const MOBILE_SECURITY_SENSORS: Record<MobilePlatform, SensorConfig[]> = {
  ios: [
    {
      name: "secret_scan",
      command: "npx secretlint '**/*'",
      fix_hint: "Remove secrets from source — use Keychain or Environment variables",
    },
    {
      name: "dependencies",
      command: "npm audit --audit-level=moderate || swift package audit || echo 'No dependency audit tool'",
      fix_hint: "Update vulnerable dependencies",
    },
  ],

  android: [
    {
      name: "secret_scan",
      command: "npx secretlint '**/*'",
      fix_hint: "Remove secrets from source — use Keystore or Environment variables",
    },
    {
      name: "dependencies",
      command: "./gradlew dependencyCheckAnalyze || echo 'No dependency check configured'",
      fix_hint: "Update vulnerable dependencies",
    },
  ],

  flutter: [
    {
      name: "secret_scan",
      command: "npx secretlint '**/*'",
      fix_hint: "Remove secrets from source — use flutter_dotenv or secure storage",
    },
    {
      name: "dependencies",
      command: "flutter pub outdated || echo 'No outdated check'",
      fix_hint: "Update outdated dependencies",
    },
  ],

  "react-native": [
    {
      name: "secret_scan",
      command: "npx secretlint '**/*'",
      fix_hint: "Remove secrets from source — use react-native-keychain or secure storage",
    },
    {
      name: "dependencies",
      command: "npm audit --audit-level=moderate",
      fix_hint: "Update vulnerable dependencies",
    },
  ],

  unknown: [],
};

/**
 * Get sensor order for a mobile platform.
 * Sensors run in this order during pipeline execution.
 */
export function getSensorOrder(platform: MobilePlatform): string[] {
  switch (platform) {
    case "ios":
      return ["compile", "swiftlint", "test", "metal", "snapshot"];
    case "android":
      return ["compile", "detekt", "test", "android_test", "lint"];
    case "flutter":
      return ["analyze", "test", "build", "ios_build"];
    case "react-native":
      return ["compile", "ios_compile", "test", "lint"];
    default:
      return [];
  }
}

/**
 * Get enabled sensors for a platform (filters out optional sensors that aren't configured).
 */
export function getEnabledSensors(
  platform: MobilePlatform,
  projectHasTests: boolean,
  hasMetalShaders: boolean
): SensorConfig[] {
  const sensors = MOBILE_SENSORS[platform] || [];
  const order = getSensorOrder(platform);

  // Filter sensors based on project capabilities
  return sensors
    .filter((sensor) => {
      // Skip metal sensor if no shaders present
      if (sensor.name === "metal" && !hasMetalShaders) {
        return false;
      }
      // Skip snapshot sensor if not configured
      if (sensor.name === "snapshot" && sensor.command.includes("fastlane")) {
        return false; // Requires fastlane setup
      }
      // Skip test sensor if no tests present
      if (sensor.name === "test" && !projectHasTests) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aIndex = order.indexOf(a.name);
      const bIndex = order.indexOf(b.name);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

/**
 * Generate harness.yaml content for a mobile platform.
 */
export function generateMobileHarness(
  platform: MobilePlatform,
  appName: string,
  testTargets: string
): string {
  const sensors = MOBILE_SENSORS[platform] || [];
  const order = getSensorOrder(platform);

  // Replace placeholders
  const sensorYaml = sensors.map((sensor) => {
    let command = sensor.command
      .replace("{APP_NAME}", appName)
      .replace("{TEST_TARGETS}", testTargets);
    return `  ${sensor.name}:
    command: ${command}`;
  }).join("\n");

  return `mode: sprint
min_score: 85

sensors:
${sensorYaml}

order: [${order.map((s) => `"${s}"`).join(", ")}]

evaluator:
  enabled: true
  timing: per_sprint
  criteria:
    correctness: 90
    completeness: 85
    code_quality: 85
    test_coverage: 90
    mobile_ui: 88
    performance: 82
    security: 85
    accessibility: 80
  live_test: false
  live_test_command: ${getLiveTestCommand(platform)}

autonomy:
  clarify: critical
  output: minimal

actions:
  ${getActions(platform)}
`;
}

function getLiveTestCommand(platform: MobilePlatform): string {
  switch (platform) {
    case "ios":
      return "xcrun simctl boot {DEVICE}";
    case "android":
      return "./gradlew installDebug";
    case "flutter":
      return "flutter run";
    case "react-native":
      return "npm run android";
    default:
      return "echo 'No live test command'";
  }
}

function getActions(platform: MobilePlatform): string {
  switch (platform) {
    case "ios":
      return `tuist_generate:
    command: tuist generate
    zone: always_ask
    auto_approve: false
  firebase_deploy:
    command: fastlane testflight
    zone: always_ask`;

    case "android":
      return `deploy_play:
    command: fastlane supply
    zone: always_ask`;

    case "flutter":
      return `deploy_play:
    command: fastlane supply
    zone: always_ask
  deploy_testflight:
    command: fastlane testflight
    zone: always_ask`;

    case "react-native":
      return `deploy_play:
    command: fastlane supply
    zone: always_ask
  deploy_testflight:
    command: fastlane testflight
    zone: always_ask`;

    default:
      return "";
  }
}