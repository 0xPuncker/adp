import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { detectMobilePlatform, type MobileProjectInfo } from "./detector.js";
import { generateMobileHarness, getEnabledSensors } from "./sensors.js";
import { getMobileEvaluator } from "./evaluator.js";

/**
 * Mobile ADP initialization.
 * Provides mobile-specific initialization for ADP projects.
 */
export class MobileAdp {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  /**
   * Initialize mobile ADP for the current project.
   * Detects platform, creates mobile harness, and sets up mobile guides.
   */
  async initialize(): Promise<MobileProjectInfo> {
    // Detect mobile platform
    const projectInfo = await detectMobilePlatform(this.cwd);

    if (projectInfo.platform === "unknown") {
      throw new Error("No mobile platform detected. This doesn't appear to be an iOS/Android/Flutter/React Native project.");
    }

    console.log(`[adp mobile] Detected ${projectInfo.platform} project (${projectInfo.stack} stack)`);

    // Create .adp directory structure
    await this.createAdpStructure();

    // Generate mobile harness.yaml
    await this.generateHarness(projectInfo);

    // Generate mobile-specific guides
    await this.generateGuides(projectInfo);

    // Create mobile-specific templates
    await this.copyMobileTemplates();

    console.log(`[adp mobile] ✅ Mobile ADP initialized for ${projectInfo.platform}`);
    return projectInfo;
  }

  /**
   * Create .adp directory structure for mobile project.
   */
  private async createAdpStructure(): Promise<void> {
    const dirs = [
      ".adp",
      ".adp/guides",
      ".adp/guides/mobile",
      ".specs",
      ".specs/project",
      ".specs/features",
    ];

    for (const dir of dirs) {
      await mkdir(join(this.cwd, dir), { recursive: true });
    }
  }

  /**
   * Generate mobile harness.yaml with platform-specific sensors.
   */
  private async generateHarness(projectInfo: MobileProjectInfo): Promise<void> {
    // Default app name - user can customize
    const appName = "MyApp";
    const testTargets = "MyAppTests";

    const harness = generateMobileHarness(projectInfo.platform, appName, testTargets);
    const harnessPath = resolve(this.cwd, ".adp", "harness.yaml");
    await writeFile(harnessPath, harness, "utf-8");
  }

  /**
   * Generate mobile-specific guides based on detected platform.
   */
  private async generateGuides(projectInfo: MobileProjectInfo): Promise<void> {
    const guidesDir = resolve(this.cwd, ".adp", "guides", "mobile");

    // Generate platform-specific guides
    switch (projectInfo.platform) {
      case "ios":
        await this.generateIOSGuides(guidesDir, projectInfo);
        break;
      case "android":
        await this.generateAndroidGuides(guidesDir, projectInfo);
        break;
      case "flutter":
        await this.generateFlutterGuides(guidesDir, projectInfo);
        break;
      case "react-native":
        await this.generateReactNativeGuides(guidesDir, projectInfo);
        break;
    }
  }

  /**
   * Generate iOS-specific guides.
   */
  private async generateIOSGuides(
    guidesDir: string,
    projectInfo: MobileProjectInfo
  ): Promise<void> {
    const guides = [
      { name: "mobile-stack.md", content: this.getIOSStackGuide(projectInfo) },
      { name: "ios-architecture.md", content: this.getIOSArchitectureGuide() },
      { name: "ios-conventions.md", content: this.getIOSConventionsGuide() },
      { name: "ios-testing.md", content: this.getIOSTestingGuide() },
      { name: "ios-integrations.md", content: this.getIOSIntegrationsGuide() },
      { name: "ios-concerns.md", content: this.getIOSConcernsGuide() },
      { name: "ios-security.md", content: this.getIOSSecurityGuide() },
    ];

    for (const guide of guides) {
      await writeFile(join(guidesDir, guide.name), guide.content, "utf-8");
    }
  }

