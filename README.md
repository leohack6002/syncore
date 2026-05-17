# Syncora

Syncora is a Tauri desktop communication workspace for Gmail. It brings multiple inboxes into one fast, local-first interface with keyboard-driven navigation, SQLite search, native notifications, and a restrained premium visual system.

The product direction is calm and productivity-focused: a desktop client that feels closer to Linear, Raycast, Arc, Superhuman, and Notion than a traditional webmail tab.

## Status

Syncora is an early preview foundation. The core desktop shell, Gmail OAuth boundary, SQLite cache, sync engine, native notification path, and app branding pipeline are in place. The app builds successfully as a Windows desktop bundle.

## Highlights

- Tauri 2 desktop app with React, TypeScript, Vite, and Rust commands
- Three-pane workspace with sidebar, unified inbox, and message reader
- Gmail OAuth with PKCE, loopback callback, and OS keyring token storage
- Gmail API bridge through native Tauri commands
- Local SQLite cache for accounts, threads, messages, settings, and FTS5 search
- Scrollable virtualized inbox rendering with TanStack Virtual
- Sandboxed message-body rendering for Gmail HTML
- Local star toggles persisted to SQLite
- Command palette with `Ctrl+K` / `Cmd+K`
- Native desktop notifications for new unread threads
- Professional Syncora brand assets and generated app icons for desktop bundles

## Repository Structure

```text
.
|-- .github/              # issue and pull request templates
|-- public/brand/         # source brand assets, favicon, banner, palette
|-- src/                  # React application source
|   |-- app/              # application bootstrap
|   |-- components/       # shared UI, navigation, and brand components
|   |-- database/         # SQLite client, schema, and repositories
|   |-- features/         # inbox, reader, command palette
|   |-- hooks/            # shared React hooks
|   |-- layouts/          # desktop shell layouts
|   |-- lib/              # shared utilities and query client
|   |-- services/         # Gmail, auth, sync, notification, and Tauri services
|   |-- store/            # Zustand state stores
|   |-- styles/           # global styles
|   `-- types/            # shared TypeScript types
|-- src-tauri/            # Tauri app, Rust commands, capabilities, icons
|-- CHANGELOG.md          # release history
|-- demo.md               # product walkthrough and current capabilities
`-- package.json          # development, build, and branding scripts
```

Generated folders such as `dist/`, `node_modules/`, and `src-tauri/target/` are intentionally ignored.

## Requirements

- Node.js 20+
- npm
- Rust stable
- Tauri desktop prerequisites for your operating system
- Google Cloud OAuth client with Gmail API access enabled

## Setup

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then add your Google OAuth client id:

```bash
VITE_GOOGLE_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

Use a Google OAuth client with application type `Desktop app`. Do not add a client secret or redirect URI; Syncora creates a temporary loopback redirect URI during sign-in. Never commit `.env`, OAuth tokens, local database files, or generated build output.

## Development

```bash
npm run dev          # Vite frontend only
npm run tauri:dev    # desktop app in development
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
npm run build        # frontend production build
npm run tauri:build  # desktop production bundle
```

## Branding And Icons

The canonical app icon source is:

```text
public/brand/syncora-logo.png
```

After changing the logo, regenerate native Tauri icons with:

```bash
npm run brand:icons
```

This refreshes `src-tauri/icons`, including Windows `.ico`, macOS `.icns`, Linux PNG sizes, and installer assets. Brand guidance lives in `public/brand/palette.md`.

## Build Verification

The current app has been verified with:

```bash
npm run build
npx tauri build --no-bundle --verbose
npx tauri build
```

Windows release artifacts are produced under:

```text
src-tauri/target/release/bundle/
```

## Architecture Notes

Syncora keeps Gmail tokens outside the frontend. The React app starts account connection, while Rust commands open the browser, receive the OAuth callback, exchange the code, refresh tokens, and store credentials in the OS keyring.

Email data is normalized before being written into SQLite. The frontend reads from the local cache first, then syncs accounts in the background. This keeps the app responsive and prepares the product for fast search, offline reads, and multi-account workflows.

## Current Polish

- Dark startup fallback prevents a white flash before React mounts.
- Archive, inbox, sent, starred, and unified folders share one folder-rule helper.
- Starred state updates optimistically in Zustand and persists into the local cache.
- Metadata sync keeps startup lightweight; full bodies hydrate only when a thread is opened.
- Gmail request pacing and native retry handling reduce transient Windows socket issues.

## Roadmap

- Account management screens and reconnect states
- More complete Gmail pagination and background refresh
- Keyboard shortcuts for archive, star, search, and navigation
- Tests for normalization, repositories, and sync behavior
- Screenshots and packaged preview release notes

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Keep changes focused, document user-visible behavior, and run validation commands before review.

## License

MIT. See [LICENSE](LICENSE).
