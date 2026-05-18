# adp(1) bash completion
#
# Install:
#   adp completions bash > /usr/local/etc/bash_completion.d/adp   # Homebrew
#   adp completions bash > /etc/bash_completion.d/adp             # system-wide
#   eval "$(adp completions bash)"                                 # inline (per-shell)

_adp_features() {
  if [[ -d .specs/features ]]; then
    local features
    features=$(command ls -1 .specs/features 2>/dev/null)
    COMPREPLY=( $(compgen -W "$features" -- "$cur") )
  fi
}

_adp_templates() {
  local skill_dir="$HOME/.claude/skills/adp/templates/workflows"
  if [[ -d "$skill_dir" ]]; then
    local names
    names=$(command ls -1 "$skill_dir" 2>/dev/null | sed 's/\.md$//')
    COMPREPLY=( $(compgen -W "$names" -- "$cur") )
  fi
}

_adp() {
  local cur prev words cword
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  words=("${COMP_WORDS[@]}")
  cword=$COMP_CWORD

  local commands="init map feature run auto-mode validate verify evaluate \
pause resume status usage sensors guides tui dashboard \
design templates worktree update uninstall \
start sprint:start sprint:end log help completions"

  # First positional → top-level command
  if [[ $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  local cmd="${COMP_WORDS[1]}"

  # Global flag completion
  case "$prev" in
    --cwd)
      COMPREPLY=( $(compgen -d -- "$cur") )
      return
      ;;
    --branch)
      # Best-effort: list local git branches
      if command -v git >/dev/null 2>&1; then
        local branches
        branches=$(git branch --format='%(refname:short)' 2>/dev/null)
        COMPREPLY=( $(compgen -W "$branches" -- "$cur") )
      fi
      return
      ;;
    --complexity|-c)
      COMPREPLY=( $(compgen -W "small medium large complex" -- "$cur") )
      return
      ;;
  esac

  case "$cmd" in
    design)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "extract show intake run" -- "$cur") )
      elif [[ $cword -eq 3 ]]; then
        _adp_features
      fi
      ;;
    templates)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "list show use" -- "$cur") )
      elif [[ $cword -eq 3 && ( "${COMP_WORDS[2]}" == "show" || "${COMP_WORDS[2]}" == "use" ) ]]; then
        _adp_templates
      elif [[ $cword -eq 4 && "${COMP_WORDS[2]}" == "use" ]]; then
        _adp_features
      fi
      ;;
    worktree)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "list clean add remove" -- "$cur") )
      fi
      ;;
    run|validate|start|resume)
      if [[ $cword -eq 2 ]]; then
        _adp_features
      fi
      ;;
    auto-mode)
      if [[ $cword -eq 2 ]]; then
        _adp_features
      fi
      ;;
    completions)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") )
      fi
      ;;
    update)
      COMPREPLY=( $(compgen -W "--branch --cwd" -- "$cur") )
      ;;
    uninstall)
      COMPREPLY=( $(compgen -W "-y --yes --cwd" -- "$cur") )
      ;;
    feature)
      # Free-form text after `feature`; only flag completion is useful.
      COMPREPLY=( $(compgen -W "--complexity -c --cwd" -- "$cur") )
      ;;
    *)
      # Generic: offer --cwd everywhere.
      COMPREPLY=( $(compgen -W "--cwd" -- "$cur") )
      ;;
  esac
}

complete -F _adp adp
