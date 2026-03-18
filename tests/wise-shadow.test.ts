import { describe, expect, it } from "vitest";

import { assertWiseSandboxEndpointAllowed } from "../apps/api/src/wise-sandbox.ts";
import {
  createWiseSandboxExternalRef,
  createWiseSandboxStudentName,
  evaluateWiseWriteGuard,
  wiseSandboxOwner,
} from "../packages/core/src/wise-shadow.ts";

describe("wise shadow safety", () => {
  it("anonymizes dummy student names before publishing to Wise", () => {
    const displayName = createWiseSandboxStudentName("Alex Chen");
    const externalRef = createWiseSandboxExternalRef("Alex Chen");

    expect(displayName).toContain("BGT-DUMMY");
    expect(displayName).toContain(externalRef.slice(-6).toUpperCase());
    expect(displayName).not.toContain("Alex");
    expect(displayName).not.toContain("Chen");
  });

  it("blocks mutations against non-owned Wise entities", () => {
    const evaluation = evaluateWiseWriteGuard({
      action: "publish-test",
      entityType: "test",
      targetWiseId: "test-live-123",
      targetDisplayName: "Midterm Test",
      bindings: [],
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.dryRunOnly).toBe(true);
  });

  it("allows mutations only for BeGifted-owned sandbox entities", () => {
    const evaluation = evaluateWiseWriteGuard({
      action: "publish-test",
      entityType: "test",
      targetWiseId: "test-sandbox-123",
      targetDisplayName: "BGT-TEST Year 7 Science Foundation Pre-Test",
      bindings: [
        {
          wiseId: "test-sandbox-123",
          entityType: "test",
          owner: wiseSandboxOwner,
          externalRef: "science-uk-year-7-foundation-pretest",
          displayName: "BGT-TEST Year 7 Science Foundation Pre-Test",
          createdAt: "2026-03-18T00:00:00.000Z",
        },
      ],
    });

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.dryRunOnly).toBe(false);
  });

  it("blocks non-allowlisted Wise endpoints", () => {
    expect(() =>
      assertWiseSandboxEndpointAllowed("/institutes/abc/credits/grant"),
    ).toThrow(/unsafe endpoint path/i);
    expect(() =>
      assertWiseSandboxEndpointAllowed("/user/classes/abc/roster"),
    ).toThrow(/non-allowlisted endpoint path/i);
  });
});