  /**
   * Generate Android-specific guides.
   */
  private async generateAndroidGuides(
    guidesDir: string,
    projectInfo: MobileProjectInfo
  ): Promise<void> {
    const guides = [
      { name: "mobile-stack.md", content: this.getAndroidStackGuide(projectInfo) },
      { name: "android-architecture.md", content: this.getAndroidArchitectureGuide() },
      { name: "android-conventions.md", content: this.getAndroidConventionsGuide() },
      { name: "android-testing.md", content: this.getAndroidTestingGuide() },
      { name: "android-integrations.md", content: this.getAndroidIntegrationsGuide() },
      { name: "android-concerns.md", content: this.getAndroidConcernsGuide() },
      { name: "android-security.md", content: this.getAndroidSecurityGuide() },
    ];

    for (const guide of guides) {
      await writeFile(join(guidesDir, guide.name), guide.content, "utf-8");
    }
  }

  /**
   * Generate Flutter-specific guides.
   */
  private async generateFlutterGuides(
    guidesDir: string,
    projectInfo: MobileProjectInfo
  ): Promise<void> {
    const guides = [
      { name: "mobile-stack.md", content: this.getFlutterStackGuide(projectInfo) },
      { name: "flutter-architecture.md", content: this.getFlutterArchitectureGuide() },
      { name: "mobile-conventions.md", content: this.getFlutterConventionsGuide() },
      { name: "mobile-testing.md", content: this.getFlutterTestingGuide() },
      { name: "mobile-integrations.md", content: this.getFlutterIntegrationsGuide() },
      { name: "mobile-concerns.md", content: this.getFlutterConcernsGuide() },
      { name: "mobile-security.md", content: this.getFlutterSecurityGuide() },
    ];

    for (const guide of guides) {
      await writeFile(join(guidesDir, guide.name), guide.content, "utf-8");
    }
  }

  /**
   * Generate React Native-specific guides.
   */
  private async generateReactNativeGuides(
    guidesDir: string,
    projectInfo: MobileProjectInfo
  ): Promise<void> {
    const guides = [
      { name: "mobile-stack.md", content: this.getReactNativeStackGuide(projectInfo) },
      { name: "react-native-architecture.md", content: this.getReactNativeArchitectureGuide() },
      { name: "mobile-conventions.md", content: this.getReactNativeConventionsGuide() },
      { name: "mobile-testing.md", content: this.getReactNativeTestingGuide() },
      { name: "mobile-integrations.md", content: this.getReactNativeIntegrationsGuide() },
      { name: "mobile-concerns.md", content: this.getReactNativeConcernsGuide() },
      { name: "mobile-security.md", content: this.getReactNativeSecurityGuide() },
    ];

    for (const guide of guides) {
      await writeFile(join(guidesDir, guide.name), guide.content, "utf-8");
    }
  }

  /**
   * Copy mobile workflow templates to templates directory.
   */
  private async copyMobileTemplates(): Promise<void> {
    const templatesDir = resolve(this.cwd, "templates", "workflows");
    await mkdir(templatesDir, { recursive: true });

    // Templates are already created in the project
    // This method ensures they exist in the right location
  }

  // ─── Guide Content Generators ────────────────────────────────────

  private getIOSStackGuide(projectInfo: MobileProjectInfo): string {
    return `# iOS Mobile Stack

## Platform Detection
- **Platform**: iOS
- **Stack**: ${projectInfo.stack}
- **Build System**: ${projectInfo.buildSystem}
- **Language**: ${projectInfo.language}

## Frameworks & Tools
- **SwiftUI** (if using SwiftUI stack)
- **UIKit** (if using UIKit stack)
- **TCA/Combine** (state management)
- **Tuist/Xcode** (build system)

## Development Commands
- Build: \`tuist build\` or \`xcodebuild\`
- Test: \`tuist test\` or \`xcodebuild test\`
- Lint: \`swiftlint\`

## Architecture
- Feature-based module organization
- MVVM/MVI patterns
- SwiftUI or UIKit for UI layer
- Platform-specific navigation patterns

## Key Constraints
- iOS deployment target
- Memory and performance limits
- App Store guidelines
- Apple Human Interface Guidelines

## Testing Strategy
- Unit tests with XCTest
- UI tests with XCUITest
- Snapshot tests for UI regression
- Performance tests with Instruments

## Mobile-Specific Considerations
- 60fps UI performance target
- Accessibility (VoiceOver, Dynamic Type)
- Memory management (no leaks)
- Background/foreground lifecycle
- iOS-specific patterns and conventions
`;
  }

