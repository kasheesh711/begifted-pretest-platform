# Dry Run Coordination Exercise

Use these three sample tasks to test the multi-agent workflow before feature development begins.

## Issue A: Content ingestion seed

- owner: Content Pipeline Agent
- scope: `packages/content-tools/**`, `content/**`
- goal: import one objective-heavy science paper into normalized JSON and QA record

## Issue B: Backend grading route

- owner: Platform Agent
- scope: `apps/api/**`
- goal: expose grading and review queue seed endpoints using contracts from `packages/core`

## Issue C: Frontend invite shell

- owner: Frontend Agent
- scope: `apps/web/**`, `packages/ui/**`
- goal: build a staff-facing invite creation screen shell and a student landing route

## Exercise success criteria

- each issue has one owner and write scope
- each owner works in a dedicated worktree
- all three issues can progress in parallel without file contention
- PRs include the required handoff block

