# Syncora Application File Guide

This file explains what is inside the Syncora application, why each area exists, and how the files work together.

## What Syncora Is

Syncora is a Tauri desktop Gmail workspace built with React, TypeScript, Vite, Tailwind CSS, and Rust. It provides a local-first email interface with Gmail OAuth, SQLite caching, search, native notifications, and generated desktop app icons.

## Main Application Flow

1. `index.html` loads the frontend entry point.
2. `src/main.tsx` mounts the React app.
3. `src/app/App.tsx` initializes SQLite, loads cached workspace data, starts account sync, and registers the command palette shortcut.
4. `src/layouts/AppShell.tsx` renders the desktop workspace.
5. Feature components render the sidebar, inbox, mail reader, and command palette.
6. Services handle Gmail auth, Gmail API access, SQLite sync, notifications, and Tauri backend calls.
7. `src-tauri/src/lib.rs` provides native Rust commands for OAuth, Gmail proxying, keyring storage, and plugins.

## Root Files

| File | What it contains | Use |
| --- | --- | --- |
| `.env.example` | Example environment variables for Google OAuth. | Copy to `.env` before local development. |
| `.gitignore` | Ignored generated files, local secrets, logs, database files, and editor folders. | Keeps the repository clean and safe. |
| `CHANGELOG.md` | Version history and release notes. | Tracks user-visible changes over time. |
| `CODE_OF_CONDUCT.md` | Community behavior expectations. | Standard open-source project governance. |
| `CONTRIBUTING.md` | Contribution workflow and review expectations. | Helps contributors submit focused changes. |
| `LICENSE` | MIT license text. | Defines project usage rights. |
| `README.md` | Main project overview, setup guide, architecture, commands, and roadmap. | First document users and contributors should read. |
| `demo.md` | This application file guide. | Explains the repo contents and file purposes. |
| `components.json` | shadcn/ui-style component configuration. | Defines UI component conventions and aliases. |
| `eslint.config.js` | ESLint configuration. | Enforces TypeScript and React code quality. |
| `index.html` | Vite HTML entry point, favicon link, theme color, and root div. | Browser shell for the React frontend. |
| `package.json` | npm scripts, app metadata, dependencies, and dev dependencies. | Runs development, build, lint, Tauri, and icon-generation commands. |
| `package-lock.json` | Locked npm dependency tree. | Keeps installs reproducible. |
| `postcss.config.js` | PostCSS setup. | Enables Tailwind processing. |
| `tailwind.config.ts` | Tailwind theme, content paths, colors, animations, and plugins. | Controls the app styling system. |
| `tsconfig.json` | TypeScript settings for the frontend. | Validates app source code. |
| `tsconfig.node.json` | TypeScript settings for Node-based config files. | Supports Vite and tooling config. |
| `vite.config.ts` | Vite configuration and path aliases. | Builds and serves the frontend. |

## GitHub Files

| Path | What it contains | Use |
| --- | --- | --- |
| `.github/pull_request_template.md` | Pull request checklist and review prompts. | Standardizes PR descriptions. |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template. | Captures reproduction details. |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template. | Captures product suggestions clearly. |

## Public Brand Assets

| File | What it contains | Use |
| --- | --- | --- |
| `public/brand/app-banner.png` | Wide Syncora banner image. | GitHub, README, release, and marketing preview asset. |
| `public/brand/favicon.svg` | Browser favicon SVG. | Used by `index.html`. |
| `public/brand/palette.json` | Machine-readable brand colors and typography. | Can be consumed by tools or design scripts. |
| `public/brand/palette.md` | Human-readable brand palette and icon regeneration notes. | Documents the brand system. |
| `public/brand/syncora-icon.svg` | Compact square SVG icon. | Scalable product icon usage. |
| `public/brand/syncora-logo.png` | Canonical 1024x1024 transparent PNG logo. | Source image for Tauri native icon generation. |
| `public/brand/syncora-logo.svg` | Scalable Syncora logo. | README, docs, design, and high-resolution usage. |

## Frontend Source

### Entry And App

