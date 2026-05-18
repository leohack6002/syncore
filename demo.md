# Syncora Application Guide

This file explains what Syncora is, how the application works, what changed from the beginning of the project to the current build, which files are in the application, what each file is used for, and how Google Gmail, local storage, desktop commands, and AI assistance are connected.

## What Syncora Is

Syncora is a Tauri desktop Gmail workspace built with React, TypeScript, Vite, Tailwind CSS, Zustand, SQLite, and Rust. It provides a local-first email interface with Gmail OAuth, SQLite caching, search, folder navigation, settings, account filtering, message actions, optional Claude assistance, and generated desktop app icons.

The app is designed as a desktop client, not a browser-only Gmail wrapper. React renders the workspace, Rust handles native OAuth and Gmail network calls, and SQLite keeps the local inbox fast and searchable.

## Current Application Capabilities

- Desktop Gmail connection through Google OAuth 2.0 PKCE.
- The frontend `.env` only contains `VITE_GOOGLE_CLIENT_ID`; the OAuth client secret lives in `src-tauri/.env` as `GOOGLE_CLIENT_SECRET`.
- Gmail access tokens and refresh tokens are stored in the OS keyring, not in frontend state.
- Gmail API calls go through native Tauri commands.
- Email accounts, threads, messages, search text, labels, read/starred state, and sync metadata are cached in SQLite.
- Inbox rows are virtualized for smoother rendering.
- Gmail sync is paced and guarded to reduce lag, freezes, duplicate sync work, and networking spikes.
- Thread bodies are fetched only when needed instead of downloading every email body during startup.
- Sidebar folder counts, per-account filtering, local search, quick filters, load-more pagination, reader actions, trash actions, settings, and command palette actions are wired into the local workspace.
- Reader actions can archive, move to inbox, star, move to trash, mark read/unread, print, and permanently delete from trash.
- The reader includes an AI prompt bar that calls a native `ask_anthropic` command when `ANTHROPIC_API_KEY` is configured in `src-tauri/.env`.
- Desktop notifications are disabled in the current build.

## Application Data Reference

This section records the application data that Syncora currently uses across configuration, local storage, runtime state, Gmail normalization, and the native Tauri boundary.

### Product Metadata

| Field | Value | Source |
| --- | --- | --- |
| App name | Syncora | `package.json`, `src-tauri/tauri.conf.json`, brand palette |
| Package name | `syncora` | `package.json` |
| Version | `0.1.0` | `package.json`, `src-tauri/tauri.conf.json` |
| Bundle identifier | `dev.syncora.desktop` | `src-tauri/tauri.conf.json` |
| Category | Productivity | `src-tauri/tauri.conf.json` |
| Short description | Unified Gmail desktop workspace | `src-tauri/tauri.conf.json` |
| Long description | Syncora combines multiple Gmail accounts into a fast, local-first unified desktop inbox. | `src-tauri/tauri.conf.json` |
| Frontend dev URL | `http://localhost:1420` | `src-tauri/tauri.conf.json` |
| Frontend production output | `dist/` | `src-tauri/tauri.conf.json` |
| Local SQLite database | `sqlite:syncora.db` | `src/database/client.ts`, `src-tauri/tauri.conf.json` |

### Environment Variables

| Variable | Required | Purpose | Notes |
| --- | --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google desktop OAuth client id. | Must be the raw client id, without quotes or spaces, and must end with `.apps.googleusercontent.com`. |
| `GOOGLE_CLIENT_SECRET` | Yes for native OAuth token exchange | Google OAuth client secret read by Rust. | Stored in `src-tauri/.env`, not frontend `.env`. |
| `ANTHROPIC_API_KEY` | Optional | Enables the AI assistant prompt in the reader. | Stored in `src-tauri/.env`, not frontend `.env`. |

No client secret, static redirect URI, access token, refresh token, Gmail credential, or Anthropic API key belongs in the frontend `.env`. Native-only secrets are stored in `src-tauri/.env`, read by Rust at build time through `option_env!`, and never exposed to React.

### Brand Data

| Token | Value | Use |
| --- | --- | --- |
| Name | Syncora | Product and bundle name. |
| Tagline | Unified Communication Workspace | Brand and product positioning. |
| `ink` | `#07090F` | Deep app background. |
| `graphite` | `#0B0E17` | Secondary dark surface. |
| `slate` | `#151A27` | Elevated surface. |
| `line` | `#263042` | Borders and dividers. |
| `white` | `#F8FBFF` | Primary foreground text. |
| `muted` | `#94A3B8` | Secondary text. |
| `electricCyan` | `#28D7FF` | Primary accent. |
| `signalBlue` | `#318CFF` | Secondary accent. |
| `violet` | `#9B7CFF` | Supporting accent. |
| Interface font | Inter or Segoe UI | Preferred interface typography. |
| Font fallback | `ui-sans-serif, system-ui, sans-serif` | Runtime fallback stack. |