  private getAndroidStackGuide(projectInfo: MobileProjectInfo): string {
    return `# Android Mobile Stack

## Platform Detection
- **Platform**: Android
- **Stack**: ${projectInfo.stack}
- **Build System**: ${projectInfo.buildSystem}
- **Language**: ${projectInfo.language}

## Frameworks & Tools
- **Jetpack Compose** (if using Compose stack)
- **Kotlin Coroutines/Flow** (async and state)
- **Gradle** (build system)
- **AndroidX** libraries

## Development Commands
- Build: \`./gradlew assembleDebug\`
- Test: \`./gradlew test\`
- Lint: \`./gradlew lint\` + \`detekt\`

## Architecture
- MVVM architecture with ViewModels
- Jetpack Compose for UI
- StateFlow/Flow for reactive state
- Repository pattern for data

## Key Constraints
- Android API levels
- Memory and battery constraints
- Google Play guidelines
- Material Design guidelines

## Testing Strategy
- Unit tests with JUnit
- Instrumentation tests with Espresso
- Compose testing for UI
- Android Profiler for performance

## Mobile-Specific Considerations
- 60fps UI performance target
- Accessibility (TalkBack, font scaling)
- Memory leaks and ANR prevention
- Activity/Fragment lifecycle
- Android-specific patterns and conventions
`;
  }

  private getFlutterStackGuide(projectInfo: MobileProjectInfo): string {
    return `# Flutter Mobile Stack

## Platform Detection
- **Platform**: Flutter (cross-platform)
- **Stack**: ${projectInfo.stack}
- **Build System**: ${projectInfo.buildSystem}
- **Language**: ${projectInfo.language}

## Frameworks & Tools
- **Flutter SDK**
- **Dart language**
- **pubspec.yaml** for dependencies
- **Platform channels** for native features

## Development Commands
- Analyze: \`flutter analyze\`
- Test: \`flutter test\`
- Build: \`flutter build apk\` / \`flutter build ios\`

## Architecture
- Widget-based UI composition
- Provider/Riverpod for state management
- Platform channel for native integrations
- Repository pattern for data

## Key Constraints
- Flutter SDK version
- Platform-specific constraints
- Cross-platform performance tradeoffs
- Material Design (Android) and Cupertino (iOS)

## Testing Strategy
- Widget tests for UI components
- Unit tests for business logic
- Integration tests for flows
- Platform-specific testing

## Mobile-Specific Considerations
- 60fps target with potential cross-platform overhead
- Accessibility for both platforms
- Memory efficiency across platforms
- Platform-specific optimizations
- Flutter-specific patterns and conventions
`;
  }

  private getReactNativeStackGuide(projectInfo: MobileProjectInfo): string {
    return `# React Native Mobile Stack

## Platform Detection
- **Platform**: React Native (cross-platform)
- **Stack**: ${projectInfo.stack}
- **Build System**: ${projectInfo.buildSystem}
- **Language**: ${projectInfo.language}

## Frameworks & Tools
- **React Native CLI or Expo**
- **JavaScript/TypeScript**
- **package.json** for dependencies
- **Native modules** for platform features

## Development Commands
- Start: \`npm start\`
- Test: \`npm test\`
- Build: \`npm run android\` / \`npm run ios\`

## Architecture
- Component-based UI (React components)
- Hooks/context for state management
- Navigation library for routing
- Platform-specific native modules

## Key Constraints
- React Native version
- Platform SDK requirements
- JavaScript bridge limitations
- Cross-platform UI considerations

## Testing Strategy
- Jest for unit tests
- React Native Testing Library
- Detox for end-to-end tests
- Platform-specific instrumentation tests

## Mobile-Specific Considerations
- 60fps target with bridge overhead
- Accessibility for both platforms
- JavaScript memory management
- Platform-specific native modules
- React Native-specific patterns and conventions
`;
  }

