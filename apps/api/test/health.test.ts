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

  it("rejects invalid grading payloads", async () => {
    const server = buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-invalid",
        answers: "not-an-array",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request",
      message:
        "Expected either an objective evaluation payload or a session grading payload.",
    });

    await server.close();
  });

  it("seeds grading results and review-queue entries for a submitted session", async () => {
    const server = buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-123",
        submittedAt: "2026-03-18T09:30:00.000Z",
        answers: [
          {
            submissionAnswerId: "answer-1",
            questionId: "question-1",
            gradingMode: "deterministic",
            answer: " B ",
            acceptedAnswers: ["b"],
            maxScore: 1,
          },
          {
            submissionAnswerId: "answer-2",
            questionId: "question-2",
            gradingMode: "manual-review-required",
            answer: "Photosynthesis converts light into energy.",
            maxScore: 4,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sessionId: "session-123",
      summary: {
        totalAnswers: 2,
        autoScoredCount: 1,
        reviewRequiredCount: 1,
      },
      gradingResults: [
        {
          id: "session-123:answer-1",
          questionId: "question-1",
          scoreAwarded: 1,
          maxScore: 1,
          requiresReview: false,
          resolution: "confirmed",
        },
        {
          id: "session-123:answer-2",
          questionId: "question-2",
          scoreAwarded: 0,
          maxScore: 4,
          requiresReview: true,
          resolution: "pending",
        },
      ],
      events: [
        {
          eventType: "grading.finished",
          sessionId: "session-123",
        },
        {
          eventType: "review.required",
          sessionId: "session-123",
          gradingResultId: "session-123:answer-2",
        },
      ],
    });

    const reviewQueueResponse = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(reviewQueueResponse.statusCode).toBe(200);
    expect(reviewQueueResponse.json()).toMatchObject({
      total: 1,
      items: [
        {
          id: "session-123:answer-2",
          sessionId: "session-123",
          submissionAnswerId: "answer-2",
          questionId: "question-2",
          requiresReview: true,
          submittedAt: "2026-03-18T09:30:00.000Z",
        },
      ],
    });

    await server.close();
  });

  it("lists pending review items oldest first across seeded sessions", async () => {
    const server = buildServer();

    await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-earlier",
        submittedAt: "2026-03-18T09:15:00.000Z",
        answers: [
          {
            submissionAnswerId: "answer-earlier",
            questionId: "question-earlier",
            gradingMode: "manual-review-required",
            answer: "Earlier essay",
            maxScore: 5,
          },
        ],
      },
    });

    await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-later",
        submittedAt: "2026-03-18T09:50:00.000Z",
        answers: [
          {
            submissionAnswerId: "answer-later",
            questionId: "question-later",
            gradingMode: "manual-review-required",
            answer: "Later essay",
            maxScore: 5,
          },
        ],
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      total: 2,
      items: [
        {
          id: "session-earlier:answer-earlier",
          submittedAt: "2026-03-18T09:15:00.000Z",
        },
        {
          id: "session-later:answer-later",
          submittedAt: "2026-03-18T09:50:00.000Z",
        },
      ],
    });

    await server.close();
  });

  it("routes deterministic answers without answer keys into the review queue", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-789",
        submittedAt: "2026-03-18T09:45:00.000Z",
        answers: [
          {
            submissionAnswerId: "answer-missing-key",
            questionId: "question-missing-key",
            gradingMode: "deterministic",
            answer: "42",
            maxScore: 2,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sessionId: "session-789",
      summary: {
        totalAnswers: 1,
        autoScoredCount: 0,
        reviewRequiredCount: 1,
      },
      gradingResults: [
        {
          id: "session-789:answer-missing-key",
          requiresReview: true,
          rationale:
            "Accepted answers were not provided for deterministic grading.",
          resolution: "pending",
        },
      ],
      events: [
        {
          eventType: "grading.finished",
          sessionId: "session-789",
        },
        {
          eventType: "review.required",
          gradingResultId: "session-789:answer-missing-key",
          sessionId: "session-789",
        },
      ],
    });

    const reviewQueueResponse = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(reviewQueueResponse.statusCode).toBe(200);
    expect(reviewQueueResponse.json()).toMatchObject({
      total: 1,
      items: [
        {
          id: "session-789:answer-missing-key",
          questionId: "question-missing-key",
          submittedAt: "2026-03-18T09:45:00.000Z",
        },
      ],
    });

    await server.close();
  });

  it("resolves review-queue items and removes them from the queue", async () => {
    const server = buildServer();

    await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-456",
        answers: [
          {
            submissionAnswerId: "answer-essay",
            questionId: "question-essay",
            gradingMode: "manual-review-required",
            answer: "A paragraph response",
            maxScore: 6,
          },
        ],
      },
    });

    const resolutionResponse = await server.inject({
      method: "POST",
      url: "/api/review-queue/session-456:answer-essay/resolve",
      payload: {
        reviewedBy: "staff-42",
        scoreAwarded: 5,
        rationale: "Rubric fit after manual review.",
      },
    });

    expect(resolutionResponse.statusCode).toBe(200);
    expect(resolutionResponse.json()).toMatchObject({
      gradingResult: {
        id: "session-456:answer-essay",
        scoreAwarded: 5,
        requiresReview: false,
        reviewedBy: "staff-42",
        rationale: "Rubric fit after manual review.",
        resolution: "score-overridden",
      },
    });

    const reviewQueueResponse = await server.inject({
      method: "GET",
      url: "/api/review-queue",
    });

    expect(reviewQueueResponse.statusCode).toBe(200);
    expect(reviewQueueResponse.json()).toMatchObject({
      total: 0,
      items: [],
    });

    const secondResolutionAttempt = await server.inject({
      method: "POST",
      url: "/api/review-queue/session-456:answer-essay/resolve",
      payload: {
        reviewedBy: "staff-42",
        scoreAwarded: 5,
        rationale: "Already resolved.",
      },
    });

    expect(secondResolutionAttempt.statusCode).toBe(409);
    expect(secondResolutionAttempt.json()).toMatchObject({
      error: "review_not_required",
    });

    await server.close();
  });

  it("rejects invalid review-resolution payloads", async () => {
    const server = buildServer();

    await server.inject({
      method: "POST",
      url: "/api/grading/evaluate",
      payload: {
        sessionId: "session-review-invalid",
        answers: [
          {
            submissionAnswerId: "answer-review-invalid",
            questionId: "question-review-invalid",
            gradingMode: "manual-review-required",
            answer: "Needs manual review",
            maxScore: 3,
          },
        ],
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/review-queue/session-review-invalid:answer-review-invalid/resolve",
      payload: {
        reviewedBy: "staff-42",
        rationale: "Missing score awarded.",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request",
      message:
        "Expected reviewedBy, scoreAwarded, and rationale for review resolution.",
    });

    await server.close();
  });

  it("returns 404 when resolving an unknown review item", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/review-queue/session-missing:answer-missing/resolve",
      payload: {
        reviewedBy: "staff-42",
        scoreAwarded: 1,
        rationale: "Attempted review on missing item.",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "not_found",
      message: "Grading result was not found.",
    });

    await server.close();
  });
});
