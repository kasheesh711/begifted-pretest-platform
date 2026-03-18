import { describe, expect, it } from "vitest";

import {
  assignmentFromIssue,
  branchTypeFromLabels,
  buildLaunchCommand,
  parseProjectUrl,
  slugifyIssueTitle,
} from "../scripts/lib/orchestrator.mjs";

describe("orchestrator helpers", () => {
  it("slugifies issue titles consistently", () => {
    expect(slugifyIssueTitle("[Feature] Build invite creation shell")).toBe(
      "build-invite-creation-shell",
    );
  });

  it("maps bug labels to fix branches", () => {
    expect(branchTypeFromLabels(["type: bug"])).toBe("fix");
  });

  it("creates the expected content assignment", () => {
    const assignment = assignmentFromIssue(
      {
        number: 1,
        title:
          "[Feature] Seed one objective-heavy assessment into normalized content",
        url: "https://github.com/example/repo/issues/1",
        milestone: { title: "Bootstrap Dry Run" },
        labels: [{ name: "agent: content" }, { name: "type: feature" }],
      },
      "/repo",
      "/workspace",
    );

    expect(assignment).toMatchObject({
      provider: "gemini",
      agentName: "gemini-content",
      branch: "codex/feat/1-seed-one-objective-heavy-assessment-into-normali",
      worktree: "/workspace/agents/gemini-content-1",
    });
  });

  it("renders launch commands from templates", () => {
    const command = buildLaunchCommand({
      assignment: {
        issueNumber: 2,
        issueTitle: "Frontend task",
        issueUrl: "https://github.com/example/repo/issues/2",
        provider: "claude",
        role: "Frontend Agent",
        branch: "codex/feat/2-frontend-task",
        worktree: "/workspace/agents/claude-frontend-2",
        handoffPath: "/repo/docs/handoffs/claude-code-frontend.md",
        milestone: "Bootstrap Dry Run",
      },
      templates: {
        codex: null,
        claude: "claude --cwd {worktree} --prompt-file {handoff}",
        gemini: null,
      },
      repo: "owner/repo",
      repoRoot: "/repo",
    });

    expect(command).toBe(
      "claude --cwd /workspace/agents/claude-frontend-2 --prompt-file /repo/docs/handoffs/claude-code-frontend.md",
    );
  });

  it("parses user project URLs", () => {
    expect(
      parseProjectUrl("https://github.com/users/kasheesh711/projects/2"),
    ).toEqual({
      owner: "kasheesh711",
      number: 2,
      url: "https://github.com/users/kasheesh711/projects/2",
    });
  });
});