  // Placeholder guide generators - these would be implemented with actual content
  private getIOSArchitectureGuide(): string { return this.getPlaceholderGuide("iOS Architecture", "MVVM, TCA, SwiftUI patterns, feature organization"); }
  private getIOSConventionsGuide(): string { return this.getPlaceholderGuide("iOS Conventions", "Naming, file structure, Swift patterns, error handling"); }
  private getIOSTestingGuide(): string { return this.getPlaceholderGuide("iOS Testing", "XCTest, XCUITest, snapshot tests, performance testing"); }
  private getIOSIntegrationsGuide(): string { return this.getPlaceholderGuide("iOS Integrations", "Firebase, networking, platform APIs, third-party SDKs"); }
  private getIOSConcernsGuide(): string { return this.getPlaceholderGuide("iOS Concerns", "Performance hotspots, memory leaks, known issues"); }
  private getIOSSecurityGuide(): string { return this.getPlaceholderGuide("iOS Security", "Keychain, secrets, App Transport Security, code signing"); }

  private getAndroidArchitectureGuide(): string { return this.getPlaceholderGuide("Android Architecture", "MVVM, ViewModels, Jetpack Compose, clean architecture"); }
  private getAndroidConventionsGuide(): string { return this.getPlaceholderGuide("Android Conventions", "Kotlin naming, file structure, Gradle patterns, error handling"); }
  private getAndroidTestingGuide(): string { return this.getPlaceholderGuide("Android Testing", "JUnit, Espresso, Compose testing, instrumentation tests"); }
  private getAndroidIntegrationsGuide(): string { return this.getPlaceholderGuide("Android Integrations", "Firebase, Play Services, networking, third-party libraries"); }
  private getAndroidConcernsGuide(): string { return this.getPlaceholderGuide("Android Concerns", "ANRs, memory leaks, battery optimization, fragmentation"); }
  private getAndroidSecurityGuide(): string { return this.getPlaceholderGuide("Android Security", "Keystore, permissions, ProGuard, network security"); }

  private getFlutterArchitectureGuide(): string { return this.getPlaceholderGuide("Flutter Architecture", "Widget composition, state management, repository pattern, platform channels"); }
  private getFlutterConventionsGuide(): string { return this.getPlaceholderGuide("Flutter Conventions", "Dart naming, file structure, widget patterns, async patterns"); }
  private getFlutterTestingGuide(): string { return this.getPlaceholderGuide("Flutter Testing", "Widget tests, unit tests, integration tests, golden tests"); }
  private getFlutterIntegrationsGuide(): string { return this.getPlaceholderGuide("Flutter Integrations", "Firebase plugins, platform channels, package management"); }
  private getFlutterConcernsGuide(): string { return this.getPlaceholderGuide("Flutter Concerns", "Cross-platform performance, widget rebuild optimization, memory management"); }
  private getFlutterSecurityGuide(): string { return this.getPlaceholderGuide("Flutter Security", "secure storage, secrets management, platform security APIs"); }

  private getReactNativeArchitectureGuide(): string { return this.getPlaceholderGuide("React Native Architecture", "Component structure, state management, navigation, native modules"); }
  private getReactNativeConventionsGuide(): string { return this.getPlaceholderGuide("React Native Conventions", "JS/TS naming, component structure, hooks patterns, file organization"); }
  private getReactNativeTestingGuide(): string { return this.getPlaceholderGuide("React Native Testing", "Jest, React Native Testing Library, Detox, platform tests"); }
  private getReactNativeIntegrationsGuide(): string { return this.getPlaceholderGuide("React Native Integrations", "Firebase, native modules, third-party libraries, platform APIs"); }
  private getReactNativeConcernsGuide(): string { return this.getPlaceholderGuide("React Native Concerns", "Bridge performance, memory management, bundle size, platform differences"); }
  private getReactNativeSecurityGuide(): string { return this.getPlaceholderGuide("React Native Security", "secure storage, secrets management, platform security APIs"); }

  private getPlaceholderGuide(title: string, topics: string): string {
    return `# ${title}

> **Auto-generated guide** — This guide was created during \`adp mobile init\`.
> Run \`adp mobile map\` to analyze the codebase and populate this guide with actual project patterns.

## Topics Covered
${topics.split(", ").map(t => `- ${t.trim()}`).join("\n")}

## How to Update
1. Analyze the codebase for actual patterns
2. Document findings with file:line references
3. Update this guide with concrete examples
4. Keep it concise — under 200 lines

## Current Status
This is a placeholder guide. After \`adp mobile map\` runs, this will contain:
- Actual architecture patterns from your codebase
- Real conventions with evidence (file:line references)
- True integrations and dependencies
- Real concerns and hotspots

For now, use this as a starting point for mobile development patterns.
`;
  }
}