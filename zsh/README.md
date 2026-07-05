# zsh

Zsh configuration, managed via symlink from this repo.

## Structure

    zsh/
    ├── .zshrc          # main config (Oh My Zsh init + sources *.zsh files)
    ├── aliases.zsh     # aliases
    └── functions.zsh   # shell functions (anything needing arguments)

## Setup

    ln -sf ~/dotfiles/zsh/.zshrc ~/.zshrc

The `.zshrc` sources every `*.zsh` file in this directory:

    for f in ~/dotfiles/zsh/*.zsh; do
      source "$f"
    done

To add new config, just drop another `.zsh` file here — no `.zshrc`
edit needed.

## Applying changes

Changes take effect in new shells automatically. For the current
shell:

    source ~/.zshrc

(aliased as `reload`)

## Notes

- **Terminal-agnostic**: Ghostty/Supacode just launch zsh; nothing
  terminal-specific lives here (terminal config is in
  `dotfiles/ghostty`).
- **Oh My Zsh**: initialized from `.zshrc`. OMZ itself is not
  versioned in this repo — install it separately on new machines:
  https://ohmyz.sh
- Use functions instead of aliases for anything that takes
  arguments (see `functions.zsh`).