### Frontend Data Models

`src/types/email.ts` defines the shared TypeScript data contracts used by the UI, sync engine, repositories, and Gmail normalization layer.

| Type | Fields | Notes |
| --- | --- | --- |
| `EmailAccount` | `id`, `provider`, `email`, `displayName`, `avatarUrl`, `color`, `lastSyncedAt` | `provider` is currently `"gmail"`. |
| `EmailThread` | `id`, `accountId`, `gmailThreadId`, `senderName`, `senderEmail`, `subject`, `preview`, `labels`, `unread`, `starred`, `receivedAt`, `messageCount` | Thread ids are normalized as `${account.id}:${gmailThread.id}`. |
| `EmailMessage` | `id`, `threadId`, `accountId`, `gmailMessageId`, `from`, `to`, `cc`, `subject`, `bodyHtml`, `bodyText`, `receivedAt`, `attachments` | Message ids are normalized as `${account.id}:${gmailMessage.id}`. |
| `EmailAttachment` | `id`, `filename`, `mimeType`, `size` | Attachment ids come from Gmail payload part `attachmentId`. |
| `SyncStatus` | `"idle"`, `"syncing"`, `"error"` | Stored in Zustand mail state. |
| `SyncError` | `accountId`, `message` | `accountId` is optional for workspace-level errors. |
| `MailFolder` | `"unified"`, `"inbox"`, `"starred"`, `"sent"`, `"trash"`, `"archive"` | Used by sidebar, command palette, and folder filtering. |

### Local Database Schema

SQLite is loaded through the Tauri SQL plugin as `sqlite:syncora.db`. Initialization enables foreign keys, WAL journaling, and a 5000ms busy timeout before applying migrations.

| Table | Key fields | Purpose |
| --- | --- | --- |
| `accounts` | `id`, `provider`, `email`, `display_name`, `avatar_url`, `color`, `access_token_ref`, `refresh_token_ref`, `expires_at`, `last_synced_at`, `created_at`, `updated_at` | Stores local account records and sync timestamps. Real token values are stored in the OS keyring, not SQLite. |
| `email_threads` | `id`, `account_id`, `gmail_thread_id`, `sender_name`, `sender_email`, `subject`, `preview`, `labels`, `unread`, `starred`, `received_at`, `message_count`, `updated_at` | Stores cached thread summaries. `account_id + gmail_thread_id` is unique. |
| `email_messages` | `id`, `thread_id`, `account_id`, `gmail_message_id`, `from_header`, `to_header`, `cc_header`, `subject`, `body_html`, `body_text`, `received_at`, `attachments` | Stores cached messages and hydrated body content. `thread_id + gmail_message_id` is unique. |
| `app_settings` | `key`, `value`, `updated_at` | Stores migration markers such as `migration_1`. |
| `email_search` | `thread_id`, `account_id`, `sender_name`, `sender_email`, `subject`, `body_text`, `labels` | FTS5 virtual table for local thread search. |

Indexes:

| Index | Fields | Purpose |
| --- | --- | --- |
| `idx_threads_received_at` | `email_threads(received_at DESC)` | Fast inbox ordering. |
| `idx_threads_account` | `email_threads(account_id)` | Fast account-scoped reads. |
| `idx_messages_thread` | `email_messages(thread_id)` | Fast conversation hydration. |

### Repository Operations

| Function | Data handled | Behavior |
| --- | --- | --- |
| `upsertAccount` | `EmailAccount` | Inserts or updates account identity, color, avatar, and sync timestamp. |
| `listAccounts` | Accounts | Returns accounts ordered by email. |
| `deleteAccount` | Account id | Deletes an account row and cascades related cached mail. |
| `markAccountSynced` | Account id, timestamp | Updates `last_synced_at`. |
| `upsertThread` | `EmailThread`, `EmailMessage[]` | Upserts thread metadata, updates FTS search, and upserts message rows. Existing message bodies are preserved when metadata-only sync returns empty bodies. |
| `listCachedThreads` | Limit | Returns cached threads ordered newest first. Default limit is 100. |
| `getCachedThread` | Thread id | Returns one cached thread. |
| `updateThreadStarred` | Thread id, starred value | Persists local star changes to `email_threads`, updates `STARRED` labels, and refreshes search labels. |
| `getCachedMessages` | Thread id | Returns messages ordered oldest first. |
| `searchCachedThreads` | Query, limit | Uses FTS5 prefix search and falls back to cached thread listing for empty queries. |
| `hasThread` | Thread id | Checks whether a thread already exists in the local cache. |

