# Local Orchestration

## Purpose

`scripts/orchestrate-agents.mjs` is the local supervisor for Codex, Claude Code, and Gemini via Antigravity.

It does four things:

1. reads `status: ready` issues from GitHub
2. maps each issue to the correct provider and worktree
3. optionally launches the provider command inside that worktree
4. syncs the assignment back to GitHub Issues and the Project board

## Configuration

Copy `orchestrator.config.example.json` to `orchestrator.config.json` and adjust the provider command templates for your machine.

The orchestrator already sets the child process working directory to the assigned worktree. Command templates should only add provider-specific flags and prompt wiring.

Supported placeholders:

- `{issue}`
- `{issue_title}`
- `{issue_url}`
- `{provider}`
- `{role}`
- `{branch}`
- `{worktree}`
- `{handoff}`
- `{repo}`
- `{repo_root}`
- `{milestone}`

You can also set provider commands through environment variables:

- `ORCH_CODEX_CMD`
- `ORCH_CLAUDE_CMD`
- `ORCH_GEMINI_CMD`

Claude Code note:

- Claude Code does not support `--cwd`
- use the orchestrator's process `cwd` and pass the handoff file as the prompt payload if you want unattended runs
- example:

```bash
claude -p --permission-mode bypassPermissions "$(cat '{handoff}')"
```

Codex note:

- Codex should be launched with `exec -C`, not `--cwd`
- example:

```bash
codex exec -C {worktree} --dangerously-bypass-approvals-and-sandbox "$(cat '{handoff}')"
```

Gemini CLI note:

- Gemini CLI runs correctly from the orchestrator's assigned worktree, so no `cwd` flag is needed
- use `-p` for non-interactive runs and `--approval-mode yolo` for unattended execution
- example:

```bash
gemini -p "$(cat '{handoff}')" --approval-mode yolo
```

- Gemini CLI also requires auth before automated runs will succeed
- supported auth comes from `GEMINI_API_KEY` or other Gemini-supported environment settings

## Usage

Dry-run without launches:

```bash
npm run orchestrate:agents -- --dry-run --no-launch
```

Launch up to three ready issues:

```bash
npm run orchestrate:agents
```

Launch one specific issue:

```bash
npm run orchestrate:agents -- --issue 2
```

Relaunch an already assigned issue:

```bash
npm run orchestrate:agents -- --issue 2 --relaunch
```

When `--issue` and `--relaunch` are used together, the orchestrator can relaunch an open issue even after `status: ready` has been removed.

## Behavior

- worktrees are created with the existing `scripts/new-agent-worktree.sh`
- issue comments are upserted with the active assignment
- successfully launched issues have the `status: ready` label removed
- GitHub Project metadata is updated:
  - `Status` -> `In Progress`
  - `Agent Owner`
  - `Area`
  - `Worktree`
  - `Target Milestone`
- local state is written to `tmp/orchestrator-state.json`
- run logs are written to `tmp/orchestrator-runs/`

## Provider routing

- `agent: frontend` -> Claude Code
- `agent: content` -> Gemini via Antigravity
- `agent: platform` -> Codex
- `agent: grading` -> Codex
- `agent: qa-ops` -> Codex
- `agent: pm` -> Codex

## Safety model

- no issue is relaunched unless `--relaunch` is supplied
- no provider command is executed if no command template is configured
- the orchestrator never edits code; it only creates worktrees, launches agents, and syncs task metadata
