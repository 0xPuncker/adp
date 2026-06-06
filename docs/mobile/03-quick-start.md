# ADP Mobile — Ready for Use

## Generic Mobile Development Methodology

A complete, platform-agnostic mobile development pipeline that works for **any iOS or Android project**.

## Quick Start

```bash
# For any mobile project
cd your-mobile-project
adp mobile init

# ADP will auto-detect your platform:
# ✅ iOS (Swift, SwiftUI, UIKit)
# ✅ Android (Kotlin, Jetpack Compose)
# ✅ Cross-platform (Flutter, React Native)
```

## What Makes This Generic

### 1. **Platform Auto-Detection**
ADP automatically detects your mobile platform by analyzing project files:

- **iOS**: `Package.swift`, `Project.swift`, `*.xcodeproj`, `Info.plist`
- **Android**: `build.gradle.kts`, `build.gradle`, `AndroidManifest.xml`
- **Flutter**: `pubspec.yaml`
- **React Native**: `package.json` with React Native dependencies

### 2. **Platform-Specific Sensors**
Each platform gets optimized sensors:

**iOS:**
```yaml
sensors:
  compile: tuist build --target {APP_NAME}
  swiftlint: swiftlint lint --strict
  test: tuist test --test-targets {TEST_TARGETS}
  metal: python Scripts/validate_metal.py  # if present
```

**Android:**
```yaml
sensors:
  compile: ./gradlew assembleDebug
  detekt: ./gradlew detekt
  test: ./gradlew test
  android_test: ./gradlew connectedAndroidTest
  lint: ./gradlew lint
```

**Flutter:**
```yaml
sensors:
  analyze: flutter analyze
  test: flutter test
  build: flutter build apk
  ios_build: flutter build ios
```

### 3. **Universal Mobile Quality Criteria**
All platforms share the same quality standards:

| Criterion | iOS | Android | Cross-Platform |
|-----------|-----|---------|----------------|
| **correctness** (90) | Feature works | Feature works | Feature works |
| **completeness** (85) | All REQs met | All REQs met | All REQs met |
| **code_quality** (85) | Clean Swift | Clean Kotlin | Clean code |
| **test_coverage** (90) | XCTest + UI | JUnit + Espresso | Framework tests |
| **mobile_ui** (88) | SwiftUI patterns | Compose patterns | Framework patterns |
| **performance** (82) | 60fps, no blocking | 60fps, no ANR | 60fps, smooth |
| **security** (85) | Keychain, no secrets | Keystore, no secrets | Secure storage |
| **accessibility** (80) | VoiceOver, Dynamic Type | TalkBack, font scaling | Screen readers |

### 4. **Universal Mobile Patterns**

Patterns that work across all platforms:

- **Feature-based organization** — Each feature is self-contained
- **State management** — Centralized with reactive UI
- **Loading states** — Loading/content/error states
- **Offline support** — Caching and retry logic
- **Lifecycle handling** — Proper pause/resume
- **Accessibility** — Screen reader support
- **Performance** — 60fps target, no blocking
- **Security** — No secrets, secure storage

## Mobile Workflow Templates

### Available Templates

```bash
adp mobile templates list
# mobile-feature      — Multi-screen feature
# mobile-screen       — Single screen
# mobile-animation    — Animation/transition
# mobile-platform     — Platform integration
```

### Quick Usage

```bash
# Start a mobile feature
adp mobile run "user authentication"

# Use a template
adp mobile templates use mobile-feature "user profile"
adp mobile templates use mobile-screen "settings screen"
```

## Platform Examples

### iOS Project Example

```bash
cd MyiOSApp
adp mobile init

# ADP detects iOS and creates:
# .adp/
# ├── harness.yaml          # iOS sensors
# └── guides/
#     ├── mobile-stack.md   # SwiftUI, TCA, Tuist
#     ├── ios-architecture.md
#     ├── ios-conventions.md
#     ├── ios-testing.md
#     └── ios-security.md
```

### Android Project Example

```bash
cd MyAndroidApp
adp mobile init

# ADP detects Android and creates:
# .adp/
# ├── harness.yaml          # Android sensors
# └── guides/
#     ├── mobile-stack.md   # Kotlin, Compose, Gradle
#     ├── android-architecture.md
#     ├── android-conventions.md
#     ├── android-testing.md
#     └── android-security.md
```

### Cross-Platform Example