| File | What it contains | Use |
| --- | --- | --- |
| `src/main.tsx` | React root creation, global CSS import, and query provider setup. | Starts the frontend application. |
| `src/app/App.tsx` | App initialization, database loading, account sync startup, and command palette keyboard shortcut. | Coordinates startup behavior. |
| `src/vite-env.d.ts` | Vite TypeScript environment declarations. | Provides Vite typing support. |

### Layout

| File | What it contains | Use |
| --- | --- | --- |
| `src/layouts/AppShell.tsx` | Main desktop shell with sidebar, inbox, reader, background, and command palette. | Defines the primary app workspace. |

### Components

| File | What it contains | Use |
| --- | --- | --- |
| `src/components/brand/SyncoraLogo.tsx` | Reusable Syncora logo component. | Shows the product mark in the UI. |
| `src/components/navigation/Sidebar.tsx` | Sidebar navigation and account/workspace actions. | Provides app navigation. |
| `src/components/ui/button.tsx` | Shared button variants and styling. | Reusable UI primitive. |

### Features

| File | What it contains | Use |
| --- | --- | --- |
| `src/features/command-palette/CommandPalette.tsx` | Command search UI, account connect action, sync commands, and animated overlay. | Keyboard-driven app actions. |
| `src/features/inbox/InboxList.tsx` | Search field, sync button, virtualized thread list, empty/error states, and thread selection. | Main unified inbox surface. |
| `src/features/mail-reader/MailReader.tsx` | Selected email thread reader, message content, metadata, labels, and attachments. | Displays opened conversations. |

### Hooks

| File | What it contains | Use |
| --- | --- | --- |
| `src/hooks/use-debounced-value.ts` | Debounced value hook. | Prevents search from updating too aggressively. |
| `src/hooks/use-workspace.ts` | React Query hooks for workspace loading, Gmail connection, and sync. | Connects UI actions to data services. |

### Database

| File | What it contains | Use |
| --- | --- | --- |
| `src/database/client.ts` | SQLite connection and initialization logic. | Opens and prepares the local database. |
| `src/database/schema.ts` | SQL schema for accounts, threads, messages, settings, indexes, and FTS5 search. | Defines local storage structure. |
| `src/database/repositories.ts` | Read/write helpers for accounts, email threads, messages, sync metadata, and search. | Encapsulates database operations. |

### Services

| File | What it contains | Use |
| --- | --- | --- |
| `src/services/tauri.ts` | Tauri environment/helper boundary. | Keeps frontend safe when checking native availability. |
| `src/services/auth/native-auth.ts` | Frontend wrapper around native Google OAuth commands. | Connects Gmail accounts. |
| `src/services/gmail/client.ts` | Browser-side Gmail client helpers. | Legacy/service boundary for Gmail API shape. |
| `src/services/gmail/native-client.ts` | Gmail calls routed through native Tauri commands. | Fetches Gmail data without exposing tokens to the frontend. |
| `src/services/gmail/normalize.ts` | Gmail thread/message normalization. | Converts Gmail API responses into Syncora email models. |
| `src/services/gmail/oauth.ts` | OAuth-related frontend helpers and types. | Supports account connection flow. |
| `src/services/gmail/types.ts` | Gmail API TypeScript types. | Gives strong typing to Gmail responses. |
| `src/services/notifications/notifications.ts` | Native notification helper. | Shows unread mail notifications. |
| `src/services/sync/sync-engine.ts` | Workspace loading, account sync, Gmail fetch, SQLite writes, message hydration, and notification triggers. | Core data synchronization engine. |

### State

| File | What it contains | Use |
| --- | --- | --- |
| `src/store/mail-store.ts` | Zustand store for accounts, threads, selected messages, search, sync status, errors, and notified threads. | Central mail state. |
| `src/store/ui-store.ts` | Zustand store for selected thread and command palette state. | Central UI state. |

### Styling, Types, And Utilities

| File | What it contains | Use |
| --- | --- | --- |
| `src/styles/globals.css` | Tailwind layers, CSS variables, dark theme, and global styles. | Controls the app visual baseline. |
| `src/types/email.ts` | Shared email account, thread, message, attachment, and sync types. | Common app data contracts. |
| `src/lib/query-client.ts` | TanStack Query client setup. | Controls request caching and query behavior. |
| `src/lib/utils.ts` | Class name merging and date formatting helpers. | Shared UI utilities. |
| `src/utils/sanitize-email.ts` | Email HTML sanitization helper. | Reduces unsafe or messy email rendering. |

