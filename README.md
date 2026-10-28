# astr-tui

Terminal workbench for AstrBot Dashboard, built with Node.js, TypeScript, React, and Ink.

`astr-tui` brings the common AstrBot WebUI workflows into a keyboard-driven terminal UI: chat, status charts, live logs, command/tool toggles, plugins, personas, configuration, providers, and platforms.

[中文使用说明](README.zh-CN.md)

## Upstream compatibility

The current implementation was checked against [AstrBot master `abf68307`](https://github.com/AstrBotDevs/AstrBot/commit/abf68307), version `4.29.3`, on October 28, 2026. It retains the Dashboard's supported legacy endpoints and uses `/api/v1` for paginated chat history and reconnecting to active chat runs. History reads fall back to the legacy endpoint only on HTTP 404. New management sections require the corresponding server endpoints; an unavailable section displays its error without preventing other sections from loading.

This is a terminal client for common administration tasks. Browser-only pages, media previews, and the full WebUI editor are outside its current scope.

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

Server selection follows this order: `--server`, `ASTR_TUI_SERVER`, `ASTRBOT_DASHBOARD_URL`, `DASHBOARD_URL`, saved profile, default. Reverse-proxy prefixes are supported, for example `https://example.com/astrbot`.

First-run setup detects a fresh Dashboard and requests password confirmation before creating its first account. Existing accounts with two-step verification prompt for a TOTP or recovery code. For scripted logins, provide the code with `login --code <code>` alongside `--password-stdin`.

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

- Chat workspace with streaming replies, reasoning and tool-call results, active-run recovery, history pagination, rename, delete confirmation, and stop actions.
- Runtime status page with message/model usage summaries and terminal charts.
- Live console logs with colored log levels and scrolling.
- Command and function-tool management.
- Plugin management, plugin market browsing, updates, installs, reloads, and schema-based config editing.
- Persona management with folders and editable persona fields.
- AstrBot normal/system configuration editing based on Dashboard config metadata.
- Provider source/model management, model fetch, test status, and editable settings.
- Platform adapter management, settings, delete/toggle actions, and scan-login flows where supported.
- Management workspace for scheduled tasks, Skills, subagents, session rules, and knowledge-base browsing/retrieval.
- English and Chinese UI.

## Keyboard

- `Tab` / `Shift+Tab`: switch main sections forward/backward. The navigation window follows the current section on narrow terminals.
- `Left` / `Right`: switch tabs or move between row actions.
- `Up` / `Down`: move through lists, rows, settings, and actions.
- `PageUp` / `PageDown`: scroll larger views.
- `Enter`: open, toggle, run, edit, or save the selected item depending on context.
- `Esc`: close dialogs or return from edit mode.
- `Ctrl+C`: exit.
- `Ctrl+R`: refresh workbench data outside an editor. The management workspace uses `r` for its current section.

The TUI is designed around visible buttons and focused rows. In most screens, move to the action you want and press `Enter`.

### Chat actions

Enter these in the chat input. Other messages continue to be sent to AstrBot. Prefix a bot command with another slash to bypass local actions: `//help` sends `/help` to the bot.

| Action | Command |
| --- | --- |
| Show actions | `/help` |
| Create a chat | `/new` |
| Rename the current chat | `/rename New name` |
| Delete the current chat and history | `/delete`, then `/delete confirm` |
| Stop the current response | `/stop` |
| Load the previous history page | `/older` |
| Refresh workbench/history | `/refresh` |
| Filter the chat list / clear filtering | `/search text` / `/search` |

Switching chats detaches the local stream while the server continues generating. Returning to a chat reconnects to its active run when the server supports it. Interrupted streams attempt to reattach up to twice without resubmitting the message.

### Management workspace

Switch to **Manage**, then use `Left` / `Right` for its subsections, `Up` / `Down` to select, and `r` to refresh. Changes that delete data require confirmation.

| Section | Actions |
| --- | --- |
| Scheduled tasks | `a` create, `e` edit, `t` enable/disable, `x` run now, `d` delete; recurring cron or one-time ISO date/time |
| Skills | `t` enable/disable, `d` delete local Skills; plugin/sandbox sources are displayed as read-only |
| Subagents | `Space` toggle, `a` add/edit an agent, `d` remove, `s` save, `u` discard the draft; drafts survive main-section changes |
| Session rules | `/` search, `a` add/update, `e` edit JSON, `d` delete |
| Knowledge bases | `Enter` open details/documents, `/` search documents, `f` test retrieval, `q` back |

Use `n` / `p` to change server pages for session rules, knowledge bases, and documents. Follow the on-screen hints for retrieval-result navigation.

## Authentication

`astr-tui` logs in through the AstrBot Dashboard API and stores the JWT locally.

When available, tokens are stored in the system keychain through `keytar`. If `keytar` is unavailable or fails to load on your platform, `astr-tui` automatically falls back to:

```text
~/.astr-tui/tokens.json
```

If `keytar` prints optional dependency warnings during install, the package can still work through the file-based fallback.

Profile and fallback-token writes use atomic replacement. On POSIX systems, new token/profile files use owner-only permissions. A malformed token file produces an error instead of being silently overwritten.

## Development

```bash
npm install
npm run build
npm run dev -- --server http://localhost:6185
```

Useful checks (including terminal keyboard integration and real local HTTP/SSE transport tests):

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