### Zustand Runtime State

| Store | State | Purpose |
| --- | --- | --- |
| `useMailStore` | `accounts`, `threads`, `selectedMessages`, `selectedMessagesLoading`, `syncStatus`, `searchQuery`, `error`, `canLoadMoreThreads`, `loadingMoreThreads`, thread actions | Central mail data, sync/error state, load-more state, read/star/archive/trash actions, and local persistence. |
| `useUIStore` | `selectedThreadId`, `activeFolder`, `activeAccountFilter`, `activeView`, `isCommandPaletteOpen`, `sidebarCollapsed` | Central UI navigation, account filtering, settings view state, command palette state, and sidebar state. |

The selected folder is persisted in browser local storage under `syncora:selected-folder`. Valid stored values are `unified`, `inbox`, `starred`, `sent`, `trash`, and `archive`.

### Folder Rules

| Folder | Rule |
| --- | --- |
| Unified | Shows every cached thread. |
| Inbox | Shows threads with the Gmail `INBOX` label. |
| Starred | Shows threads marked `starred` or labeled `STARRED`. |
| Sent | Shows threads with the Gmail `SENT` label. |
| Trash | Shows threads with the Gmail `TRASH` label. |
| Archive | Shows threads that do not have `INBOX`, `SENT`, `TRASH`, or `SPAM`. |

### Gmail API Data

| Gmail type | Fields used | Syncora use |
| --- | --- | --- |
| `GmailThread` | `id`, `historyId`, `messages`, `snippet` | Source object for normalized thread and message data. |
| `GmailMessage` | `id`, `threadId`, `labelIds`, `snippet`, `internalDate`, `payload` | Source object for sender, subject, labels, preview, received time, body, and attachments. |
| `GmailMessagePart` | `partId`, `mimeType`, `filename`, `headers`, `body`, `parts` | Recursive source for body content and attachment metadata. |
| `GmailHeader` | `name`, `value` | Reads `From`, `To`, `Cc`, `Subject`, and `Date`. |
| `GmailLabel` | `id`, `name`, `type` | Label listing support. |

Syncora lists recent Gmail thread ids with:

```text
/threads?maxResults=20&q=in:anywhere newer_than:30d
```

Metadata sync requests use `format=metadata` with selected headers. Full hydration requests use `format=full` only when an opened thread has no cached body content.

### Gmail Normalization Rules

| Input | Output |
| --- | --- |
| Gmail `From` header | Parsed into `senderName` and `senderEmail`; falls back to `Unknown sender` when missing. |
| Gmail `Subject` header | Stored as subject; falls back to `(No subject)`. |
| Gmail `labelIds` | Merged across messages into unique thread labels. |
| Gmail `UNREAD` label | Sets `thread.unread`. |
| Gmail `STARRED` label | Sets `thread.starred`. |
| Gmail `internalDate` | Converted to ISO string for `receivedAt`. |
| Gmail `snippet` | Used as preview before falling back to the first 180 characters of body text. |
| `text/plain` parts | Decoded from base64url into `bodyText`. |
| `text/html` parts | Decoded from base64url into `bodyHtml`. |
| Parts with `filename` and `attachmentId` | Converted to `EmailAttachment` records. |

### Native Tauri Commands

| Command | Input | Output | Purpose |
| --- | --- | --- | --- |
| `app_version` | none | Rust package version string | Exposes native crate version. |
| `start_google_oauth` | `clientId`, `scopes` | OAuth session with `id`, `authUrl`, `redirectUri`, `status`, optional `account`, optional `error` | Starts desktop PKCE OAuth, opens Google consent, and records session state. Rust reads `GOOGLE_CLIENT_SECRET` from `src-tauri/.env` at build time. |
| `oauth_session_status` | `sessionId` | OAuth session | Lets React poll until the OAuth session connects or fails. |
| `gmail_api_request` | `accountId`, `path`, optional `method`, optional `body` | Gmail JSON response | Proxies Gmail API calls through Rust with token refresh and request retry handling. |
| `ask_anthropic` | `prompt`, `emailBody` | Text response | Sends the reader prompt and selected email body to Anthropic when `ANTHROPIC_API_KEY` is configured. |
| `logout_google_account` | `accountId` | none | Removes stored Gmail tokens for the account from the OS keyring. |

