# Ops Runbook

## Local setup

```bash
npm install
npm run build
npm run lint
npm run typecheck
npm run test
```

## Git bootstrap

```bash
git init -b main
gh repo create
npm run github:bootstrap
```

## GitHub manual setup

After repository creation:

1. enable branch protection on `main`
2. require PR reviews and status checks
3. create the GitHub Project fields listed below
4. set repository variable `PROJECT_V2_URL` if using automatic project assignment

## Recommended GitHub Project fields

- `Status`
- `Agent Owner`
- `Area`
- `Priority`
- `Blocked By`
- `PR Link`
- `Worktree`
- `Risk`
- `Target Milestone`

## Secrets and environment

Do not commit secrets. Use provider-managed secrets for:

- Supabase
- email provider
- Sentry
- Trigger.dev or Inngest
- Vercel

## Release basics

- all merges land through PRs
- `main` is the only release branch
- staging and production environment setup should be recorded before the first live deploy
