# Syncora

**Unified Communication Workspace**

Syncora is a modern, lightweight desktop email client focused on Gmail integration, multi-account unified inboxes, fast local search, and a premium keyboard-driven workflow.

The product direction is inspired by Superhuman, Linear, Notion, Arc Browser, Spark Mail, and Raycast: fast, calm, focused, and beautiful without visual clutter.

## Status

Syncora is in Phase 1 foundation work. The current repository includes:

- Tauri + React + TypeScript + Vite foundation
- Tailwind CSS + shadcn/ui configuration
- Framer Motion transitions
- Zustand UI state
- TanStack Query setup
- Virtualized unified inbox prototype
- Split-pane mail reader shell
- Command palette foundation
- Gmail OAuth service boundary
- SQLite schema with FTS5 search table
- Native notification helper
- Branding SVG assets and palette
- Open-source project docs

## Screenshots

Screenshots will be added after the first packaged preview build.

## Architecture

```text
src/
├── app/                 # application composition
├── components/          # reusable UI and navigation components
├── data/                # temporary mock data for early UI development
├── database/            # SQLite client and migrations
├── features/            # product features grouped by domain
├── hooks/               # shared React hooks
├── layouts/             # desktop shell layouts
├── lib/                 # shared utilities and client setup
├── pages/               # future route-level screens
├── services/            # Gmail, notifications, platform services
├── store/               # Zustand stores
├── styles/              # global styles
├── types/               # shared TypeScript types
└── utils/               # pure helpers
```

## Getting Started

### Prerequisites

- Node.js 20+
- Rust stable
- Tauri system dependencies for your OS
- A Google Cloud OAuth client configured for Gmail API access

### Installation

```bash
npm install
cp .env.example .env
npm run tauri:dev
```

### Development Commands

```bash
npm run dev          # Vite frontend only
npm run tauri:dev    # desktop app in development
npm run build        # typecheck and build frontend
npm run tauri:build  # package desktop app
npm run lint         # lint TypeScript and React
npm run typecheck    # TypeScript only
```

## Environment Variables

```bash
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=http://localhost:1420/oauth/google/callback
```

Never commit `.env`, OAuth secrets, tokens, or local database files.

## Gmail OAuth

The current code includes the OAuth URL builder and account-connection entry point. The production implementation should complete the secure PKCE or Tauri command based code exchange, then store token references through secure platform storage instead of exposing raw secrets in the frontend.

## SQLite

Syncora uses SQLite only. The initial schema includes:

- `accounts`
- `email_threads`
- `email_messages`
- `app_settings`
- `email_search` FTS5 virtual table

## Roadmap

- Phase 1: foundation, architecture, docs
- Phase 2: polished app shell, sidebar, inbox, split panes
- Phase 3: Google OAuth, multi-account management, token refresh
- Phase 4: Gmail API sync, normalization, unified inbox merge
- Phase 5: SQLite caching and FTS5 search
- Phase 6: notifications, shortcuts, command palette workflows
- Phase 7: rendering, memory, and animation optimization
- Phase 8: first public release preparation

## Contributing

Contributions are welcome once the public repository is opened. Please read [CONTRIBUTING.md](CONTRIBUTING.md), use conventional commits, and keep pull requests focused.

## License

MIT. See [LICENSE](LICENSE).