### OAuth Session Data

| Field | Meaning |
| --- | --- |
| `id` | Random local session id. |
| `authUrl` | Google authorization URL opened in the system browser. |
| `redirectUri` | Temporary loopback URI such as `http://127.0.0.1:{port}`. |
| `status` | `waiting`, `connected`, or `failed`. |
| `account` | Connected Gmail account data when successful. |
| `error` | User-facing failure message when unsuccessful. |

OAuth polling runs for up to 180 seconds and checks status every 900ms.

### OAuth And Gmail Security Data

| Data | Location | Notes |
| --- | --- | --- |
| OAuth client id | `.env` as `VITE_GOOGLE_CLIENT_ID` | Public desktop client id only. |
| OAuth state | Rust memory | Random 32-character value validated on callback. |
| PKCE verifier | Rust memory | Random 96-character value used during token exchange. |
| PKCE challenge | Google authorization URL | SHA-256 challenge encoded as base64url. |
| Access token | OS keyring | Stored under the `syncora.gmail.tokens` keyring service. |
| Refresh token | OS keyring | Used by Rust to refresh access tokens. |
| Token expiry | OS keyring token set | Refreshed before Gmail calls when needed. |
| Gmail API response data | React and SQLite cache | Sanitized into local models before display. |

OAuth scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/userinfo.email
openid
```

### Sync Runtime Limits

| Setting | Value | Purpose |
| --- | --- | --- |
| Startup sync delay | 1200ms after cached workspace load | Lets the shell render before network sync begins. |
| Background sync interval | 10 minutes | Keeps Gmail accounts fresh without user action. |
| Minimum non-forced sync interval | 30000ms | Prevents repeated automatic sync storms. |
| Background Gmail list size | 20 recent thread ids per account, plus a dedicated Sent query | Keeps automatic sync lightweight. |
| Manual Gmail list size | 50 thread ids per account | Gives user-triggered sync and load-more actions a larger batch. |
| Gmail search window | `newer_than:30d` | Limits initial sync scope. |
| Frontend Gmail request delay | 150ms | Paces Gmail API calls. |
| Frontend Gmail retries | 2 retries | Retries transient request failures. |
| Frontend Gmail request timeout | 35000ms | Prevents stuck frontend waits. |
| Rust HTTP request timeout | 25 seconds | Prevents indefinite native network waits. |
| Rust HTTP connect timeout | 10 seconds | Fails slow connection attempts. |
| OAuth socket read timeout | 120 seconds | Avoids blocking forever while reading callback data while allowing enough time for browser redirects. |

### Tauri Window And Permissions

| Setting | Value |
| --- | --- |
| Main window title | Syncora |
| Initial size | 1320 x 820 |
| Minimum size | 1024 x 640 |
| Resizable | Yes |
| Decorations | Yes |
| Transparent | No |

Permissions:

```text
core:default
opener:default
store:default
sql:default
sql:allow-load
sql:allow-execute
sql:allow-select
```

Content security policy allows app-local resources, data/HTTPS images, inline styles, and connections to Gmail, Google Accounts, and Google OAuth token endpoints.

### UI Commands And Navigation Data

The command palette opens with `Ctrl+K` on Windows/Linux or `Cmd+K` on macOS.

| Command id | Label | Action |
| --- | --- | --- |
| `sync` | Sync Gmail now | Forces account sync. |
| `connect` | Connect Gmail account | Starts Google OAuth. |
| `unified` | Open Unified | Switches to the unified folder. |
| `inbox` | Open Inbox | Switches to inbox. |
| `starred` | Open Starred | Switches to starred. |
| `sent` | Open Sent | Switches to sent. |
| `archive` | Open Archive | Switches to archive. |
| `mark-all-read` | Mark all as read | Marks cached unread threads as read. |
| `account-{id}` | Go to account: account email | Applies a single-account filter. |
| `search` | Search local mail | Writes command input to the local search query. |

Keyboard shortcuts in the main mail view:

| Shortcut | Action |
| --- | --- |
| `Ctrl+K` / `Cmd+K` | Open command palette. |
| `J` | Select next visible thread and mark it read. |
| `K` | Select previous visible thread and mark it read. |
| `E` | Archive selected thread. |
| `S` | Star or unstar selected thread. |
| `#` | Move selected thread to trash. |
| `U` | Toggle selected thread read/unread. |
| `Escape` | Clear thread selection. |

