# ADP Mobile — Autonomous Development Pipeline for iOS & Android

**Status:** Core methodology for mobile development (iOS & Android)

## Overview

ADP Mobile extends the ADP methodology for native mobile development (iOS & Android). It provides autonomous execution patterns for mobile apps with platform-specific sensors, quality gates, and architectural guidance.

## Supported Platforms

| Platform | Languages | Frameworks | Build Systems |
|----------|-----------|------------|---------------|
| **iOS** | Swift | SwiftUI, UIKit, TCA, Combine | Xcode, Tuist, Swift Package Manager |
| **Android** | Kotlin | Jetpack Compose, Kotlin Coroutines | Gradle, Kotlin Multiplatform |
| **Cross-Platform** | Dart, JavaScript | Flutter, React Native | Platform-specific build tools |

## Platform Detection

ADP Mobile automatically detects the platform by analyzing project files:

**iOS Detection:**
- `Package.swift` (SPM)
- `Project.swift` (Tuist)
- `*.xcodeproj` or `*.xcworkspace`
- `Info.plist` or `AndroidManifest.xml`

**Android Detection:**
- `build.gradle.kts` or `build.gradle`
- `AndroidManifest.xml`
- `app/src/main/` structure

**Cross-Platform Detection:**
- `pubspec.yaml` (Flutter)
- `package.json` with React Native dependencies

## Core Differences from Web ADP

| Aspect | Web ADP | Mobile ADP |
|--------|---------|------------|
| **Primary Stack** | TypeScript/Node, Rust, Python, Go | Swift (iOS), Kotlin (Android), Dart/JS (cross-platform) |
| **Architecture** | Layered (routes, services, db) | Feature-based, MVVM/MVI/Clean Architecture |
| **State Management** | Global stores, context | Redux/TCA (iOS), StateFlow/Flow (Android), providers (cross-platform) |
| **Presentation** | HTTP responses, routing | Navigation, sheets, modals, deep links |
| **Build System** | npm/cargo/pip | Xcode/Tuist (iOS), Gradle (Android), platform-specific |
| **Testing** | Unit/integration tests | Unit, UI, instrumentation, snapshot tests |
| **Deployment** | Containers, serverless | App Store, Play Store, TestFlight, Beta |
| **Sensors** | typecheck, lint, unit tests | Platform compile, lint, unit + UI tests, performance |

## Mobile-Specific ADP Commands

| Command | What it does |
|---------|--------------|
| `adp mobile init` | Initialize mobile project with platform detection |
| `adp mobile map` | Generate mobile-specific guides from codebase |
| `adp mobile run [feature]` | Execute mobile pipeline for a feature |
| `adp mobile verify` | Run all mobile sensors (compile + lint + UI tests) |
| `adp mobile evaluate` | Retroactively score mobile sprints |

---

## adp mobile init

Mobile initialization works like standard ADP but with platform-aware configuration:

### Step 1: Platform Detection

Analyze project files to determine platform(s):

```bash
# iOS detection
if [ -f "Package.swift" ] || [ -f "Project.swift" ] || find . -name "*.xcodeproj" -o -name "*.xcworkspace"; then
    PLATFORM="ios"
fi

# Android detection
if [ -f "build.gradle.kts" ] || [ -f "build.gradle" ] || [ -f "AndroidManifest.xml" ]; then
    PLATFORM="android"
fi

# Cross-platform detection
if [ -f "pubspec.yaml" ]; then
    PLATFORM="flutter"
fi

if [ -f "package.json" ] && grep -q "react-native" package.json; then
    PLATFORM="react-native"
fi
```

### Step 2: Create Mobile-Specific Structure

**iOS Structure (.adp/):**
```
.adp/
├── state.json
├── harness.yaml          # iOS sensors + evaluator
└── guides/
    ├── mobile-stack.md
    ├── ios-architecture.md
    ├── ios-conventions.md
    ├── ios-testing.md
    ├── ios-integrations.md
    ├── ios-concerns.md
    └── ios-security.md
```

**Android Structure (.adp/):**
```
.adp/
├── state.json
├── harness.yaml          # Android sensors + evaluator
└── guides/
    ├── mobile-stack.md
    ├── android-architecture.md
    ├── android-conventions.md
    ├── android-testing.md
    ├── android-integrations.md
    ├── android-concerns.md
    └── android-security.md
```

**Cross-Platform Structure (.adp/):**
```
.adp/
├── state.json
├── harness.yaml          # Multi-platform sensors
└── guides/
    ├── mobile-stack.md
    ├── flutter-architecture.md   # or react-native-architecture.md
    ├── mobile-conventions.md
    ├── mobile-testing.md
    ├── mobile-integrations.md
    ├── mobile-concerns.md
    └── mobile-security.md
```

