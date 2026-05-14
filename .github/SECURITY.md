# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✓         |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: puncker.dev@proton.me

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept code
- Any suggested remediation

You will receive an acknowledgement within 48 hours. If confirmed, a fix will be
released within 14 days for critical issues and 30 days for moderate issues.

## Scope

ADP is a CLI tool and Claude Code skill. The primary security surface is:

- **Shell command execution** — ADP runs sensor commands from `harness.yaml` via
  `child_process`. Commands in `harness.yaml` are authored by the repo owner, not
  user-supplied at runtime. Treat your `harness.yaml` as trusted configuration.
- **File system access** — ADP reads and writes to `.adp/`, `.specs/`, and project
  source files within the working directory. It does not traverse outside `cwd`.
- **No network access** — ADP makes no HTTP requests. All Claude AI interaction
  happens through the Claude Code CLI/API, not through ADP itself.
- **No credentials** — ADP does not handle API keys or secrets. Secret scanning
  (`secretlint`) is a sensor that detects credentials in your project, not in ADP.

## Out of Scope

- Vulnerabilities in Claude Code itself (report to Anthropic)
- Issues requiring physical access to the machine
- Social engineering attacks
