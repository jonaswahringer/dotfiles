# Web Search (Raycast extension)

A personal Raycast extension that replaces `new-browser-window.sh` with a native Raycast list.
It opens a **new Helium window**, with fuzzy local history and optional Google suggestions.
The old script is untouched and keeps working.

## Behavior

| You type                                                | Result                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| nothing (blank or spaces)                               | new empty Helium window                                               |
| `http://…` or `https://…`                               | that URL in a new window                                              |
| bare domain like `github.com`, `example.org:8080/a?b=1` | `https://` + input in a new window                                    |
| anything else                                           | `https://www.google.com/search?q=<URL-encoded input>` in a new window |

Input is trimmed first. The URL rules are the same as the script's, plus a check that the result parses as a URL.
Browser launch uses `execFile("/usr/bin/open", [...args])`, so the input is never interpreted by a shell.

## Keys

- **↑ / ↓** move through the result list (Raycast's native list selection). The first row is always "open what I typed".
- **Enter** opens the selected row in a new window.
- **⌘Enter** runs "Use as Search Text": it copies the selected row into the search bar so you can keep editing.
  It is the second action on each row. A bare **Tab** is not used: Raycast's ActionPanel docs list
  modifier-based shortcuts and Tab delivery to a list action is unverified. The action is also in the Action Panel (**⌘K**).
- **Ctrl+X** deletes the selected history entry. **Ctrl+Shift+X** clears all history (with confirmation).
  Clear All History is also in the Action Panel of the first row, even with history recording off,
  no matching entries, or after the last exact match was filtered away.

This is a Raycast list, not a shell prompt. There is no shell-style input cycling.

## Privacy

- **Local history** (default on) stores searches and bare domains in Raycast's local extension storage on this Mac.
  There is no bulk upload of history. It is capped (default 100 entries, choose 25–500) and deduplicated.
  Entries are not stored if they are blank, over 200 characters, or a URL containing credentials
  (`user:pass@`), a query string, or a fragment.
  Plain search text is stored as typed. No filter can recognise every secret, so don't search for secrets with history on.
  Turning the toggle off stops recording; existing entries stay until you delete them or use Clear All History.
- **Google suggestions** (default **off**) send the text in the search field to `suggestqueries.google.com`
  after a 250 ms pause, for inputs of 2+ characters. That includes text you filled in by completing a history entry.
  Every keystroke cancels the previous request, requests time out after 3 seconds, and late responses for older text are ignored.
  Bad, oversized, or failed responses show no suggestions and no error.
- Opening a row submits the chosen search or URL to Google or the site, as any browser visit does.
- **Storage errors**: if history cannot be read, nothing is written over it and Clear All History remains available.
  A failed save or delete is reported and leaves the list unchanged. If the browser opens but the history write fails,
  you get a notice after the window closes. History is saved before the Raycast window closes.

## Preferences

Open Raycast, search "New Browser Window", press ⌘K → _Configure Command_.

| Preference         | Default                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Google Suggestions | off                                                                      |
| Local History      | on                                                                       |
| History Size       | 100                                                                      |
| Browser App Path   | `/Applications/Helium.app` (must accept `--new-window`; `~` is expanded) |

## Install (development import)

Requires macOS, Raycast, npm and Node **22.22.2 or newer** (the minimum of the installed `@raycast/api`;
Vite 8 and Vitest 5 need 22.12+). Work from this folder only.

```bash
npm ci
npm run build            # type-checks and bundles to ./dist (ray build -e dist -o dist)
npm run dev              # imports into Raycast and watches for changes (Ctrl+C to stop)
```

Run `build` first so a broken tree fails before Raycast imports anything. `npm run dev` registers the extension
as a local extension; it stays after you stop the watcher.

**Alias handover.** Keep the old `new-browser-window.sh` script command and its alias as they are until you have
manually proven this command (see Verify). Only then assign the alias (for example `web`) under
Raycast Settings → Extensions → Web Search → New Browser Window, after removing it from the old script.

Keep this folder outside the stowed `raycast` package and outside `~/Documents/raycast`,
which Raycast indexes as Script Commands. `node_modules/` and `dist/` are ignored by Git.

## Verify

```bash
npm test                 # unit tests (URL classification, query encoding, history, suggestions, launch args)
npm run build
npm run lint             # eslint + prettier + tsc
```

Manual check in Raycast:

1. Run the command with empty input and press Enter: a blank Helium window opens.
2. `github.com` → Enter: opens `https://github.com`. `https://example.com/a?b=1` → opens as typed.
3. `rust book` → Enter: Google results. Reopen the command and type `rb`: the entry appears under History.
4. With an item selected, press ⌘Enter: the text moves into the search bar. If nothing happens, use ⌘K.
5. Ctrl+X on a history row removes it; Ctrl+Shift+X asks, then clears all. With history off or no matches, ⌘K on the first row still offers Clear All History.
6. Enable Google Suggestions and type `rus`: suggestions appear below History. Disable it and they stop.

`npm run lint:raycast` runs Raycast's own `ray lint`. It currently **fails** with `Invalid author "jonasw"`
because it checks `author` against Raycast's user directory and this private extension has no Store account.
The other `ray lint` steps (icons, skills, ESLint, Prettier) pass. `npm run lint` and `npm run build` are the checks that count.
The `author` value is deliberately not replaced with an invented username.

## Limits

- Automated tests cover URL classification, launch args, suggestions, and the history store (ordering of reads,
  writes and clears, and read/write/delete failures), plus the shortcut constants.
  They do **not** drive Raycast's UI: ⌘Enter delivery, action order, the first-row Clear All and the close-window
  timing need the manual check above. Native UI automation was not available.
- Google's suggest endpoint is unofficial and may change or rate-limit.
- Helium must be installed at the configured path. Other Chromium browsers work if they accept `--new-window`.