### Dependency Data

Runtime dependencies:

```text
@tauri-apps/api
@tauri-apps/plugin-opener
@tauri-apps/plugin-sql
@tauri-apps/plugin-store
@tanstack/react-query
@tanstack/react-virtual
@radix-ui/react-slot
class-variance-authority
clsx
cmdk
framer-motion
lucide-react
react
react-dom
tailwind-merge
tailwindcss-animate
zustand
```

Development dependencies:

```text
@tauri-apps/cli
@types/node
@types/react
@types/react-dom
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
@vitejs/plugin-react
autoprefixer
eslint
eslint-plugin-react-hooks
eslint-plugin-react-refresh
postcss
prettier
tailwindcss
typescript
vite
```

## Recent Stability And OAuth Fixes

These are the main changes made to stabilize the application:

| Area | Change | Why it matters |
| --- | --- | --- |
| Startup | Added a startup single-flight guard. | Prevents duplicate initialization and sync work, especially under React StrictMode. |
| Sync | Added a sync single-flight guard. | Prevents repeated refresh clicks or commands from starting overlapping Gmail sync jobs. |
| Gmail fetching | Background sync now fetches lightweight Gmail thread metadata first. | Avoids heavy full-body downloads during startup and reduces CPU/network load. |
| Message hydration | Full thread bodies are fetched only when a selected thread needs them. | Keeps the app responsive while still loading complete email content on demand. |
| Networking | Added Gmail request queueing, pacing, retries, and transient error normalization. | Reduces socket pressure and handles temporary Gmail/network failures more gracefully. |
| Rust HTTP | Added shared HTTP client, request/connect timeouts, and retry handling. | Avoids repeatedly constructing clients and prevents indefinite network hangs. |
| OAuth socket | Hardened the local loopback callback socket and `WouldBlock` handling. | Fixes Windows socket errors like `os error 10035`. |
| OAuth flow | Refactored token exchange to explicit desktop PKCE forms. | Ensures Syncora never uses a confidential-client credential or web OAuth flow. |
| UI runtime | Removed expensive per-row inbox animation and memoized hot-path lookups. | Reduces render pressure while keeping the same UI design. |
| Command palette | Decoupled command typing from global Gmail search. | Prevents command input from triggering unnecessary database searches. |
| Dead code | Removed legacy browser-side Gmail OAuth/client placeholder files. | Avoids accidental imports and production-breaking placeholder errors. |
| Env config | Kept the frontend env contract to `VITE_GOOGLE_CLIENT_ID` and moved `GOOGLE_CLIENT_SECRET` to `src-tauri/.env`. | Prevents the secret from being bundled into frontend JavaScript. |

## Changes From Beginning To Current Build

The application started as a desktop foundation and has grown into a working Gmail workspace. The current build includes:

| Area | Current result |
| --- | --- |
| Desktop foundation | Tauri 2 app shell, Rust backend, React frontend, Vite build, Tailwind styling, and Windows bundle configuration are in place. |
| Branding | Syncora logo, favicon, palette, banner, and generated native app icons were added under `public/brand` and `src-tauri/icons`. |
| OAuth | Google desktop OAuth with PKCE, loopback callback handling, state validation, keyring token storage, token refresh, and logout command were added. |
| Gmail bridge | Gmail requests now go through native Tauri commands with Rust-side token refresh and frontend request pacing. |
| Local data | SQLite schema, repositories, account cache, thread cache, message cache, FTS5 search, labels, and sync metadata were added. |
| Mail workspace | Sidebar, unified inbox, folder views, virtualized thread rows, search, reader, command palette, settings, and responsive layout were built. |
| Folder behavior | Unified, Inbox, Starred, Sent, Trash, and Archive are powered by shared folder rules and counts. |
| Message actions | Star, archive, move to trash, move to inbox, mark read/unread, empty trash, permanent delete, print, and local optimistic updates were added. |
| Sync behavior | Startup cache loading, delayed background sync, 10-minute background refresh, manual force sync, Sent sync, load-more pagination, and selected-thread hydration were added. |
| Performance | Startup single-flight guard, sync single-flight guard, Gmail pacing, request timeouts, metadata-first sync, stable virtual row sizing, and debounced search were added. |
| Reader safety | Gmail HTML is sanitized and rendered inside a sandboxed iframe. |
| AI assistance | Reader prompt bar and native `ask_anthropic` command were added for summaries, action items, draft replies, and custom prompts. |
| Settings | Settings view now includes accounts, appearance toggles, notification status, sync status, account disconnect, and manual sync. |
| Notifications | Native notification code was removed/disabled for this build; the settings page shows that desktop notifications are disabled. |