## Tauri And Rust Source

| File | What it contains | Use |
| --- | --- | --- |
| `src-tauri/Cargo.toml` | Rust package metadata and dependencies. | Defines the native app crate. |
| `src-tauri/Cargo.lock` | Locked Rust dependency tree. | Keeps Rust builds reproducible. |
| `src-tauri/build.rs` | Tauri build script. | Runs Tauri build-time setup. |
| `src-tauri/tauri.conf.json` | Product name, bundle identifier, window config, build hooks, CSP, bundle targets, and app icons. | Main Tauri desktop configuration. |
| `src-tauri/capabilities/default.json` | Tauri permission capability file for core, notification, opener, store, and SQL plugins. | Controls frontend access to native APIs. |
| `src-tauri/src/main.rs` | Native app binary entry point. | Starts the Rust/Tauri application. |
| `src-tauri/src/lib.rs` | Native commands for Gmail OAuth, token storage, Gmail API proxying, plugins, and app setup. | Main Rust backend logic. |

## Tauri Generated Schemas

| File | What it contains | Use |
| --- | --- | --- |
| `src-tauri/gen/schemas/acl-manifests.json` | Generated permission manifest schema. | Tauri capability validation. |
| `src-tauri/gen/schemas/capabilities.json` | Generated capabilities schema. | Tauri capability validation. |
| `src-tauri/gen/schemas/desktop-schema.json` | Generated desktop permission schema. | Used by capability files. |
| `src-tauri/gen/schemas/windows-schema.json` | Generated Windows permission schema. | Used by platform capability validation. |

## Tauri Icon Assets

These files are generated from `public/brand/syncora-logo.png` by running:

```bash
npm run brand:icons
```

| Path | What it contains | Use |
| --- | --- | --- |
| `src-tauri/icons/icon.ico` | Windows multi-size icon. | Windows app executable and installers. |
| `src-tauri/icons/icon.icns` | macOS icon bundle. | macOS app bundle. |
| `src-tauri/icons/icon.png` | Large PNG app icon. | General Tauri icon fallback. |
| `src-tauri/icons/32x32.png` | Small PNG icon. | Linux/window icon usage. |
| `src-tauri/icons/64x64.png` | Medium PNG icon. | Linux/window icon usage. |
| `src-tauri/icons/128x128.png` | Standard PNG icon. | Linux/window icon usage. |
| `src-tauri/icons/128x128@2x.png` | High-density PNG icon. | HiDPI desktop icon usage. |
| `src-tauri/icons/StoreLogo.png` | Windows Store logo. | Windows package metadata. |
| `src-tauri/icons/Square*.png` | Windows square logo variants. | Windows installer and shell assets. |
| `src-tauri/icons/android/**` | Android launcher icons emitted by Tauri. | Future mobile packaging support. |
| `src-tauri/icons/ios/**` | iOS app icon sizes emitted by Tauri. | Future mobile packaging support. |

## Ignored Generated Folders

These folders may appear after development or builds, but they should not be committed:

| Path | What it contains | Use |
| --- | --- | --- |
| `node_modules/` | Installed npm packages. | Local dependency installation. |
| `dist/` | Vite production frontend output. | Generated by `npm run build`. |
| `src-tauri/target/` | Rust and Tauri build output. | Generated by Tauri/Cargo builds. |

## Important Commands

```bash
npm install          # install frontend dependencies
npm run dev          # run Vite frontend only
npm run tauri:dev    # run the desktop app in development
npm run typecheck    # validate TypeScript
npm run lint         # run ESLint
npm run build        # build frontend production output
npm run brand:icons  # regenerate native app icons
npm run tauri:build  # build desktop release bundles
```

## Current Build Output

When `npm run tauri:build` succeeds on Windows, release installers are generated under:

```text
src-tauri/target/release/bundle/
```

That folder is build output and is intentionally ignored by git.
