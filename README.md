# astr-tui

`astr-tui` is a Node.js/TypeScript terminal workbench for AstrBot Dashboard.

## Quick Start

```bash
npm install
npm run build
npm link
astr-tui login --server http://localhost:6185
astr-tui
```

The CLI uses the Dashboard login endpoint and stores the JWT in the system
keychain through `keytar` when available. If `keytar` is unavailable in a local
development environment, it falls back to `~/.astr-tui/tokens.json`.

## Keyboard

- Tab cycles between Chat, Status, Console, and Commands.
- Up/Down selects sessions in Chat, or commands in Commands.
- PageUp/PageDown scrolls Chat history, Console logs, or Commands.
- Enter toggles the selected command in Commands.

## Advanced Slash Commands

- `/chat` switches to the main WebUI-style chat workspace.
- `/status` opens runtime/version status.
- `/console` opens live logs.
- `/new` creates a WebChat session.
- `/refresh` reloads sessions and the current history.
- `/search <keyword>` filters sessions by title, id, platform, or creator.
- `/clear-search` clears the session filter.
- `/stop` stops the active generation for the selected session.
- `/rename <name>` renames the selected session.
- `/delete` asks for deletion confirmation.
- `/commands` loads command status.
- `/toggle <handler_full_name> on|off` toggles a command.
- `/restart` asks for restart confirmation.
- `/quit` exits.