### Step 3: Generate Platform-Specific harness.yaml

**iOS harness.yaml:**
```yaml
mode: sprint
min_score: 85

sensors:
  compile:
    command: tuist build --target {APP_NAME}
    description: "Compile iOS app with Tuist/Xcode"
  swiftlint:
    command: swiftlint lint --strict
    description: "SwiftLint with strict rules"
  test:
    command: tuist test --test-targets {TEST_TARGETS}
    description: "Run XCTest suite"
  metal:
    command: python Scripts/validate_metal.py
    description: "Validate Metal shaders (if present)"
    enabled: detect_metal_files()
  snapshot:
    command: fastlane snapshot
    description: "UI snapshot tests"
    enabled: has_snapshot_tests()

order: [compile, swiftlint, test, metal, snapshot]

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
  live_test_command: xcrun simctl boot {DEVICE}

autonomy:
  clarify: critical
  output: minimal

actions:
  tuist_generate:
    command: tuist generate
    zone: always_ask
    auto_approve: false
  firebase_deploy:
    command: fastlane testflight
    zone: always_ask
```

**Android harness.yaml:**
```yaml
mode: sprint
min_score: 85

sensors:
  compile:
    command: ./gradlew assembleDebug
    description: "Compile Android APK"
  detekt:
    command: ./gradlew detekt
    description: "Detekt static analysis"
  test:
    command: ./gradlew test
    description: "Run unit tests"
  android_test:
    command: ./gradlew connectedAndroidTest
    description: "Run instrumentation tests"
  lint:
    command: ./gradlew lint
    description: "Android Lint checks"

order: [compile, detekt, test, android_test, lint]

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
  live_test_command: ./gradlew installDebug

autonomy:
  clarify: critical
  output: minimal

actions:
  deploy_play:
    command: fastlane supply
    zone: always_ask
```

**Flutter harness.yaml:**
```yaml
mode: sprint
min_score: 85

sensors:
  analyze:
    command: flutter analyze
    description: "Dart analyzer"
  test:
    command: flutter test
    description: "Run Dart tests"
  build:
    command: flutter build apk
    description: "Build Android APK"
  ios_build:
    command: flutter build ios
    description: "Build iOS app"

order: [analyze, test, build, ios_build]

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
```

### Step 4: Initialize Platform-Specific State

Create `state.json` with mobile context:

```json
{
  "status": "idle",
  "phase": null,
  "feature": null,
  "complexity": null,
  "platform": "ios",  // or "android" or "flutter" or "react-native"
  "sprints": [],
  "activity": [],
  "startedAt": null,
  "blockers": []
}
```

---

## adp mobile map

Generate platform-specific guides by analyzing the mobile codebase.

**iOS Guides Generated:**

### `.adp/guides/mobile-stack.md`
- Platform detection (iOS version, deployment target)
- Language version (Swift version)
- Frameworks (SwiftUI, UIKit, TCA, Combine)
- Build tools (Xcode version, Tuist version, SPM dependencies)
- Key dependencies and their roles
- CI/CD commands (from Xcode Cloud or GitHub Actions)

### `.adp/guides/ios-architecture.md`
- Feature-based module layout
- MVVM/MVI/Clean Architecture patterns
- Dependency direction (which modules import which)
- Data flow (Redux/TCA, StateFlow/Flow)
- Navigation patterns (NavigationStack, deep linking)
- Public API surface per module

### `.adp/guides/ios-conventions.md`
- Naming patterns (PascalCase for types, camelCase for properties)
- File naming (FeatureName.swift, +Feature.swift, +View.swift)
- Import ordering (Foundation, SwiftUI, project modules)
- Error handling patterns (Result types, no force unwraps)
- State management conventions (@State, @Observable, @Shared)
- Export style (public vs internal access control)
- Include `file:line` references for each observation

### `.adp/guides/ios-testing.md`
- Test framework (XCTest, Quick/Nimble)
- Test file location (co-located or separate)
- Mocking/stubbing patterns (dependency injection, protocol-based)
- UI testing (XCUITest, snapshot tests)
- What gets tested (unit, integration, UI, performance)
- Performance testing (Xcode Instruments)

### `.adp/guides/ios-integrations.md`
- External services, APIs, SDKs
- Firebase services (Auth, Analytics, Crashlytics)
- Networking libraries (Alamofire, URLSession)
- Auth/credential mechanisms (Keychain, OAuth)
- Rate limits, retry patterns
- Mock/stub strategies for integration tests

