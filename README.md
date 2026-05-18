# Syncora

<p align="center">
  <img src="public/brand/app-banner.png" alt="Syncora application banner" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Built with Tauri" src="https://img.shields.io/badge/built%20with-Tauri-24C8DB.svg" />
  <img alt="Built with Rust" src="https://img.shields.io/badge/built%20with-Rust-f74c00.svg" />
  <img alt="Version" src="https://img.shields.io/badge/version-v0.1.0-7c3aed.svg" />
</p>

**A local-first, privacy-focused desktop Gmail workspace built with Tauri, React, Rust, SQLite, and Tailwind CSS.**

Syncora is a personal open source desktop email client for people who want a calm, fast Gmail workspace outside the browser. It connects to Gmail through a native OAuth flow, keeps a local SQLite cache for speed and search, stores tokens in the OS keyring, and uses a Rust backend for Gmail API access and optional AI assistance.

## Preview

> Screenshot/demo placeholder: add a current app screenshot or short demo GIF here before the first tagged public release.

Suggested file path:

```text
public/brand/syncora-preview.png
```

## Features

- 🔐 **Native Gmail OAuth** with desktop PKCE, loopback callback handling, and OS keyring token storage
- ⚡ **Local-first cache** using SQLite for accounts, threads, messages, labels, settings, and FTS5 search
- 🧭 **Three-pane desktop workspace** with sidebar, virtualized inbox, and focused message reader
- 🗂️ **Built-in folders** for Unified, Inbox, Starred, Sent, Trash, and Archive
- 🔎 **Fast local search** with debounced queries and cached thread/message indexing
- 👥 **Multi-account-ready UI** with account filtering and per-account color identity
- ⭐ **Local message actions** for star, archive, move to inbox, move to trash, mark read/unread, empty trash, and permanent delete
- 🧱 **Sandboxed email rendering** for Gmail HTML bodies
- ⌨️ **Keyboard-first navigation** with command palette and reader shortcuts
- 🤖 **Optional AI assistant** through Anthropic/Claude for summaries, action items, draft replies, and custom prompts
- 🎨 **Polished brand system** with banner, favicon, palette, logo assets, and generated Tauri icons

## Tech Stack

| Area | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Native backend | Rust |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, lucide-react, framer-motion |
| State and data flow | Zustand, TanStack Query |
| Local storage | SQLite via `@tauri-apps/plugin-sql` |
| Native services | Google OAuth, Gmail API proxy, OS keyring, optional Anthropic API |

## Prerequisites

- Node.js 18+
- npm
- Rust stable
- Tauri desktop prerequisites for your operating system
- Google Cloud account
- Gmail API enabled in Google Cloud
- Google OAuth Desktop app credentials
- Optional Anthropic API key for AI features

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/leohack6002/syncora.git
cd syncora
```

### 2. Create the frontend environment file

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Create the native environment file

```bash
cp src-tauri/.env.example src-tauri/.env
```

On Windows PowerShell:

```powershell
Copy-Item src-tauri/.env.example src-tauri/.env
```

### 4. Create Google Cloud OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the Gmail API.
4. Configure the OAuth consent screen.
5. Create an OAuth Client ID.
6. Choose **Desktop app** as the application type.
7. Copy the generated client ID into `.env`.
8. Copy the generated client secret into `src-tauri/.env`.

### 5. Install dependencies

```bash
npm install
```

### 6. Run the desktop app

```bash
npm run tauri:dev
```

## Environment Variables

| Variable | File | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | `.env` | Yes | Google OAuth Desktop app client ID. This is the only frontend-exposed environment variable. |
| `GOOGLE_CLIENT_SECRET` | `src-tauri/.env` | Yes | Google OAuth Desktop app client secret used by the Rust backend during token exchange. |
| `ANTHROPIC_API_KEY` | `src-tauri/.env` | Optional | Enables the reader AI assistant for summaries, action items, draft replies, and custom prompts. |

Example `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

Example `src-tauri/.env`:

```env
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Never commit `.env`, `src-tauri/.env`, OAuth tokens, API keys, or local SQLite database files.

## Development Commands

```bash
npm run dev          # Run Vite frontend only
npm run tauri:dev    # Run the desktop app in development
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
npm run build        # Production frontend build
npm run tauri:build  # Production desktop bundle
```

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `J` | Select next visible thread and mark it read |
| `K` | Select previous visible thread and mark it read |
| `E` | Archive selected thread |
| `S` | Star or unstar selected thread |
| `#` | Move selected thread to trash |
| `U` | Toggle selected thread read/unread |
| `Escape` | Clear selected thread |

## Roadmap

- 🔔 Desktop notifications and notification preferences
- ✍️ Compose and reply support
- 📱 Mobile packaging exploration
- 🤖 Expanded AI workflows for triage, summaries, and suggested replies
- 🧪 Tests for Gmail normalization, SQLite repositories, sync behavior, and native commands
- 📦 Tagged preview releases with screenshots and installers

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

If you find a bug, use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). If you have an idea, use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## License

Syncora is released under the MIT License. See [LICENSE](LICENSE).
