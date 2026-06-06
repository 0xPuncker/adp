---
name: mobile-feature
description: Multi-screen mobile feature with navigation and platform UI patterns
complexity: medium
---

# {Feature Name}

## Complexity
Medium — Multi-screen feature with navigation, platform UI patterns, and standard mobile state management

## Requirements

### ⭐ REQ-01: Main screen [MVP]
**User Story:** As a user, I want to view {feature content}, so that I can {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN screen loads THEN show loading state |
| REQ-01.2 | WHEN data loads successfully THEN display {content} |
| REQ-01.3 | WHEN network fails THEN show error state with retry button |
| REQ-01.4 | WHEN user pulls to refresh THEN reload data |
| REQ-01.5 | WHEN device rotates THEN layout adapts to orientation |

### ⭐ REQ-02: Navigation [MVP]
**User Story:** As a user, I want to navigate to {detail}, so that I can {action}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN user taps {item} THEN navigate to detail screen |
| REQ-02.2 | WHEN user navigates back THEN return to previous screen |
| REQ-02.3 | WHEN deep link opens {detail} THEN navigate directly to detail |

### ⭐ REQ-03: State management [MVP]
**User Story:** As the system, I need to manage {feature} state, so that UI reflects current state.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN state updates THEN UI reflects changes immediately |
| REQ-03.2 | WHEN screen disappears THEN state is persisted |
| REQ-03.3 | WHEN user returns THEN cached data displays first |

### ⭐ REQ-04: Accessibility [P1]
**User Story:** As a user with accessibility needs, I want to use {feature}, so that I can {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | WHEN VoiceOver/TalkBack enabled THEN all elements have labels |
| REQ-04.2 | WHEN Dynamic Type enabled THEN text scales appropriately |
| REQ-04.3 | WHEN high contrast enabled THEN colors remain readable |
| REQ-04.4 | WHEN Reduce Motion enabled THEN skip animations