### `.adp/guides/ios-concerns.md`
- Tech debt hotspots, fragile modules
- Known bugs, TODOs, FIXMEs with `file:line`
- Performance hot paths (main thread blocking, memory leaks)
- Risk areas to treat carefully
- Animation performance (60fps target)
- Battery usage concerns

### `.adp/guides/ios-security.md`
- Dependency health (SPM version pinning)
- Secret handling (Keychain, Environment variables)
- Input validation (text fields, network responses)
- App Transport Security (HTTPS only)
- Data encryption (Core Data, Keychain)
- OWASP mobile security (insecure storage, hardcoded keys)
- Certificate pinning
- Biometric authentication

**Android Guides Generated:**

Similar structure but Android-specific:
- `android-architecture.md` (MVVM, Clean Architecture, Jetpack)
- `android-conventions.md` (Kotlin patterns, file naming)
- `android-testing.md` (JUnit, Espresso, instrumentation tests)
- `android-integrations.md` (Firebase, Google Play Services, Retrofit)
- `android-concerns.md` (memory leaks, ANRs, battery optimization)
- `android-security.md` (ProGuard, signing, Keystore, permissions)

---

## adp mobile run [feature]

Execute the full mobile pipeline for a feature. Follows the same phases as web ADP but with mobile-specific implementation patterns.

### Step 0: Load Mobile Context

1. Read `.adp/state.json` with platform context
2. Auto-generate `.specs/project/PROJECT.md` for mobile (see below)
3. Load mobile guides (architecture, conventions, testing)
4. Create feature branch: `feat/mobile-{feature-slug}`

### Step 1: Auto-Size Mobile Complexity

| Scope | Criteria | Phases |
|-------|----------|--------|
| **Small** | Single screen, ≤3 files, no new libs, standard UI | Quick mode |
| **Medium** | Multi-screen feature, <8 tasks, standard navigation | Specify → Execute |
| **Large** | New feature module, 8+ tasks, custom animations | All phases |
| **Complex** | Platform integrations, custom render, complex state | All + platform testing |

### Step 2: SPECIFY (Mobile Requirements)

**Mobile REQ patterns:**

```markdown
### ⭐ REQ-01: {Feature} main screen [MVP]
**User Story:** As a {user type}, I want {action}, so that {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN screen loads THEN show loading state, not blank |
| REQ-01.2 | WHEN data loads successfully THEN display {content} |
| REQ-01.3 | WHEN user taps {item} THEN navigate to detail screen |
| REQ-01.4 | WHEN network fails THEN show error state with retry |
| REQ-01.5 | WHEN user pulls to refresh THEN reload data |
| REQ-01.6 | WHEN device rotates THEN layout adapts to orientation |
| REQ-01.7 | WHEN Reduce Motion enabled THEN skip animations |

### ⭐ REQ-02: {Feature} state management [MVP]
| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN state updates THEN UI reflects changes immediately |
| REQ-02.2 | WHEN screen disappears THEN state is persisted |
| REQ-02.3 | WHEN user returns THEN cached data displays first |

### ⭐ REQ-03: {Feature} accessibility [P1]
| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN VoiceOver enabled THEN all elements have labels |
| REQ-03.2 | WHEN Dynamic Type increased THEN text scales appropriately |
| REQ-03.3 | WHEN high contrast mode enabled THEN colors remain readable |
```

**Mobile-specific considerations:**

- **Lifecycle handling**: Background/foreground transitions, memory pressure
- **Orientation**: Portrait/landscape adaptation
- **Network states**: Offline mode, retry logic, caching
- **Performance**: 60fps UI, no main thread blocking
- **Accessibility**: VoiceOver, Dynamic Type, Reduce Motion
- **Localization**: Text direction, formatting, RTL support

### Step 3: DESIGN (Mobile Architecture)

**Mobile design patterns:**

**iOS Architecture:**
```swift
// Feature-based structure (three-file pattern)
FeatureName/
├── FeatureName.swift              @MainActor enum FeatureName {}
├── FeatureName+Feature.swift      extension FeatureName { @Reducer struct Feature }
└── FeatureName+View.swift         extension FeatureName { struct ContentView: View }
```

**Android Architecture:**
```
feature/
├── model/          (data classes, sealed classes)
├── viewmodel/      (ViewModel with StateFlow)
├── view/           (Composable UI)
└── di/             (dependency injection modules)
```

**Mobile Design Input:**

