import { describe, expect, it } from "vitest";

import { evaluateObjectiveAnswer } from "../src/grading.js";

describe("evaluateObjectiveAnswer", () => {
  it("normalizes single-value answers", () => {
    expect(evaluateObjectiveAnswer(" A ", ["a"])).toMatchObject({
      isCorrect: true,
    });
  });

  it("compares multi-select answers independent of order", () => {
    expect(evaluateObjectiveAnswer(["C", "A"], ["a", "c"])).toMatchObject({
      isCorrect: true,
    });
  });
});
