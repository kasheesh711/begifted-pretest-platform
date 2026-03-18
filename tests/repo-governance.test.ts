import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const requiredPaths = [
  "AGENTS.md",
  "docs/PRD.md",
  "docs/ARCHITECTURE.md",
  "docs/DATA_MODEL.md",
  "docs/API_CONTRACTS.md",
  "docs/CONTENT_MODEL.md",
  "docs/DECISIONS.md",
  "docs/AGENT_ROLES.md",
  "docs/WORKFLOW.md",
  "docs/HANDOFF_TEMPLATE.md",
  "docs/TASK_TEMPLATE.md",
  "docs/TEST_STRATEGY.md",
  "docs/CONTENT_QA_RUNBOOK.md",
  "docs/OPS_RUNBOOK.md",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/CODEOWNERS",
  ".github/workflows/ci.yml",
  ".github/workflows/pr-title.yml",
  ".github/workflows/project-automation.yml",
] as const;

describe("repo governance bootstrap", () => {
  it.each(requiredPaths)("includes %s", async (file) => {
    await expect(access(file)).resolves.toBeUndefined();
  });
});
