# adp(1) fish completion
#
# Install:
#   adp completions fish > ~/.config/fish/completions/adp.fish

function __adp_features
    if test -d .specs/features
        for d in .specs/features/*/
            basename $d
        end
    end
end

function __adp_templates
    set -l skill_dir $HOME/.claude/skills/adp/templates/workflows
    if test -d $skill_dir
        for f in $skill_dir/*.md
            basename $f .md
        end
    end
end

function __adp_needs_subcommand
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 2
end

function __adp_using_subcommand
    set -l cmd (commandline -opc)
    test (count $cmd) -ge 2; and test "$cmd[2]" = "$argv[1]"
end

# Disable file completion by default; we'll opt in per command.
complete -c adp -f

# Top-level commands
complete -c adp -n __fish_use_subcommand -a init       -d 'Detect stack, scaffold .adp/ and .specs/'
complete -c adp -n __fish_use_subcommand -a map        -d 'Analyze codebase, generate guides'
complete -c adp -n __fish_use_subcommand -a feature    -d 'Create feat/<slug>, seed spec'
complete -c adp -n __fish_use_subcommand -a run        -d 'Execute full pipeline (skill)'
complete -c adp -n __fish_use_subcommand -a auto-mode  -d 'Maximum-autonomy run (skill)'
complete -c adp -n __fish_use_subcommand -a validate   -d 'Sensors + DAG validation'
complete -c adp -n __fish_use_subcommand -a verify     -d 'Run all sensors'
complete -c adp -n __fish_use_subcommand -a evaluate   -d 'Score unscored sprints'
complete -c adp -n __fish_use_subcommand -a pause      -d 'Snapshot progress (skill)'
complete -c adp -n __fish_use_subcommand -a resume     -d 'Continue from snapshot (skill)'
complete -c adp -n __fish_use_subcommand -a status     -d 'Pipeline state and sprints'
complete -c adp -n __fish_use_subcommand -a usage      -d 'Token usage and cost'
complete -c adp -n __fish_use_subcommand -a sensors    -d 'Run harness sensors'
complete -c adp -n __fish_use_subcommand -a guides     -d 'List loaded guides'
complete -c adp -n __fish_use_subcommand -a tui        -d 'Launch interactive TUI'
complete -c adp -n __fish_use_subcommand -a dashboard  -d 'Alias for tui'
complete -c adp -n __fish_use_subcommand -a design     -d 'Tokens + component inventory'
complete -c adp -n __fish_use_subcommand -a templates  -d 'Workflow templates'
complete -c adp -n __fish_use_subcommand -a worktree   -d 'Sprint worktrees'
complete -c adp -n __fish_use_subcommand -a update     -d 'Re-run installer to upgrade'
complete -c adp -n __fish_use_subcommand -a uninstall  -d 'Remove ADP'
complete -c adp -n __fish_use_subcommand -a start      -d 'Start the pipeline'
complete -c adp -n __fish_use_subcommand -a log        -d 'Append to activity log'
complete -c adp -n __fish_use_subcommand -a help       -d 'Show usage'
complete -c adp -n __fish_use_subcommand -a completions -d 'Shell completion script'

# Global flag (applies to most commands)
complete -c adp -l cwd -d 'Target project directory' -r -F

# design subcommands
complete -c adp -n '__adp_using_subcommand design' -n '__adp_needs_subcommand' -a 'extract show intake run'
complete -c adp -n '__adp_using_subcommand design' -a '(__adp_features)'

# templates subcommands
complete -c adp -n '__adp_using_subcommand templates' -n '__adp_needs_subcommand' -a 'list show use'
complete -c adp -n '__adp_using_subcommand templates' -a '(__adp_templates)'

# worktree subcommands
complete -c adp -n '__adp_using_subcommand worktree' -n '__adp_needs_subcommand' -a 'list clean add remove'

# feature-slug positions
complete -c adp -n '__adp_using_subcommand run'       -a '(__adp_features)'
complete -c adp -n '__adp_using_subcommand validate'  -a '(__adp_features)'
complete -c adp -n '__adp_using_subcommand start'     -a '(__adp_features)'
complete -c adp -n '__adp_using_subcommand resume'    -a '(__adp_features)'
complete -c adp -n '__adp_using_subcommand auto-mode' -a '(__adp_features)'

# completions: list shells
complete -c adp -n '__adp_using_subcommand completions' -a 'bash zsh fish'

# feature flags
complete -c adp -n '__adp_using_subcommand feature' -l complexity -s c \
    -d 'Feature complexity' -a 'small medium large complex'

# update flags
complete -c adp -n '__adp_using_subcommand update' -l branch -d 'Install from a specific git branch' -r

# uninstall flags
complete -c adp -n '__adp_using_subcommand uninstall' -s y -l yes -d 'Skip confirmation'
