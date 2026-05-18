# Contributing to Syncora

Thanks for wanting to help with Syncora. This is a personal open source project, and I want it to feel welcoming to people who care about calm desktop software, local-first tools, and thoughtful email workflows.

You do not need to make a huge contribution to be useful. A clear bug report, a small fix, a docs improvement, or a focused UI polish PR is very welcome.

## Fork And Clone

1. Fork the repository on GitHub.
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/syncora.git
cd syncora
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/leohack6002/syncora.git
```

4. Create a branch from `main`:

```bash
git checkout -b feature/short-description
```

## Branch Naming

Use one of these prefixes:

```text
feature/add-reader-shortcut
fix/oauth-timeout-message
chore/update-dependencies
```

- `feature/` for new user-facing behavior
- `fix/` for bugs and regressions
- `chore/` for maintenance, docs, tooling, and cleanup

## Run Locally

Install dependencies:

```bash
npm install
```

Create local env files:

```bash
cp .env.example .env
cp src-tauri/.env.example src-tauri/.env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item src-tauri/.env.example src-tauri/.env
```

Add your Google OAuth Desktop app values:

```env
# .env
VITE_GOOGLE_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

```env
# src-tauri/.env
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Run the desktop app:

```bash
npm run tauri:dev
```

## Validation

Please run these before opening a pull request:

```bash
npm run typecheck
npm run lint
cd src-tauri
cargo fmt --check
cargo check
```

For release or packaging changes, also run:

```bash
npm run tauri:build
```

## Code Style

- TypeScript should stay strict and strongly typed.
- Avoid `any`; prefer explicit types or `unknown` with narrowing.
- Do not leave `console.log` in production paths.
- React components use PascalCase.
- Variables and functions use camelCase.
- Rust code should pass `cargo fmt`.
- Rust errors returned to the frontend should be readable and helpful.
- Keep secrets out of frontend code and out of git.
- Keep pull requests focused; avoid unrelated formatting churn.

## Pull Request Checklist

Before opening a PR, please check:

- The PR has a clear title and description.
- The change is focused on one feature, fix, or cleanup.
- TypeScript and Rust validation commands pass.
- UI changes include screenshots or a short video.
- Docs are updated if behavior, setup, shortcuts, or env variables changed.
- No `.env`, database files, build output, or generated artifacts are committed.
- The PR explains any known limitations or follow-up work.

## Reporting Bugs

Please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

A helpful bug report includes:

- What you expected to happen
- What actually happened
- Steps to reproduce
- OS and app version
- Relevant logs or screenshots
- Whether the issue happens consistently or only sometimes

## Suggesting Features

Please use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

Good feature requests explain the workflow, why it matters, and what a simple first version could look like.

## License

By contributing to Syncora, you agree that your contribution is licensed under the MIT License.