1. **Navigation Flow** — Screen hierarchy, deep linking, back stack behavior
2. **State Management** — Local vs shared state, persistence strategy
3. **Data Layer** — Repository pattern, caching, offline support
4. **UI Components** — Design system integration, reusable components
5. **Platform Integration** — Camera, location, notifications, biometrics

### Step 4: TASKS (Mobile Implementation)

**Mobile task patterns:**

```markdown
## TASK-01: {Feature} screen scaffold
- [ ] **Requirement:** REQ-01
- [ ] **Files:** app/src/main/java/com/app/features/{Feature}MainActivity.kt
- [ ] **UI Pattern:** Jetpack Compose with Material 3
- [ ] **Done when:** Screen renders without crash, shows loading state
- [ ] **Test:** UI test verifies screen elements

## TASK-02: {Feature} state management
- [ ] **Requirement:** REQ-02
- [ ] **Files:** {Feature}ViewModel.kt, {Feature}State.kt
- [ ] **State Pattern:** StateFlow for UI state, sealed class for states
- [ ] **Done when:** State updates trigger UI re-composition
- [ ] **Test:** Unit test verifies state transitions

## TASK-03: {Feature} accessibility
- [ ] **Requirement:** REQ-03
- [ ] **Files:** {Feature}Screen.kt
- [ ] **Accessibility:** contentDescription, semantics, minTouchTargetSize
- [ ] **Done when:** TalkBack announces all elements, touch targets 48dp+
- [ ] **Test:** Accessibility test verifies labels and contrast
```

### Step 5: EXECUTE (Mobile Sprint Mode)

**Mobile Sprint Contract Example:**

```markdown
# Sprint 2: TASK-02 {Feature} state management

## What I'll build
ViewModel with StateFlow for {feature} screen, sealed class state pattern

## Files to touch
- `app/src/main/java/com/app/features/{feature}/{Feature}ViewModel.kt` — new
- `app/src/main/java/com/app/features/{feature}/{Feature}State.kt` — new
- `app/src/main/java/com/app/features/{feature}/{Feature}Screen.kt` — modify

## State Pattern
- Loading, Success, Error sealed classes
- StateFlow<State> for UI observation
- CoroutineScope for async operations

## Acceptance criteria
- [ ] WHEN ViewModel initializes THEN state is Loading
- [ ] WHEN data loads successfully THEN state is Success(data)
- [ ] WHEN network fails THEN state is Error(message)
- [ ] WHEN screen rotates THEN state is preserved
- [ ] WHEN user navigates away THEN coroutines cancel

## Verification
- Sensor: compile passes (./gradlew assembleDebug)
- Sensor: detekt passes (no warnings)
- Sensor: test passes (unit tests for state transitions)
- Manual: Test on device with rotation and network off

## Requirements traced
REQ-02.1, REQ-02.2, REQ-02.3
```

---

## Mobile Evaluator Criteria

**Platform-agnostic mobile criteria:**

| Criterion | Min Score | What it checks |
|-----------|-----------|----------------|
| **correctness** | 90 | Does the feature actually work as specified? |
| **completeness** | 85 | Are all acceptance criteria met? |
| **code_quality** | 85 | Clean code, follows platform conventions, no anti-patterns? |
| **test_coverage** | 90 | Unit tests + UI tests for critical paths? |
| **mobile_ui** | 88 | Platform UI patterns, navigation, lifecycle handling? |
| **performance** | 82 | 60fps animations, no main thread blocking, memory efficient? |
| **security** | 85 | No secrets in code, proper storage, secure networking? |
| **accessibility** | 80 | VoiceOver/TalkBack, Dynamic Type, Reduce Motion, contrast? |

**iOS-specific sub-criteria:**
- No force unwraps (`!`) or `fatalError()`
- Proper memory management (no retain cycles)
- 60fps animations (Instrument time profiler)
- Metal shader optimization (if applicable)

**Android-specific sub-criteria:**
- No ANRs (Application Not Responding)
- Proper lifecycle handling (onCreate/onDestroy)
- Memory leak detection (LeakCanary)
- ProGuard/R8 configuration

---

## Mobile Workflow Templates

### mobile-feature (Medium)
New feature with multiple screens:

```markdown
# Mobile Feature: {Feature Name}

## Complexity
Medium — 3-5 screens, standard navigation, platform UI patterns

## Requirements
### ⭐ REQ-01: Main screen [MVP]
Standard mobile screen with loading/content/error states

### ⭐ REQ-02: Navigation [MVP]
Platform navigation patterns (NavigationStack/Navigator)

### ⭐ REQ-03: State management [MVP]
Platform state management (StateFlow/Combine/@Shared)

## Tasks
- TASK-01: Main screen scaffold
- TASK-02: State management implementation
- TASK-03: Navigation between screens
- TASK-04: Platform integration (if needed)
- TASK-05: Testing (unit + UI)
```