## Recent UI/UX Fixes

These changes fix the latest reader, inbox, startup, and folder behavior bugs:

| Area | Change | Why it matters |
| --- | --- | --- |
| Message reader | Email `bodyHtml` now renders inside a sandboxed iframe after sanitization. | Prevents raw HTML/CSS from appearing as plain text and isolates email markup from the app shell. |
| Email sanitization | Blocked tag contents such as `<style>` and `<script>` are removed, not only their tags. | Stops stripped email CSS or script text from leaking into the visible message body. |
| Inbox list | Virtualized rows now have a stable 132px height and a fixed scroll container with vertical overflow. | Prevents overlapping rows and allows the middle pane to scroll through all visible emails. |
| Startup screen | `index.html` includes an immediate dark fallback loader with `#07090f`. | Hides the white startup flash before React finishes initializing. |
| Star action | Reader and inbox star buttons now call the Zustand store and persist to local SQLite. | Star changes update the UI immediately and survive cache reloads. |
| Archive folder | Archive filtering uses threads without `INBOX`, `SENT`, `TRASH`, or `SPAM` labels. | Shows locally cached archived mail instead of incorrectly returning an empty folder. |
| Account filtering | Sidebar account rows can filter the inbox to one Gmail account. | Makes multi-account reading easier. |
| Quick filters | Inbox filter menu can show all, unread, read, or starred threads. | Helps narrow large cached mail lists. |
| Trash workflow | Trash folder supports empty trash and per-thread permanent delete. | Completes the local deletion flow. |
| Settings | Settings page was added for accounts, appearance toggles, notification status, and sync status. | Gives workspace controls a dedicated view. |
| AI prompt bar | Reader footer can summarize, extract action items, draft replies, or accept a custom prompt. | Adds Claude-powered assistance when configured. |

## Main Application Flow

1. `index.html` loads the frontend entry point.
2. `src/app/main.tsx` mounts the React app inside the query provider and error boundary.
3. `src/app/App.tsx` initializes SQLite, loads cached workspace data, starts account sync, and registers the command palette shortcut.
4. `src/layouts/AppShell.tsx` renders the desktop workspace.
5. Feature components render the sidebar, inbox, mail reader, settings page, and command palette.
6. Services handle Gmail auth, Gmail API access, SQLite sync, AI prompts, and Tauri backend calls.
7. `src-tauri/src/lib.rs` provides native Rust commands for OAuth, Gmail API proxying, Claude/Anthropic requests, keyring storage, and plugins.

## How Google Gmail Is Connected

Syncora uses Google OAuth 2.0 PKCE for desktop applications.

### Required Google Setup

In Google Cloud:

1. Enable the Gmail API.
2. Configure the OAuth consent screen.
3. Create an OAuth Client ID with application type `Desktop app`.
4. Copy the desktop client id into `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

No confidential-client credential is required or used. Desktop OAuth clients with PKCE do not use one.

### OAuth PKCE Flow In Syncora

1. The user clicks `Add Gmail account`.
2. `src/services/auth/native-auth.ts` validates `VITE_GOOGLE_CLIENT_ID`.
3. The frontend calls the native Tauri command `start_google_oauth`.
4. Rust creates:
   - a random OAuth `state`
   - a PKCE `code_verifier`
   - a SHA-256 `code_challenge`
   - a temporary local loopback redirect URI like `http://127.0.0.1:{port}`
5. Rust opens the Google consent screen in the system browser.
6. Google redirects back to the local loopback listener with an authorization code.
7. Rust validates the `state`.
8. Rust exchanges the code at Google using only:
   - `client_id`
   - `code`
   - `code_verifier`
   - `grant_type=authorization_code`
   - `redirect_uri`
9. Rust fetches the Gmail profile, builds the Syncora account record, and stores tokens in the OS keyring.
10. React reloads the local workspace and starts Gmail sync.

### Token Storage And Refresh

Gmail tokens are not exposed to React components. They are stored in the operating system keyring through Rust. When Gmail data is needed, the frontend calls a Tauri command, and Rust:

1. loads the account token from the keyring
2. refreshes it if needed
3. calls the Gmail API
4. returns sanitized JSON data to the frontend

Refresh also uses the desktop public-client flow and sends no confidential-client credential.

### Gmail Sync Flow

