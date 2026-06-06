---
name: mobile-platform-integration
description: Platform-specific feature integration (camera, location, notifications, biometrics)
complexity: large
---

# {Platform Feature Name}

## Complexity
Large — Platform-specific API integration with permissions, error handling, and fallbacks

## Requirements

### ⭐ REQ-01: Platform API integration [MVP]
**User Story:** As a user, I want to use {platform feature}, so that I can {benefit}.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-01.1 | WHEN user requests {feature} THEN request necessary permissions |
| REQ-01.2 | WHEN permissions granted THEN successfully use {platform API} |
| REQ-01.3 | WHEN API call succeeds THEN return/process results appropriately |
| REQ-01.4 | WHEN API call fails THEN show user-friendly error message |

### ⭐ REQ-02: Permission handling [MVP]
**User Story:** As a user, I want clear permission requests, so that I understand why permissions are needed.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-02.1 | WHEN permission needed THEN show explanation before requesting |
| REQ-02.2 | WHEN permission denied THEN explain impact and offer retry |
| REQ-02.3 | WHEN permission permanently denied THEN guide user to settings |
| REQ-02.4 | WHEN permission granted AFTER denial THEN feature works immediately |

### ⭐ REQ-03: Error handling [MVP]
**User Story:** As a user, I want helpful error messages, so that I can recover from problems.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-03.1 | WHEN {platform feature} unavailable THEN show appropriate error |
| REQ-03.2 | WHEN hardware missing THEN provide graceful degradation |
| REQ-03.3 | WHEN API fails THEN offer retry or alternative approach |
| REQ-03.4 | WHEN error occurs THEN log details for debugging |

### ⭐ REQ-04: Fallback support [P1]
**User Story:** As a user, I want the app to work even when {platform feature} fails, so that I can still use the app.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-04.1 | WHEN {platform feature} fails THEN core functionality remains available |
| REQ-04.2 | WHEN feature unavailable THEN provide alternative if possible |
| REQ-04.3 | WHEN fallback used THEN clearly indicate to user |

### ⭐ REQ-05: Performance and battery [P1]
**User Story:** As a user, I want efficient platform usage, so that my battery doesn't drain quickly.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-05.1 | WHEN using {platform feature} THEN minimize battery impact |
| REQ-05.2 | WHEN feature not needed THEN release resources properly |
| REQ-05.3 | WHEN usage completes THEN clean up resources promptly |
| REQ-05.4 | WHEN feature runs THEN avoid excessive CPU/network usage |

### ⭐ REQ-06: Privacy and security [P2]
**User Story:** As a user, I want my data protected, so that I can trust the app.

| ID | Acceptance Criteria |
|----|---------------------|
| REQ-06.1 | WHEN accessing sensitive data THEN handle according to platform privacy guidelines |
| REQ-06.2 | WHEN requesting permissions THEN follow platform best practices |
| REQ-06.3 | WHEN handling results THEN store and transmit securely |
| REQ-06.4 | WHEN data collected THEN follow privacy policy requirements |