---
name: mobile-animation
description: Animation or transition implementation for mobile screens
complexity: medium
---

# {Animation Name}

## Complexity
Medium — Platform-specific animation/transition implementation with performance requirements

## Requirements

### ⭐ REQ-01: Animation implementation [MVP]
**User Story:** As a user, I want smooth animations, so that the app feels responsive and polished.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN {trigger} occurs THEN animation plays smoothly |
| REQ-01.2 | WHEN animation plays THEN maintains 60fps |
| REQ-01.3 | WHEN animation completes THEN reaches final state accurately |

### ⭐ REQ-02: Performance [MVP]
**User Story:** As the system, I need animations to be performant, so that UI remains responsive.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN animation runs THEN no frame drops below 60fps |
| REQ-02.2 | WHEN multiple animations run THEN CPU usage remains reasonable |
| REQ-02.3 | WHEN animation starts THEN no visible lag or jank |

### ⭐ REQ-03: Accessibility [P1]
**User Story:** As a user with motion sensitivity, I need reduced animation, so that I can use the app comfortably.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN Reduce Motion enabled THEN skip or simplify animations |
| REQ-03.2 | WHEN animation reduced THEN functionality still works |
| REQ-03.3 | WHEN user changes motion settings THEN animation behavior updates immediately |

### ⭐ REQ-04: Platform consistency [P2]
**User Story:** As a user, I want animations to feel native, so that the app fits platform expectations.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | WHEN animation plays THEN follow platform timing curves |
| REQ-04.2 | WHEN transition occurs THEN use platform-appropriate transition style |
| REQ-04.3 | WHEN animation interrupts THEN follows platform interruption behavior |