1. `syncAllAccounts` loads connected accounts from SQLite.
2. Each account is synced one at a time.
3. Sync fetches recent Gmail thread ids.
4. Sync fetches metadata for each thread and writes thread summaries to SQLite.
5. The UI reads from SQLite first, so cached data appears quickly.
6. When a user opens a thread, Syncora fetches the full Gmail thread body if the local cache does not already have it.
7. The UI refreshes from SQLite so new cached threads, labels, and message bodies appear in the workspace.

This design keeps startup fast and avoids downloading every message body during initial sync.

## How AI Assistance Works

The mail reader includes a footer prompt bar with preset actions for summarizing a thread, finding action items, and drafting a reply. It can also accept a custom prompt.

1. `src/features/mail-reader/MailReader.tsx` gathers the selected thread body text.
2. The reader calls `askAnthropic` from `src/services/ai/anthropic.ts`.
3. `askAnthropic` invokes the native Tauri command `ask_anthropic`.
4. Rust reads `ANTHROPIC_API_KEY` from `src-tauri/.env` at build time.
5. Rust sends the prompt and email body to Anthropic and returns the text response to React.
6. The reader displays the response or a user-facing error.

AI assistance is optional. If `ANTHROPIC_API_KEY` is missing, Gmail and local mail features still work, but AI prompts return a configuration error.

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
| `index.html` | Vite HTML entry point, favicon link, theme color, root div, and immediate dark startup fallback. | Browser shell for the React frontend. |
| `package.json` | npm scripts, app metadata, dependencies, and dev dependencies. | Runs development, build, lint, Tauri, and icon-generation commands. |
| `package-lock.json` | Locked npm dependency tree. | Keeps installs reproducible. |
| `postcss.config.js` | PostCSS setup. | Enables Tailwind processing. |
| `tailwind.config.ts` | Tailwind theme, content paths, colors, animations, and plugins. | Controls the app styling system. |
| `tsconfig.json` | TypeScript settings for the frontend. | Validates app source code. |
| `tsconfig.node.json` | TypeScript settings for Node-based config files. | Supports Vite and tooling config. |
| `vite.config.ts` | Vite configuration and path aliases. | Builds and serves the frontend. |

Native-only environment example:

| File | What it contains | Use |
| --- | --- | --- |
| `src-tauri/.env.example` | Example `GOOGLE_CLIENT_SECRET` and `ANTHROPIC_API_KEY` values. | Copy to `src-tauri/.env` for Rust-side OAuth and AI configuration. |

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
| `src/app/main.tsx` | React root creation, global CSS import, error boundary, and query provider setup. | Starts the frontend application. |
| `src/app/App.tsx` | App initialization, database loading, account sync startup, and command palette keyboard shortcut. | Coordinates startup behavior. |
| `src/app/ErrorBoundary.tsx` | React error boundary with a recovery screen and development-only diagnostics. | Prevents render crashes from leaving a blank app window. |
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
| `src/features/inbox/InboxList.tsx` | Search field, sync button, quick filter menu, scrollable virtualized thread list, load-more control, trash controls, star/read actions, empty/error states, and thread selection. | Main inbox and folder list surface. |
| `src/features/mail-reader/MailReader.tsx` | Selected email thread reader, sandboxed HTML body rendering, message metadata, archive/inbox/trash/star/read actions, attachments, print action, and AI prompt bar. | Displays and acts on opened conversations. |
| `src/features/settings/SettingsPage.tsx` | Accounts, appearance, notifications, and sync settings tabs. | Lets users manage accounts, disconnect Gmail, view sync status, and run manual sync. |

### Hooks

| File | What it contains | Use |
| --- | --- | --- |
| `src/hooks/use-debounced-value.ts` | Debounced value hook. | Prevents search from updating too aggressively. |
| `src/hooks/use-workspace.ts` | Mutation hooks for Gmail connection and sync. | Connects UI actions to data services. |

### Database

| File | What it contains | Use |
| --- | --- | --- |
| `src/database/client.ts` | SQLite connection and initialization logic. | Opens and prepares the local database. |
| `src/database/schema.ts` | SQL schema for accounts, threads, messages, settings, indexes, and FTS5 search. | Defines local storage structure. |
| `src/database/repositories.ts` | Read/write helpers for accounts, email threads, messages, star persistence, sync metadata, and search. | Encapsulates database operations. |

### Services

