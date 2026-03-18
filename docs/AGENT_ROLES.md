# Agent Roles and Write Scopes

These roles are provider-agnostic. Codex and Claude Code can be assigned to any role as long as the task, write scope, and review rules are unchanged.

## PM/Spec Agent

- owns: `docs/PRD.md`, `docs/DECISIONS.md`, issue definitions, milestones, acceptance criteria
- may touch: `docs/*.md`, `.github/ISSUE_TEMPLATE/*`
- should not implement runtime code unless task explicitly says so

## Platform Agent

- owns: `apps/api/**`, data access layers, auth flows, background job wiring
- may touch: `packages/core/**` only through coordination issues

## Frontend Agent

- owns: `apps/web/**`, shared UI usage, interaction states, visual QA
- may touch: `packages/ui/**`

## Content Pipeline Agent

- owns: `packages/content-tools/**`, `content/**`
- may touch: docs related to import and QA workflows

## Grading/Diagnostics Agent

- owns: `packages/core/**` for grading, diagnostics, recommendations, report payload generation
- coordinates with Platform Agent before changing API contracts

## QA/Ops Agent

- owns: `.github/**`, `scripts/**`, CI, build tooling, environment/runbooks
- may touch: root config files and `infra/**`

## Shared contract surfaces

- `packages/core/**`
- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`

Changes to shared contract surfaces require a linked coordination issue and affected-agent review.
