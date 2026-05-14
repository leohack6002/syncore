# Contributing to Syncora

Thanks for helping build Syncora.

## Branch Strategy

- `main`: stable production-ready code
- `develop`: active integration branch
- `feature/*`: feature work
- `ui/*`: UI-focused work
- `fix/*`: bug fixes

Create feature branches from `develop`.

## Commit Convention

Use conventional commits:

```text
feat: add Gmail OAuth integration
fix: resolve token refresh issue
ui: redesign sidebar layout
refactor: optimize email caching
docs: update installation guide
```

## Pull Requests

Each PR should:

- Focus on one feature or fix
- Include a clear description
- Include screenshots for UI changes
- Avoid unrelated modifications
- Include testing notes

## Local Setup

```bash
npm install
cp .env.example .env
npm run tauri:dev
```

Never commit `.env`, OAuth secrets, tokens, or SQLite database files.

