# adp shell completions

Tab-completion for the `adp` CLI in bash, zsh, and fish. Completes:

- Top-level commands (`init`, `run`, `auto-mode`, …)
- Subcommands (`adp design <Tab>` → `extract show intake run`)
- Feature slugs from `.specs/features/` (`adp run <Tab>`)
- Workflow template names from `~/.claude/skills/adp/templates/workflows/`
- Global flags (`--cwd`, `--branch`, `--complexity`, …)

## Install

The CLI prints the completion script to stdout — redirect or eval it for your shell.

### bash

```bash
# macOS (Homebrew bash-completion):
adp completions bash > "$(brew --prefix)/etc/bash_completion.d/adp"

# Linux (system-wide):
sudo adp completions bash > /etc/bash_completion.d/adp

# Per-shell (no install — re-run on each new shell):
eval "$(adp completions bash)"
```

Start a new shell or `source` the file to activate.

### zsh

```zsh
# Standard fpath (usually a Homebrew or system dir):
adp completions zsh > "${fpath[1]}/_adp"

# Or in a private dir:
mkdir -p ~/.zfunc
adp completions zsh > ~/.zfunc/_adp
# Then in ~/.zshrc:
#   fpath=(~/.zfunc $fpath)
#   autoload -U compinit && compinit
```

Reload compinit (`compinit -u` or open a new shell) to pick up the file.

### fish

```fish
adp completions fish > ~/.config/fish/completions/adp.fish
```

Fish auto-loads completions from that directory — no reload needed.

## Notes

- Feature-slug completion reads `.specs/features/` relative to your **current
  working directory**. Run `adp` from your project root to get feature suggestions.
- Template completion reads from the installed skill directory
  (`~/.claude/skills/adp/templates/workflows/`). If you installed ADP elsewhere,
  the template names won't autocomplete (subcommands still will).
- Some commands listed in completion are skill-only (`run`, `auto-mode`,
  `map`, `pause`, `resume`). Running them via the standalone CLI shows usage
  and tells you to use Claude Code instead — but the names complete for
  muscle-memory reasons.
