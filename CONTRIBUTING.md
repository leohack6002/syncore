# Contributing to Syncora

Thanks for taking the time to improve Syncora. This project aims to be calm, focused, and contributor-friendly.

## Workflow

1. Fork the repository.
2. Create a branch from `main`.
3. Use a clear branch name such as `feature/settings-polish`, `fix/oauth-timeout`, or `docs/readme-update`.
4. Make focused changes.
5. Run validation locally.
6. Open a pull request with a clear description and testing notes.

## Local Setup

```bash
npm install
cp .env.example .env
cp src-tauri/.env.example src-tauri/.env
npm run tauri:dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item src-tauri/.env.example src-tauri/.env
npm run tauri:dev
```

Never commit `.env`, `src-tauri/.env`, OAuth secrets, API keys, keyring exports, SQLite database files, or generated build output.

## Validation

Run these before opening a pull request:

```bash
npm run typecheck
npm run lint
cd src-tauri
cargo check
```

For release-facing changes, also run:

```bash
npm run tauri:build
```

## Pull Request Checklist

- The PR focuses on one feature, fix, or documentation update.
- The description explains what changed and why.
- UI changes include screenshots or a short screen recording.
- New behavior is documented in README, demo docs, or CHANGELOG when relevant.
- Validation commands and results are included in the PR body.
- No unrelated formatting churn or generated artifacts are included.

## Commit Style

Use short, conventional commit messages:

```text
feat: add account reconnect state
fix: handle oauth callback timeout
docs: refresh setup guide
refactor: simplify folder filtering
```

## Code Style

- Prefer existing project patterns over new abstractions.
- Keep errors user-facing and actionable.
- Keep secrets in native env files or keyring storage, never in frontend code.
- Avoid broad refactors in feature PRs.
- Add comments for exported APIs and non-obvious logic.

## License

By contributing, you agree that your contributions are licensed under the MIT license.
