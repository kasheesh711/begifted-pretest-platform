import { describe, expect, it } from "vitest";

import { decideRelease } from "../scripts/lib/release-policy.mjs";

describe("release policy", () => {
  it("creates a release for runtime-relevant changes", () => {
    const decision = decideRelease(
      ["apps/api/src/server.ts", "docs/WORKFLOW.md"],
      new Date("2026-03-18T03:20:00Z"),
    );

    expect(decision.shouldRelease).toBe(true);
    expect(decision.releaseFiles).toEqual(["apps/api/src/server.ts"]);
    expect(decision.tagName).toContain("release-20260318T032000Z");
  });

  it("skips release for docs-only changes", () => {
    const decision = decideRelease(
      ["docs/WORKFLOW.md", "README.md"],
      new Date("2026-03-18T03:20:00Z"),
    );

    expect(decision.shouldRelease).toBe(false);
  });
});
