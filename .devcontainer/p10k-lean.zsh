typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(dir vcs)
typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status command_execution_time virtualenv node_version time)
typeset -g POWERLEVEL9K_PROMPT_ON_NEWLINE=true
typeset -g POWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX=''
typeset -g POWERLEVEL9K_MULTILINE_LAST_PROMPT_PREFIX='❯ '
typeset -g POWERLEVEL9K_DIR_TRUNCATE_BEFORE_MARKER=false
typeset -g POWERLEVEL9K_DIR_MAX_LENGTH=3
typeset -g POWERLEVEL9K_TIME_FORMAT='%H:%M:%S'
typeset -g POWERLEVEL9K_SHORTEN_DIR_LENGTH=1
typeset -g POWERLEVEL9K_SHORTEN_STRATEGY=truncate_middle
typeset -g POWERLEVEL9K_STATUS_VERBOSE=false
typeset -g POWERLEVEL9K_NODE_VERSION_PROJECT_ONLY=true

if [[ -r "${(%):-%N}:A:h/p10k-instant-prompt.zsh" ]]; then
  source "${(%):-%N}:A:h/p10k-instant-prompt.zsh"
fi
[[ ! -r /opt/powerlevel10k/powerlevel10k.zsh-theme ]] || source /opt/powerlevel10k/powerlevel10k.zsh-theme