### mobile-screen (Small)
Single screen implementation:

```markdown
# Mobile Screen: {Screen Name}

## Complexity
Small — Single screen, standard patterns

## Requirements
### ⭐ REQ-01: Screen UI [MVP]
Platform UI with loading/content/error states

### ⭐ REQ-02: Basic interaction [MVP]
User input handling and state updates

## Tasks
- TASK-01: Screen implementation
- TASK-02: State management
- TASK-03: Basic testing
```

### mobile-animation (Medium)
Animation/transition work:

```markdown
# Mobile Animation: {Animation Name}

## Complexity
Medium — Platform-specific animation patterns

## Requirements
### ⭐ REQ-01: Animation implementation [MVP]
Platform animation API (Core Animation/Animation Composable)

### ⭐ REQ-02: Performance [MVP]
60fps target, no frame drops

### ⭐ REQ-03: Accessibility [P1]
Respect Reduce Motion setting

## Tasks
- TASK-01: Animation implementation
- TASK-02: Performance optimization
- TASK-03: Accessibility handling
```

### mobile-platform-integration (Large)
Platform-specific features:

```markdown
# Mobile Platform Integration: {Feature Name}

## Complexity
Large — Platform APIs, permissions, complex integration

## Requirements
### ⭐ REQ-01: Platform API integration [MVP]
Camera, Location, Notifications, Biometrics

### ⭐ REQ-02: Permission handling [MVP]
Runtime permissions, user explanations

### ⭐ REQ-03: Error handling [MVP]
Permission denied, hardware unavailable

## Tasks
- TASK-01: Platform API implementation
- TASK-02: Permission handling
- TASK-03: Error states and fallbacks
- TASK-04: Testing across devices
```

---

## Mobile Action Zones

| Zone | What it covers | Policy |
|------|---------------|--------|
| 🟢 **Free** | File editing, code changes, git commit (local), build/test, platform-specific compile | Run without asking |
| 🟡 **Gated** | Platform project generation (Tuist generate, Gradle sync), simulator/device deployment, TestFlight/Play Store upload, platform tools | Ask once per session OR obeys `auto_approve: true` |
| 🔴 **Always ask** | App Store/Play Store release, production signing, certificate management, deleting production builds, platform service configuration | User must confirm each time |

**Examples:**

```yaml
actions:
  tuist_generate:
    command: tuist generate
    zone: gated
    auto_approve: false

  gradle_sync:
    command: ./gradlew --refresh-dependencies
    zone: gated
    auto_approve: false

  ios_deploy:
    command: fastlane testflight
    zone: always_ask

  android_deploy:
    command: fastlane supply
    zone: always_ask
```

---

## Mobile Testing Strategy

### iOS Testing
- **Unit Tests**: XCTest for business logic, view models, state management
- **UI Tests**: XCUITest for critical user flows
- **Snapshot Tests**: iSnapshot or similar for UI regression
- **Performance Tests**: Xcode Instruments for memory, CPU, animations
- **Accessibility Tests**: Accessibility Inspector + VoiceOver testing

### Android Testing
- **Unit Tests**: JUnit for business logic, view models
- **Instrumentation Tests**: Espresso for UI flows
- **UI Tests**: Compose Testing for Jetpack Compose UIs
- **Performance Tests**: Android Profiler for memory, CPU, network
- **Accessibility Tests**: Accessibility Scanner + TalkBack testing

### Cross-Platform Testing
- **Unit Tests**: Platform-specific test frameworks
- **Widget Tests**: Flutter widget tests, React Native component tests
- **Integration Tests**: Platform-specific end-to-end testing
- **Performance Tests**: Platform profilers

---

## Implementation Status

**Current State:** Generic mobile methodology ready for implementation

**Next Steps:**

1. **Platform Detection Logic** — Implement automatic iOS/Android/cross-platform detection
2. **Mobile Sensors** — Create platform-specific sensor implementations
3. **Mobile Guide Generation** — Build platform-specific guide extractors
4. **Mobile Evaluator** — Implement mobile-specific QA criteria
5. **Mobile Templates** — Create workflow templates for common mobile tasks
6. **Testing** — Validate methodology on sample iOS and Android projects

**Ready to implement:** The methodology is fully specified and ready for implementation as a generic mobile development pipeline.