| File | What it contains | Use |
| --- | --- | --- |
| `src/services/tauri.ts` | Tauri environment/helper boundary. | Keeps frontend safe when checking native availability. |
| `src/services/ai/anthropic.ts` | Frontend wrapper around the native `ask_anthropic` command. | Powers the reader AI prompt bar. |
| `src/services/auth/native-auth.ts` | Frontend wrapper around native Google OAuth commands. | Connects Gmail accounts. |
| `src/services/gmail/native-client.ts` | Queued and paced Gmail calls routed through native Tauri commands. | Fetches Gmail data without exposing tokens to the frontend. |
| `src/services/gmail/normalize.ts` | Gmail thread/message normalization. | Converts Gmail API responses into Syncora email models. |
| `src/services/sync/sync-engine.ts` | Workspace loading, guarded account sync, Gmail metadata fetch, SQLite writes, load-more pagination, selected-message hydration, and user-facing sync errors. | Core data synchronization engine. |

### State

| File | What it contains | Use |
| --- | --- | --- |
| `src/store/mail-store.ts` | Zustand store for accounts, threads, selected messages, loading flags, search, sync status, errors, pagination state, and thread actions. | Central mail state and optimistic local action layer. |
| `src/store/ui-store.ts` | Zustand store for selected thread, folder, account filter, settings/mail view, command palette state, and sidebar state. | Central UI state. |

### Styling, Types, And Utilities

| File | What it contains | Use |
| --- | --- | --- |
| `src/styles/globals.css` | Tailwind layers, CSS variables, dark theme, and global styles. | Controls the app visual baseline. |
| `src/types/email.ts` | Shared email account, thread, message, attachment, and sync types. | Common app data contracts. |
| `src/lib/query-client.ts` | TanStack Query client setup. | Controls request caching and query behavior. |
| `src/lib/mail-folders.ts` | Folder filtering and folder count helpers. | Powers sidebar folder views and visible thread selection. |
| `src/lib/utils.ts` | Class name merging and date formatting helpers. | Shared UI utilities. |
| `src/utils/sanitize-email.ts` | Email HTML sanitization helper that strips blocked tags and their contents before iframe rendering. | Reduces unsafe or messy email rendering. |

## Tauri And Rust Source

| File | What it contains | Use |
| --- | --- | --- |
| `src-tauri/Cargo.toml` | Rust package metadata and dependencies. | Defines the native app crate. |
| `src-tauri/Cargo.lock` | Locked Rust dependency tree. | Keeps Rust builds reproducible. |
| `src-tauri/build.rs` | Tauri build script. | Runs Tauri build-time setup. |
| `src-tauri/tauri.conf.json` | Product name, bundle identifier, window config, build hooks, CSP, bundle targets, and app icons. | Main Tauri desktop configuration. |
| `src-tauri/capabilities/default.json` | Tauri permission capability file for core, opener, store, and SQL plugins. | Controls frontend access to native APIs. |
| `src-tauri/src/main.rs` | Native app binary entry point. | Starts the Rust/Tauri application. |
| `src-tauri/src/lib.rs` | Native commands for desktop PKCE OAuth, token storage, Gmail API proxying, Anthropic requests, retry/timeout handling, plugins, and app setup. | Main Rust backend logic. |

## Runtime And Networking Notes

Syncora has several guards to keep the desktop app responsive:

- Startup work is deduplicated.
- Gmail sync work is deduplicated.
- Gmail API calls are queued and lightly paced in the frontend service layer.
- Native Gmail HTTP calls have connection and request timeouts.
- Transient network errors are retried where safe.
- OAuth loopback sockets handle temporary `WouldBlock` states.
- Stale async results are ignored if the user has already selected a different thread.
- Search input is debounced before hitting SQLite.
- Inbox rows are virtualized with stable row sizing and a dedicated scroll container.
- Email HTML is sanitized and rendered in an isolated reader iframe.

These choices are intended to prevent system lag, UI freezing, repeated sync storms, and raw socket errors from surfacing directly to the user.

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

## Environment Configuration

Local development requires a `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

After changing `.env`, restart the Vite/Tauri dev server. Vite reads `VITE_` variables at startup.

Do not add a client secret or redirect URI to the frontend `.env`. Syncora creates the temporary loopback redirect URI at runtime.

The Rust side also requires `src-tauri/.env`:

```env
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ANTHROPIC_API_KEY=your-anthropic-api-key
```

These values are read by `src-tauri/build.rs` and exposed only to Rust compile-time code. `ANTHROPIC_API_KEY` is optional if you do not need the reader AI prompt bar.

## Current Build Output

When `npm run tauri:build` succeeds on Windows, release installers are generated under:

```text
src-tauri/target/release/bundle/
```

That folder is build output and is intentionally ignored by git.
