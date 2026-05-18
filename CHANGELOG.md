# Changelog

All notable changes to Syncora will be documented here.

## [0.1.0] - Unreleased

### Added

- Tauri 2 desktop foundation with React, TypeScript, Vite, Tailwind CSS, Zustand, SQLite, and Rust.
- Syncora brand assets, favicon, app banner, color palette, and generated native app icons.
- Google desktop OAuth with PKCE, loopback callback handling, keyring token storage, token refresh, and logout.
- Native Gmail API proxy with paced frontend requests and friendly error handling.
- Local SQLite cache for accounts, threads, messages, app settings, labels, and FTS5 search.
- Three-pane mail workspace with sidebar, virtualized inbox, sandboxed reader, command palette, and settings page.
- Unified, Inbox, Starred, Sent, Trash, and Archive folder views.
- Per-account filtering, quick filters, debounced local search, load-more pagination, and keyboard shortcuts.
- Local message actions for star, archive, move to inbox, move to trash, mark read/unread, empty trash, permanent delete, and print.
- Optional Anthropic/Claude reader assistant for summaries, action items, draft replies, and custom prompts.
- Open source project files including README, contributing guide, code of conduct, license, issue templates, and PR template.

### Changed

- Moved the frontend entry point into `src/app/main.tsx`.
- Added a React error boundary for unrecoverable render failures.
- Kept frontend env configuration limited to `VITE_GOOGLE_CLIENT_ID`.
- Moved native-only secrets to `src-tauri/.env.example`.
- Hardened Rust env handling so missing native secrets return friendly errors.
- Refreshed `demo.md` and README for public preview readiness.

### Removed

- Removed unused mock inbox data.
- Removed disabled notification service references from the active application surface.
