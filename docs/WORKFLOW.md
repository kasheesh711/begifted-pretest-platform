# Workflow

## Issue lifecycle

1. PM/Spec Agent or human creates the issue with the required template.
2. Issue is added to GitHub Project and marked `Ready`.
3. Assigned agent creates a dedicated worktree and branch.
4. Agent moves issue to `In Progress`.
5. Agent opens a draft PR early if work spans multiple sessions.
6. Agent updates the issue or PR with handoff status when blocked or done.
7. Reviewer moves item to `In Review`.
8. After approval and passing checks, item is squashed into `main`.
9. Project card moves to `Done`.

The same workflow applies whether the active implementation session is Codex or Claude Code.

## PR lifecycle

- draft PR while implementation is still moving
- ready for review only after lint, typecheck, and relevant tests pass locally
- governance automation checks scope, contracts, docs, risk notes, and release eligibility
- merge uses squash only
- eligible PRs are bot-approved and auto-merged

## Release flow

- merge to `main`
- CI validates `main`
- release notes are generated automatically from `main` when merged changes are release-worthy
- deployment decisions should consume the automated release signal rather than manual chat approval

## Blocking rules

- if a dependency issue is unresolved, mark the task `Blocked`
- if a contract needs to change, create the contract issue first
- if two agents need the same scope, split the work or serialize it
