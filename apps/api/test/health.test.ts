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

  it("evaluates a seeded submission and exposes only reviewable items", async () => {
    const server = buildServer();
    const gradingResponse = await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-123",
        answers: [
          {
            submissionAnswerId: "answer-1",
            questionId: "question-1",
            prompt: "Pick the correct option.",
            gradingMode: "objective",
            answer: "B",
            acceptedAnswers: ["B"],
            maxScore: 1,
          },
          {
            submissionAnswerId: "answer-2",
            questionId: "question-2",
            prompt: "Explain your reasoning.",
            gradingMode: "subjective",
            answer: "The student wrote a paragraph.",
            maxScore: 5,
          },
        ],
      },
    });

    expect(gradingResponse.statusCode).toBe(200);
    expect(gradingResponse.json()).toMatchObject({
      sessionId: "session-123",
      gradingResults: [
        {
          id: "grading-answer-1",
          scoreAwarded: 1,
          requiresReview: false,
          reviewStatus: "resolved",
        },
        {
          id: "grading-answer-2",
          scoreAwarded: 3,
          requiresReview: true,
          reviewStatus: "pending",
        },
      ],
      reviewQueue: [
        {
          gradingResultId: "grading-answer-2",
          questionId: "question-2",
          reviewStatus: "pending",
        },
      ],
    });

    const queueResponse = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(queueResponse.statusCode).toBe(200);
    expect(queueResponse.json()).toMatchObject({
      items: [
        {
          gradingResultId: "grading-answer-2",
          sessionId: "session-123",
          reviewStatus: "pending",
        },
      ],
    });

    await server.close();
  });

  it("resolves a pending review item and removes it from the review queue", async () => {
    const server = buildServer();

    await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-456",
        answers: [
          {
            submissionAnswerId: "answer-9",
            questionId: "question-9",
            prompt: "Describe the process.",
            gradingMode: "subjective",
            answer: "A short explanation.",
            maxScore: 4,
          },
        ],
      },
    });

    const resolveResponse = await server.inject({
      method: "POST",
      url: "/api/review-queue/grading-answer-9/resolve",
      payload: {
        reviewedBy: "staff-1",
        scoreAwarded: 4,
        rationale: "Confirmed full marks after manual review.",
      },
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toMatchObject({
      gradingResult: {
        id: "grading-answer-9",
        reviewedBy: "staff-1",
        scoreAwarded: 4,
        requiresReview: false,
        reviewStatus: "resolved",
      },
      reviewQueue: [],
    });

    const queueResponse = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(queueResponse.json()).toMatchObject({ items: [] });

    await server.close();
  });

  it("returns a not found error when resolving an unknown review item", async () => {
    const server = buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/review-queue/grading-missing/resolve",
      payload: {
        reviewedBy: "staff-1",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "not_found",
    });

    await server.close();
  });
});
