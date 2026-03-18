import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

describe("api health and grading", () => {
  it("returns a healthy response", async () => {
    const server = buildServer();
    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "api" });

    await server.close();
  });

  it("grades accepted objective answers", async () => {
    const server = buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        answer: "B",
        acceptedAnswers: ["B"],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      result: {
        isCorrect: true,
      },
    });

    await server.close();
  });
});
