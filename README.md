# dotfiles

## About

Personal configs for my terminal tools, managed with
[GNU Stow](https://www.gnu.org/software/stow/).

**Principles:**

- Each app lives in its own folder, mirroring its path relative to `~`
  (e.g. `ghostty/.config/ghostty/`)
- Stow symlinks configs back into place — no copying, edits sync
  automatically
- No secrets: auth files, caches, and logs are gitignored

## Installing & Creating

```bash
brew install stow            # or apt/pacman

# add a new app
mkdir -p ~/dotfiles/<app>/.config
mv ~/.config/<app> ~/dotfiles/<app>/.config/
cd ~/dotfiles && stow <app>
```

## Cloning

```bash
git clone ghttps://github.com/jonaswahringer/dotfiles.git
cd ~/dotfiles
stow <app-1> <app-2> <app-n>
```
