# Changelog

All notable changes to Syncora will be documented here.

## [0.1.0] - Unreleased

### Added

- Tauri 2, React, TypeScript, Vite, and Rust desktop foundation.
- Tailwind CSS and shadcn/ui-style component setup.
- Three-pane Syncora workspace with sidebar, virtualized inbox, reader panel, and command palette.
- Gmail OAuth foundation with PKCE, loopback callback, keyring token storage, and native API bridge.
- SQLite local cache schema with account, thread, message, settings, and FTS5 search tables.
- Sync engine for cached workspace loading, Gmail account sync, selected-thread hydration, and notifications.
- Professional Syncora brand system with logo, favicon, banner, palette, and generated Tauri app icons.
- Open-source project documentation and GitHub templates.

### Changed

- Updated Tauri bundle identifier to `dev.syncora.desktop`.
- Replaced startup console logging with store-backed initialization error state.
- Refreshed README and demo documentation for preview release readiness.

### Removed

- Removed unused mock inbox data from the application source.
