# Active Agent Handoffs

This directory contains the initial handoff packets for the first three parallel implementation agents.

## Active assignments

- Codex: [Issue #1 content seed](./codex-content.md)
- Claude Code: [Issue #2 frontend invite shell](./claude-code-frontend.md)
- Codex: [Issue #3 platform grading shell](./codex-platform.md)

## Worktree layout

- Main repo: `/Users/kevinhsieh/Desktop/Pretest`
- Codex content worktree: `/Users/kevinhsieh/Desktop/workspace/agents/codex-content-1`
- Claude worktree: `/Users/kevinhsieh/Desktop/workspace/agents/claude-frontend-2`
- Codex worktree: `/Users/kevinhsieh/Desktop/workspace/agents/codex-platform-3`

## Shared first-read files

Every agent should read these before editing:

1. `AGENTS.md`
2. `docs/WORKFLOW.md`
3. `docs/API_CONTRACTS.md`
4. `docs/DATA_MODEL.md`
5. The assigned issue on GitHub

## Shared operating rules

- Stay inside the assigned write scope.
- Update only the branch attached to the worktree.
- Record any contract drift before changing shared contracts.
- Use the handoff template when pausing or finishing.
- Do not reassign your own scope without a new issue.
