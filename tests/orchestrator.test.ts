import { describe, expect, it } from "vitest";

import {
  assignmentFromIssue,
  branchTypeFromLabels,
  buildLaunchCommand,
  parseProjectUrl,
  resolveExecutionProfile,
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
      provider: "codex",
      agentName: "codex-content",
      branch: "codex/feat/1-seed-one-objective-heavy-assessment-into-normali",
      worktree: "/workspace/agents/codex-content-1",
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
        execution: {
          tier: "economy",
          model: "sonnet",
          effort: "low",
          reason: "narrow shell/seed/stub style task",
          launchArgs: "--model 'sonnet' --effort 'low'",
        },
      },
      templates: {
        codex: null,
        claude:
          "claude -p {launch_args} --permission-mode bypassPermissions \"$(cat '{handoff}')\"",
      },
      repo: "owner/repo",
      repoRoot: "/repo",
    });

    expect(command).toBe(
      "claude -p --model 'sonnet' --effort 'low' --permission-mode bypassPermissions \"$(cat '/repo/docs/handoffs/claude-code-frontend.md')\"",
    );
  });

  it("selects economy codex profile for narrow content tasks", () => {
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

    expect(
      resolveExecutionProfile(
        {
          number: 1,
          title:
            "[Feature] Seed one objective-heavy assessment into normalized content",
          labels: [{ name: "agent: content" }, { name: "type: feature" }],
        },
        assignment,
      ),
    ).toMatchObject({
      tier: "economy",
      model: "gpt-5.4-mini",
      effort: "low",
    });
  });

  it("selects deep codex profile for complex platform tasks", () => {
    const assignment = assignmentFromIssue(
      {
        number: 3,
        title: "[Feature] Build backend grading and review-queue shell",
        url: "https://github.com/example/repo/issues/3",
        milestone: { title: "Bootstrap Dry Run" },
        labels: [{ name: "agent: platform" }, { name: "type: feature" }],
      },
      "/repo",
      "/workspace",
    );

    expect(
      resolveExecutionProfile(
        {
          number: 3,
          title: "[Feature] Build backend grading and review-queue shell",
          labels: [{ name: "agent: platform" }, { name: "type: feature" }],
        },
        assignment,
      ),
    ).toMatchObject({
      tier: "deep",
      model: "gpt-5.4",
      effort: "high",
    });
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
