# astr-tui

Terminal workbench for AstrBot Dashboard, built with Node.js, TypeScript, React, and Ink.

`astr-tui` brings the common AstrBot WebUI workflows into a keyboard-driven terminal UI: chat, status charts, live logs, command/tool toggles, plugins, personas, configuration, providers, and platforms.

## Install

```bash
npm install -g astr-tui
```

Node.js 20 or newer is required.

## Quick Start

Log in to your AstrBot Dashboard:

```bash
astr-tui login --server http://localhost:6185 --username astrbot
```

Open the TUI:

```bash
astr-tui --server http://localhost:6185
```

If you omit `--server`, `astr-tui` uses the saved server from setup/login or falls back to `http://localhost:6185`.

## Commands

```bash
astr-tui                         # open the terminal workbench
astr-tui login                   # log in and store the Dashboard JWT
astr-tui logout                  # remove the stored Dashboard JWT
astr-tui status                  # check saved session and AstrBot version
astr-tui --lang zh-CN            # run with Chinese UI
astr-tui --lang en-US            # run with English UI
```

`login` also supports non-interactive password input:

```bash
echo "your-password" | astr-tui login --server http://localhost:6185 --username astrbot --password-stdin
```

## Features

- Chat workspace with WebChat sessions and streaming replies.
- Runtime status page with message/model usage summaries and terminal charts.
- Live console logs with colored log levels and scrolling.
- Command and function-tool management.
- Plugin management, plugin market browsing, updates, installs, reloads, and schema-based config editing.
- Persona management with folders and editable persona fields.
- AstrBot normal/system configuration editing based on Dashboard config metadata.
- Provider source/model management, model fetch, test status, and editable settings.
- Platform adapter management, settings, delete/toggle actions, and scan-login flows where supported.
- English and Chinese UI.

## Keyboard

- `Tab`: switch main sections.
- `Left` / `Right`: switch tabs or move between row actions.
- `Up` / `Down`: move through lists, rows, settings, and actions.
- `PageUp` / `PageDown`: scroll larger views.
- `Enter`: open, toggle, run, edit, or save the selected item depending on context.
- `Esc`: close dialogs or return from edit mode.
- `Ctrl+C`: exit.

The TUI is designed around visible buttons and focused rows. In most screens, move to the action you want and press `Enter`.

## Authentication

`astr-tui` logs in through the AstrBot Dashboard API and stores the JWT locally.

When available, tokens are stored in the system keychain through `keytar`. If `keytar` is unavailable or fails to load on your platform, `astr-tui` automatically falls back to:

```text
~/.astr-tui/tokens.json
```

If `keytar` prints optional dependency warnings during install, the package can still work through the file-based fallback.

## Development

```bash
npm install
npm run build
npm run dev -- --server http://localhost:6185
```

Useful checks:

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## Publishing

The package includes a `prepublishOnly` guard that runs typecheck, tests, and build before publishing.

```bash
npm publish
```

## License

MIT
