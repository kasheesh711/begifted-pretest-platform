# BeGifted Pre-Test Platform

Monorepo bootstrap for the BeGifted pre-test platform and its multi-agent delivery workflow.

## What this repo contains

- `apps/web`: parent/admin portal and student test-taking frontend
- `apps/api`: backend API and background job entrypoints
- `packages/core`: shared types, grading helpers, diagnostics contracts
- `packages/ui`: shared UI primitives for the web app
- `packages/content-tools`: import and validation tooling for assessment content
- `packages/config`: shared repo and tooling conventions
- `docs`: product, architecture, testing, and agent handoff documents
- `content`: raw assets, normalized JSON, extracted assets, and QA state
- `.github`: issue templates, PR template, and GitHub Actions workflows
- `scripts`: local automation for worktrees, GitHub setup, and agent status

## Quick start

```bash
npm install
npm run build
npm run lint
npm run typecheck
npm run test
```

## Agent workflow

1. Read [AGENTS.md](./AGENTS.md).
2. Pull a scoped issue from GitHub Projects.
3. Create a dedicated worktree with `npm run agent:new-worktree -- <agent-name> <issue-id> <slug>`.
4. Work only inside the task's declared write scope.
5. Open a PR using the repository templates and handoff contract.

Supported agent runtimes include Codex, Claude Code, and Gemini via Antigravity, as long as each active session follows the same worktree, issue, and write-scope rules.

To launch multiple agents automatically from GitHub-ready issues, use the local supervisor described in [docs/ORCHESTRATION.md](./docs/ORCHESTRATION.md).

## GitHub setup

Run the bootstrap helper after creating the GitHub repository and authenticating `gh`:

```bash
npm run github:bootstrap
```

That script creates baseline labels and prints the remaining manual setup for branch protection and GitHub Projects.
