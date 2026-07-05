# euporie

## ⚠️ macOS config location

euporie uses `platformdirs`, which on macOS reads config from:

    ~/Library/Application Support/euporie/config.json

NOT `~/.config/euporie/` (it silently ignores that path — no error,
no log output, keybindings just don't apply).

The install script symlinks `config.json` from this repo to both
locations. If euporie ignores your config, verify with:

    python -c "import platformdirs; print(platformdirs.user_config_dir('euporie'))"

## Related

- Keybindings coordinate with Ghostty config (`dotfiles/ghostty`):
  Ghostty translates Cmd/Option+arrows into escape sequences that
  euporie's `key_bindings` map to commands.
