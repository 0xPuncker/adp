# Context: installer-cross-platform

## Clarifications resolved

1. **Distribution model:** Both Node-based default + optional standalone binary
   for systems without Node (1c). The Node path is the primary recommendation;
   the standalone is for users who don't have Node 22+.

2. **Native Windows:** Add `install.ps1` for first-class PowerShell support (2a).
   Existing `install.sh` continues to work for Git Bash / WSL / Linux / macOS.

3. **Lifecycle commands:** Add `adp update` (re-run installer to upgrade) and
   `adp uninstall` (remove everything cleanly, including skill files) (3a).

4. **Package managers:** Out of scope for this feature (4a). No npm publish,
   Homebrew, Chocolatey, or winget submissions. Install via curl/iwr only.
