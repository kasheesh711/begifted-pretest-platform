# Agent Operating Manual

This repository is designed for concurrent work by Codex and Claude Code sessions. Repo state must stay understandable without relying on chat history.

## Repo map

- `apps/web`: student-facing assessment app and internal portal UI
- `apps/api`: API routes, auth, invitations, and background job orchestration entrypoints
- `packages/core`: shared contracts, grading rules, diagnostics, recommendation logic
- `packages/ui`: shared React UI primitives and design tokens
- `packages/content-tools`: import, normalization, and content validation tooling
- `packages/config`: shared conventions and configuration references
- `content`: raw source files, normalized JSON, extracted assets, QA records
- `docs`: product, technical, and operating documentation
- `.github`: GitHub automation, issue forms, PR templates, workflow rules
- `scripts`: local helper scripts for worktrees, GitHub bootstrap, and agent reporting

## Approved tools

- Git and GitHub CLI
- npm workspaces and Turbo
- TypeScript, Vitest, Biome
- Vercel, Supabase, GitHub Actions, and GitHub Projects once configured
- `scripts/orchestrate-agents.mjs` as the local supervisor for dispatching ready issues into provider-specific worktrees

Do not introduce new infrastructure or orchestration tooling without recording the change in `docs/DECISIONS.md`.

## Agent roster

- `PM/Spec Agent`: PRD, roadmap, task breakdown, acceptance criteria, decision records
- `Platform Agent`: backend services, auth, data model wiring, background jobs, external integrations
- `Frontend Agent`: portal UX, student assessment experience, shared web interactions
- `Content Pipeline Agent`: importers, schemas, extraction, normalization, content QA tooling
- `Grading/Diagnostics Agent`: scoring engine, rubric support, recommendation rules, report generation
- `QA/Ops Agent`: CI, tests, GitHub automation, deployment, observability, release readiness

Codex and Claude Code may both fill these roles. The role and write scope matter more than the model provider.

Detailed write scopes live in [docs/AGENT_ROLES.md](./docs/AGENT_ROLES.md).

## Worktree protocol

One agent works in one branch and one worktree. Never share an editable checkout across agents.

Recommended layout:

- main checkout: `/workspace/main`
- agent worktrees: `/workspace/agents/<agent-name>-<issue-id>`

For local bootstraps outside that layout, use the helper:

```bash
npm run agent:new-worktree -- <agent-name> <issue-id> <slug> [branch-type]
```

Branch naming:

- `codex/feat/<issue-id>-<slug>`
- `codex/fix/<issue-id>-<slug>`
- `codex/chore/<issue-id>-<slug>`

## Ownership boundaries

- Agents may read anything in the repository.
- Agents may only edit files inside the task's declared write scope.
- Shared contracts in `packages/core` and `docs` require an explicit coordination issue when changed by implementation agents.
- Cross-cutting changes must land contract-first. Downstream implementation tasks should reference the contract issue.
- No two agents should own the same write scope simultaneously unless one is assigned as reviewer only.

## Task intake rules

Every implementation task must link to one GitHub issue and include:

- problem statement
- scope and non-goals
- owning agent role
- exact write scope
- dependencies and blockers
- acceptance criteria
- required validation

Use the issue templates in `.github/ISSUE_TEMPLATE`.

## PR requirements

Every PR must:

- link the issue
- describe the exact scope completed
- list changed files or subsystems
- state tests and checks run
- call out open risks
- include screenshots for UI changes
- note migration or event-contract impact when applicable

Use `.github/PULL_REQUEST_TEMPLATE.md`.

Governance automation evaluates every PR for lane selection, bot approval, shared-contract changes, shared-scope changes, and release eligibility.

## Handoff contract

Every handoff comment or PR description must include:

- issue id and branch name
- objective completed
- files changed
- tests or checks run
- unresolved risks
- exact next recommended task
- whether the change is safe to merge

Use [docs/HANDOFF_TEMPLATE.md](./docs/HANDOFF_TEMPLATE.md).

## Merge conflict policy

- Never resolve another agent's conflict by discarding their work silently.
- Rebase or merge only after reading the conflicting area and updating the task comment.
- If scope drift appears, stop and create a coordination issue before continuing.

## Forbidden actions

- editing outside declared write scope without coordination
- force-pushing over another agent's branch
- merging without passing required checks
- changing infra, auth, or contracts without updating `docs/DECISIONS.md`
- relying on local-only state that is not captured in issues, PRs, docs, or committed files

## Automated governance

- Fast-lane PRs can be bot-approved and set to auto-merge when checks pass.
- Coordinated PRs can still be bot-approved if they satisfy machine policy requirements.
- Shared contract or infra changes must update `docs/DECISIONS.md`.
- Shared contract changes must also update one or more of `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, or `docs/CONTENT_MODEL.md`.
- Releases are decided automatically from merged change sets on `main`.

## Definition of done

### Documentation tasks

- required doc updated
- related decision recorded
- tests and workflow references remain accurate

### Application tasks

- acceptance criteria met
- lint, typecheck, and relevant tests pass
- docs updated if behavior or contracts changed
- PR includes screenshots or payload examples when useful

### Content tasks

- schema-valid content
- asset references resolve
- QA state recorded
- diagnostic tags and grading mode assigned