```bash
cd MyFlutterApp
adp mobile init

# ADP detects Flutter and creates:
# .adp/
# ├── harness.yaml          # Flutter sensors
# └── guides/
#     ├── mobile-stack.md   # Dart, Flutter, widgets
#     ├── flutter-architecture.md
#     ├── mobile-conventions.md
#     ├── mobile-testing.md
#     └── mobile-security.md
```

## Mobile Development Phases

### SPECIFY (Mobile Requirements)

```markdown
### ⭐ REQ-01: {Feature} main screen [MVP]
| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN screen loads THEN show loading state |
| REQ-01.2 | WHEN data loads successfully THEN display content |
| REQ-01.3 | WHEN user taps item THEN navigate to detail |
| REQ-01.4 | WHEN network fails THEN show error with retry |
| REQ-01.5 | WHEN Reduce Motion enabled THEN skip animations |
```

### DESIGN (Mobile Architecture)

**iOS Architecture:**
- Feature-based structure
- MVVM/MVI patterns
- SwiftUI + UIKit integration
- TCA/Combine state management

**Android Architecture:**
- MVVM architecture
- Jetpack Compose UI
- StateFlow/Flow state
- Coroutines for async

**Cross-Platform:**
- Framework-specific architecture
- Platform abstractions
- Shared business logic
- Platform-specific UI

### TASKS (Mobile Implementation)

```markdown
## TASK-01: {Feature} screen scaffold
- [ ] **Requirement:** REQ-01
- [ ] **Files:** app/src/main/java/com/app/features/{Feature}Screen.kt
- [ ] **UI Pattern:** Jetpack Compose with Material 3
- [ ] **Done when:** Screen renders with loading state
- [ ] **Test:** UI test verifies screen elements
```

### EXECUTE (Mobile Sprint)

```markdown
# Sprint 1: TASK-01 {Feature} screen

## What I'll build
{Feature} screen with loading/content/error states

## Files to touch
- `app/src/main/java/com/app/features/{Feature}Screen.kt` — new

## Acceptance criteria
- [ ] WHEN screen loads THEN show loading state
- [ ] WHEN data loads THEN display content
- [ ] WHEN network fails THEN show error with retry

## Requirements traced
REQ-01.1, REQ-01.2, REQ-01.4
```

## Mobile Skills Reference

The methodology includes proven mobile development patterns:

- **Motion & Transitions** — Hero transitions, presentations, navigation
- **SwiftUI Animation** — Spring animations, phase animators, symbol effects
- **Metal Shaders** — GPU effects, particle systems, optimization
- **Mobile UI Patterns** — Design systems, components, accessibility

Located in: `.adp/guides/mobile/skills-reference/`

## Benefits

### For Development Teams

1. **Consistent Quality** — Same standards across all mobile projects
2. **Faster Development** — Autonomous execution of mobile tasks
3. **Platform Expertise** — Built-in mobile development patterns
4. **Quality Gates** — Mobile-specific sensors and evaluators
5. **Workflow Templates** — Quick start for common mobile tasks

### For Code Quality

1. **Mobile-Normalized** — All projects follow mobile best practices
2. **Platform-Optimized** — Sensors and evaluators tuned for each platform
3. **Performance Focused** — 60fps target, memory efficiency
4. **Accessibility First** — Screen readers, dynamic type, reduce motion
5. **Security Aware** — No secrets, secure storage, encrypted data

### For Project Management

1. **Predictable Pipeline** — Same phases for all mobile features
2. **Traceable Requirements** — REQ → Task → Commit → Validation
3. **Quality Metrics** — Sprint scores, evaluator feedback
4. **Risk Reduction** — Automated quality gates catch issues early
5. **Documentation** — Auto-generated guides and contracts

## Implementation Status

✅ **Complete and Ready for Use**

- Generic mobile methodology
- Platform auto-detection
- Platform-specific sensors
- Universal mobile quality criteria
- Mobile workflow templates
- Universal mobile patterns
- Platform-specific patterns

## Next Steps

1. **Try it on a mobile project**
   ```bash
   cd your-mobile-project
   adp mobile init
   ```

2. **Generate mobile guides**
   ```bash
   adp mobile map
   ```

3. **Run a mobile feature**
   ```bash
   adp mobile run "your feature"
   ```

4. **Verify code quality**
   ```bash
   adp mobile verify
   ```

## Files Created

- `MOBILE_ADAPTATION.md` — Complete mobile methodology
- `MOBILE_STRATEGY_SUMMARY.md` — Implementation overview
- `README_MOBILE.md` — This quick start guide
- `.adp/guides/mobile/skills-reference/` — Mobile development patterns

---

**Ready to use for any iOS or Android project!** 🚀