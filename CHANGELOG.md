# Changelog

All notable changes to Syncora will be documented here.

## [0.1.0] - 2026-05-18

### Added

- Initial public preview of Syncora, a Tauri 2 desktop Gmail workspace.
- React, TypeScript, Vite, Tailwind CSS, Zustand, SQLite, and Rust project foundation.
- Native Google OAuth Desktop app flow with PKCE, loopback callback handling, and OS keyring token storage.
- Rust Gmail API proxy with token refresh, request timeouts, retry handling, and user-friendly errors.
- Local SQLite cache for accounts, threads, messages, labels, app settings, and FTS5 search.
- Three-pane mail UI with sidebar, virtualized inbox, focused reader, command palette, and settings page.
- Folder support for Unified, Inbox, Starred, Sent, Trash, and Archive.
- Per-account filtering, quick filters, debounced local search, load-more pagination, and keyboard shortcuts.
- Local thread actions for star, archive, move to inbox, move to trash, mark read/unread, empty trash, permanent delete, and print.
- Sandboxed Gmail HTML rendering in the message reader.
- Optional Anthropic/Claude assistant for summaries, action items, draft replies, and custom prompts.
- Syncora brand assets, app banner, favicon, palette, and generated native app icons.
- Open source project documentation, issue templates, pull request template, code of conduct, and MIT license.

### Changed

- Moved native-only secrets to `src-tauri/.env.example`.
- Kept frontend environment configuration limited to `VITE_GOOGLE_CLIENT_ID`.
- Added graceful native error handling for missing `GOOGLE_CLIENT_SECRET` and `ANTHROPIC_API_KEY`.
- Added a React error boundary for unrecoverable render failures.
- Moved the React entry point to `src/app/main.tsx`.

### Removed

- Removed mock inbox data from the active application source.
- Removed disabled notification service code from the current app surface.
