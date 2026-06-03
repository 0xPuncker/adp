import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type MobilePlatform = "ios" | "android" | "flutter" | "react-native" | "unknown";
export type MobileStack = "swiftui" | "uikit" | "jetpack-compose" | "flutter" | "react-native" | "unknown";

export interface MobileProjectInfo {
  platform: MobilePlatform;
  stack: MobileStack;
  buildSystem: string;
  language: string;
  hasTests: boolean;
  metalShaders: boolean;
  confidence: number;
}

const IOS_INDICATORS = [
  "Package.swift",
  "Project.swift",
  "*.xcodeproj",
  "*.xcworkspace",
  "Info.plist",
  "Podfile",
];

const ANDROID_INDICATORS = [
  "build.gradle.kts",
  "build.gradle",
  "AndroidManifest.xml",
  "settings.gradle.kts",
  "settings.gradle",
  "app/build.gradle",
];

const FLUTTER_INDICATORS = [
  "pubspec.yaml",
];

const REACT_NATIVE_INDICATORS = [
  "package.json",
];

/**
 * Detect mobile platform by analyzing project files.
 * Returns platform info with confidence score (0-1).
 */
export async function detectMobilePlatform(cwd: string): Promise<MobileProjectInfo> {
  const files = await readdir(cwd);
  const scores: Record<MobilePlatform, number> = {
    ios: 0,
    android: 0,
    flutter: 0,
    "react-native": 0,
    unknown: 0,
  };

  // iOS detection
  for (const indicator of IOS_INDICATORS) {
    if (await fileExists(cwd, indicator)) {
      scores.ios += 1;
    }
  }
  // Check for Tuist (iOS project generator)
  if (await fileExists(cwd, "Project.swift")) {
    scores.ios += 2; // Strong indicator
  }

  // Android detection
  for (const indicator of ANDROID_INDICATORS) {
    if (await fileExists(cwd, indicator)) {
      scores.android += 1;
    }
  }

  // Flutter detection
  for (const indicator of FLUTTER_INDICATORS) {
    if (await fileExists(cwd, indicator)) {
      scores.flutter += 2; // Strong indicator
    }
  }

  // React Native detection
  for (const indicator of REACT_NATIVE_INDICATORS) {
    if (await fileExists(cwd, indicator)) {
      scores["react-native"] += 1;
    }
  }
  // Check if package.json contains React Native
  try {
    const packageJson = await readFile(resolve(cwd, "package.json"), "utf-8");
    if (packageJson.includes("react-native")) {
      scores["react-native"] += 3;
    }
  } catch {
    // No package.json or can't read it
  }

  // Determine winner
  const maxScore = Math.max(...Object.values(scores));
  const platform = (Object.keys(scores).find(
    (key) => scores[key as MobilePlatform] === maxScore && maxScore > 0
  ) as MobilePlatform) || "unknown";

  // Determine stack and build system
  let stack: MobileStack = "unknown";
  let buildSystem = "unknown";
  let language = "unknown";

  if (platform === "ios") {
    stack = "swiftui"; // Default to SwiftUI for iOS
    buildSystem = "Tuist"; // Default to Tuist
    language = "Swift";

    // Check for UIKit vs SwiftUI
    if (await hasSwiftUIFiles(cwd)) {
      stack = "swiftui";
    } else if (await hasUIKitFiles(cwd)) {
      stack = "uikit";
    }

    // Check for Xcode vs Tuist
    if (await hasXcodeProject(cwd)) {
      buildSystem = "Xcode";
    }
  } else if (platform === "android") {
    stack = "jetpack-compose"; // Default to Compose
    buildSystem = "Gradle";
    language = "Kotlin";

    if (!(await hasComposeFiles(cwd))) {
      stack = "unknown"; // Might be traditional XML views
    }
  } else if (platform === "flutter") {
    stack = "flutter";
    buildSystem = "Flutter";
    language = "Dart";
  } else if (platform === "react-native") {
    stack = "react-native";
    buildSystem = "React Native CLI";
    language = "JavaScript/TypeScript";
  }

  // Check for Metal shaders
  const metalShaders = platform === "ios" && (await hasMetalShaders(cwd));

  // Check for test presence
  const hasTests = await hasTestFiles(cwd, platform);

  // Confidence score (0-1)
  const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0;

  return {
    platform,
    stack,
    buildSystem,
    language,
    hasTests,
    metalShaders,
    confidence,
  };
}

async function fileExists(cwd: string, pattern: string): Promise<boolean> {
  try {
    const { glob } = await import("glob");
    const matches = await glob(pattern, { cwd, dot: true });
    return matches.length > 0;
  } catch {
    return false;
  }
}

async function hasSwiftUIFiles(cwd: string): Promise<boolean> {
  const { glob } = await import("glob");
  try {
    const matches = await glob("**/*.swift", { cwd });
    for (const file of matches) {
      const content = await readFile(resolve(cwd, file), "utf-8");
      if (content.includes("import SwiftUI") || content.includes("View")) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function hasUIKitFiles(cwd: string): Promise<boolean> {
  const { glob } = await import("glob");
  try {
    const matches = await glob("**/*.swift", { cwd });
    for (const file of matches) {
      const content = await readFile(resolve(cwd, file), "utf-8");
      if (content.includes("import UIKit") || content.includes("UIViewController")) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function hasXcodeProject(cwd: string): Promise<boolean> {
  return await fileExists(cwd, "*.xcodeproj") || await fileExists(cwd, "*.xcworkspace");
}

async function hasComposeFiles(cwd: string): Promise<boolean> {
  const { glob } = await import("glob");
  try {
    const matches = await glob("**/*.kt", { cwd });
    for (const file of matches) {
      const content = await readFile(resolve(cwd, file), "utf-8");
      if (content.includes("@Composable") || content.includes("Compose")) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function hasMetalShaders(cwd: string): Promise<boolean> {
  return await fileExists(cwd, "**/*.metal");
}

async function hasTestFiles(cwd: string, platform: MobilePlatform): Promise<boolean> {
  if (platform === "ios") {
    return await fileExists(cwd, "**/*Test*.swift") || await fileExists(cwd, "**/*Tests.swift");
  } else if (platform === "android") {
    return await fileExists(cwd, "**/*Test.kt") || await fileExists(cwd, "src/androidTest/**/*.kt");
  } else if (platform === "flutter") {
    return await fileExists(cwd, "**/*_test.dart");
  } else if (platform === "react-native") {
    return await fileExists(cwd, "**/*.test.ts") || await fileExists(cwd, "**/*.test.tsx");
  }
  return false;
}