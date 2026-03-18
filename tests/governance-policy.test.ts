import { describe, expect, it } from "vitest";

import {
  evaluateGovernance,
  policyLabels,
} from "../scripts/lib/governance.mjs";

describe("governance policy", () => {
  it("marks single-scope frontend changes as fast-lane auto-approvable", () => {
    const evaluation = evaluateGovernance({
      prBody: "Linked issue #2\n\n## Handoff\n- Safe to merge: yes",
      changedFiles: ["apps/web/app/page.tsx", "packages/ui/src/index.tsx"],
    });

    expect(evaluation.lane).toBe("fast");
    expect(evaluation.autoApproveEligible).toBe(true);
    expect(policyLabels(evaluation)).toContain("policy: auto-approve");
    expect(policyLabels(evaluation)).toContain("policy: fast-lane");
  });

  it("blocks shared-contract changes without decision log updates", () => {
    const evaluation = evaluateGovernance({
      prBody: "Linked issue #3\n\n## Handoff\n- Safe to merge: no",
      changedFiles: ["packages/core/src/index.ts", "apps/api/src/server.ts"],
    });

    expect(evaluation.sharedContractChange).toBe(true);
    expect(evaluation.autoApproveEligible).toBe(false);
    expect(evaluation.blockers).toContain(
      "Shared contract or infra changes require an update to docs/DECISIONS.md.",
    );
    expect(policyLabels(evaluation)).toContain("policy: blocked");
  });
});
