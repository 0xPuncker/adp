#compdef adp
#
# adp(1) zsh completion
#
# Install:
#   adp completions zsh > "${fpath[1]}/_adp"     # standard fpath
#   adp completions zsh > ~/.zfunc/_adp           # then add to fpath in .zshrc:
#                                                 #   fpath=(~/.zfunc $fpath)
#   autoload -U compinit && compinit              # reload completion cache

_adp_features() {
  local -a features
  if [[ -d .specs/features ]]; then
    features=( .specs/features/*(/N:t) )
  fi
  _describe -t features 'feature slug' features
}

_adp_templates() {
  local skill_dir="$HOME/.claude/skills/adp/templates/workflows"
  local -a templates
  if [[ -d "$skill_dir" ]]; then
    templates=( $skill_dir/*.md(.N:t:r) )
  fi
  _describe -t templates 'workflow template' templates
}

_adp() {
  local context state line
  typeset -A opt_args

  local -a commands
  commands=(
    'init:Detect stack, scaffold .adp/ and .specs/'
    'map:Analyze codebase, generate feedforward guides'
    'feature:Create feat/<slug>, seed spec, start Specify'
    'run:Execute Specify→Design→Tasks→Execute pipeline (skill)'
    'auto-mode:Maximum-autonomy variant of run (skill)'
    'validate:Run sensors + DAG validation on tasks.md'
    'verify:Run all sensors and report pass/fail'
    'evaluate:Retroactively score unscored sprints'
    'pause:Snapshot progress to HANDOFF.md (skill)'
    'resume:Continue from HANDOFF.md snapshot (skill)'
    'status:Pipeline state, sprints, scores, token usage'
    'usage:Token breakdown and cost estimate'
    'sensors:Run harness sensors and report'
    'guides:List loaded guides with token counts'
    'tui:Launch interactive TUI'
    'dashboard:Alias for tui'
    'design:extract | show | intake | run — tokens + components'
    'templates:list | show | use — workflow templates'
    'worktree:list | clean | add | remove — sprint worktrees'
    'update:Re-run installer to upgrade'
    'uninstall:Remove skill files and CLI'
    'start:Start the pipeline for a feature'
    'sprint\:start:Mark a sprint started'
    'sprint\:end:Mark a sprint completed with score'
    'log:Append a message to the activity log'
    'help:Show usage'
    'completions:Print shell completion script (bash|zsh|fish)'
  )

  _arguments -C \
    '--cwd[Target project directory]:directory:_directories' \
    '1: :->command' \
    '*:: :->args'

  case "$state" in
    command)
      _describe -t commands 'adp command' commands
      ;;
    args)
      case "${line[1]}" in
        design)
          if (( CURRENT == 2 )); then
            _values 'subcommand' \
              'extract[Extract tokens + components]' \
              'show[Display the design bundle]' \
              'intake[Parse Claude Design handoff from stdin]' \
              'run[Start design-first pipeline]'
          elif (( CURRENT == 3 )); then
            _adp_features
          fi
          ;;
        templates)
          if (( CURRENT == 2 )); then
            _values 'subcommand' \
              'list[List available templates]' \
              'show[Display a template]' \
              'use[Scaffold spec from template]'
          elif (( CURRENT == 3 )) && [[ "${line[2]}" == (show|use) ]]; then
            _adp_templates
          elif (( CURRENT == 4 )) && [[ "${line[2]}" == "use" ]]; then
            _adp_features
          fi
          ;;
        worktree)
          if (( CURRENT == 2 )); then
            _values 'subcommand' \
              'list[List active worktrees]' \
              'clean[Remove all sprint worktrees]' \
              'add[Create worktree for sprint N]' \
              'remove[Remove worktree for sprint N]'
          fi
          ;;
        run|validate|start|resume|auto-mode)
          if (( CURRENT == 2 )); then
            _adp_features
          fi
          ;;
        completions)
          if (( CURRENT == 2 )); then
            _values 'shell' 'bash' 'zsh' 'fish'
          fi
          ;;
        feature)
          _arguments \
            '--complexity[Feature complexity]:complexity:(small medium large complex)' \
            '-c[Feature complexity]:complexity:(small medium large complex)'
          ;;
        update)
          _arguments \
            '--branch[Install from a specific git branch]:branch:'
          ;;
        uninstall)
          _arguments \
            '-y[Skip confirmation]' \
            '--yes[Skip confirmation]'
          ;;
      esac
      ;;
  esac
}

_adp "$@"
