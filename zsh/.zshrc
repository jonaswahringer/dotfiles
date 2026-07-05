# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)
source $ZSH/oh-my-zsh.sh

# Modular config
for f in ~/dotfiles/zsh/*.zsh; do
  source "$f"
done
