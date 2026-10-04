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
git clone https://github.com/jonaswahringer/dotfiles.git
cd ~/dotfiles
stow <app-1> <app-2> <app-n>
```

## Raycast

The `raycast` package contains custom scripts. Link it into place with:

```bash
cd ~/dotfiles
stow --target="$HOME" raycast
```

This links `~/Documents/raycast` to `raycast/Documents/raycast` in this repo.
In Raycast Settings, open Extensions, select Script Commands, and add
`~/Documents/raycast` as a script directory. Assign command aliases there.
On this machine, `web` is the alias for New Browser Window:

- `web` opens an empty Helium window.
- `web something` searches Google in a new Helium window.
- `web github.com` opens the website in a new Helium window.

The scripts also open a T3 Chat window, a Cursor window with an optional
`~/localdocs` subfolder, and a Ghostty terminal window. They require their
respective apps. The browser search script also requires `/usr/bin/python3`.

Raycast settings, including aliases and hotkeys, are managed in Raycast.
Use its Export Settings & Data and Import Settings & Data commands to
back up or restore them. Store `.rayconfig` exports in `~/Documents/raycast`;
they are ignored by Git because this repo is public and exports can contain
private settings. An export is a snapshot and does not update with the scripts.
Raycast's runtime data under `~/.config/raycast` is not managed by this repo.
See Raycast's [Script Commands](https://manual.raycast.com/script-commands)
and [Import & Export](https://manual.raycast.com/import-export) documentation.
