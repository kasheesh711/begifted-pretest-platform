# Claude Code Handoff

## Assignment

- Agent: Claude Code
- Role: Frontend Agent
- Issue: `#2`
- Issue URL: `https://github.com/kasheesh711/begifted-pretest-platform/issues/2`
- Branch: `codex/feat/2-invite-shell`
- Worktree: `/Users/kevinhsieh/Desktop/workspace/agents/claude-frontend-2`

## Objective

Build a staff-facing invite creation screen shell and a student landing route.

## Allowed write scope

- `apps/web/**`
- `packages/ui/**`

Do not implement backend persistence or edit `apps/api/**`.

## First-read files

1. `AGENTS.md`
2. `docs/PRD.md`
3. `docs/API_CONTRACTS.md`
4. `apps/web/app/page.tsx`
5. `packages/ui/src/index.tsx`

## Deliverables

- a route or route group for staff invite creation
- a route for student invite landing
- any minimal shared UI components required for those surfaces

## Acceptance criteria

- invite creation shell has clear form structure and a submission affordance
- student landing route clearly explains the session entry point
- UI stays within frontend-owned paths
- screenshots can be attached to the PR

## Design direction

- keep the interface intentional and polished, not placeholder-gray admin UI
- preserve the repo’s warm/light visual tone unless there is a strong reason to change it
- separate staff and student surfaces clearly

## Constraints

- do not hard-code API shapes beyond what `docs/API_CONTRACTS.md` already commits to
- avoid introducing a component framework beyond the current repo stack
- do not build auth, sending, or storage flows in this issue

## Validation

- `npm run lint`
- `npm run typecheck`
- add tests only if you introduce non-trivial interaction logic

## Handoff expectation

On pause or completion, provide:

- routes added
- components added or changed
- screenshots or route descriptions
- any API assumptions that need backend confirmation

