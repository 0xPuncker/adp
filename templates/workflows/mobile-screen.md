---
name: mobile-screen
description: Single mobile screen with standard platform patterns
complexity: small
---

# {Screen Name}

## Complexity
Small — Single screen implementation with standard mobile UI patterns

## Requirements

### ⭐ REQ-01: Screen UI [MVP]
**User Story:** As a user, I want to view {screen content}, so that I can {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN screen appears THEN show {content} |
| REQ-01.2 | WHEN data unavailable THEN show empty state |
| REQ-01.3 | WHEN error occurs THEN show error message |

### ⭐ REQ-02: Basic interaction [MVP]
**User Story:** As a user, I want to interact with {screen}, so that I can {action}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN user interacts THEN handle event appropriately |
| REQ-02.2 | WHEN interaction fails THEN show error feedback |
| REQ-02.3 | WHEN loading takes time THEN show loading indicator |

### ⭐ REQ-03: Platform integration [P1]
**User Story:** As the system, I need to follow platform conventions, so that users have consistent experience.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN screen renders THEN follow platform UI guidelines |
| REQ-03.2 | WHEN user navigates away THEN preserve state |
| REQ-03.3 | WHEN device configuration changes THEN handle gracefully |