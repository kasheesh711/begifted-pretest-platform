# Codex Handoff

## Assignment

- Agent: Codex
- Role: Platform Agent
- Issue: `#3`
- Issue URL: `https://github.com/kasheesh711/begifted-pretest-platform/issues/3`
- Branch: `codex/feat/3-grading-shell`
- Worktree: `/Users/kevinhsieh/Desktop/workspace/agents/codex-platform-3`

## Objective

Expose grading and review-queue seed endpoints using the shared contracts.

## Allowed write scope

- `apps/api/**`
- coordinated shared-contract edits only if absolutely necessary

Do not build the frontend or content import flow in this issue.

## First-read files

1. `AGENTS.md`
2. `docs/API_CONTRACTS.md`
3. `docs/DATA_MODEL.md`
4. `apps/api/src/server.ts`
5. `apps/api/test/health.test.ts`
6. `packages/core/src/index.ts`

## Deliverables

- seed grading route coverage beyond the current trivial evaluator
- review-queue shell route aligned with the documented API surface
- integration tests covering the new route behavior

## Acceptance criteria

- API exposes seed grading and review-queue routes aligned with `docs/API_CONTRACTS.md`
- handlers reuse shared logic from `packages/core` rather than duplicating rule logic
- integration tests cover new behavior
- docs update if the route surface changes

## Constraints

- keep this issue at the shell and contract-aligned layer
- do not introduce real auth, database persistence, or job orchestration here
- if `packages/core` must change, keep the change minimal and call it out clearly in handoff notes

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test:integration`

## Handoff expectation

On pause or completion, provide:

- routes added or changed
- payload shape examples
- tests added
- contract follow-ups needed for storage or review workflow

