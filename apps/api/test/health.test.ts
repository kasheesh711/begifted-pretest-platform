import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";
import { createWiseSandboxService } from "../src/wise-sandbox.js";

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

  it("creates and exposes Wise sandbox invites without touching live entities", async () => {
    const server = buildServer();
    const createResponse = await server.inject({
      method: "POST",
      url: "/api/invites",
      payload: {
        studentName: "Alex Chen",
        parentEmail: "parent@example.com",
        recipientEmails: ["advisor@example.com"],
        assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
        expiresAt: "2026-03-20T23:59:59.000Z",
      },
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json()).toMatchObject({
      status: "sandbox_ready",
      deliveryProvider: "wise-sandbox",
      dryRun: true,
      assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
    });

    const { token } = createResponse.json() as { token: string };
    const inviteResponse = await server.inject({
      method: "GET",
      url: `/api/public/invites/${token}`,
    });

    expect(inviteResponse.statusCode).toBe(200);
    expect(inviteResponse.json()).toMatchObject({
      token,
      studentName: "Alex Chen",
      deliveryProvider: "wise-sandbox",
      launchReady: true,
      assessmentTitles: ["Year 7 Science Foundation Pre-Test"],
    });

    const launchResponse = await server.inject({
      method: "GET",
      url: `/api/public/invites/${token}/launch`,
    });

    expect(launchResponse.statusCode).toBe(303);
    expect(launchResponse.headers.location).toContain("mode=wise-sandbox");

    const logResponse = await server.inject({
      method: "GET",
      url: "/api/wise/sandbox/logs",
    });

    expect(logResponse.statusCode).toBe(200);
    expect(logResponse.json()).toMatchObject({
      total: 7,
    });

    await server.close();
  });

  it("returns 410 for expired Wise sandbox invites", async () => {
    const wiseSandbox = createWiseSandboxService({
      now: () => "2026-03-18T00:00:00.000Z",
    });
    await wiseSandbox.createInvite({
      studentName: "Expired Student",
      parentEmail: "expired@example.com",
      assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
      expiresAt: "2026-03-17T23:59:59.000Z",
    });

    const invite = wiseSandbox.getPublicInvite(
      (
        await wiseSandbox.createInvite({
          studentName: "Ready Student",
          parentEmail: "ready@example.com",
          assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
          expiresAt: "2026-03-19T23:59:59.000Z",
        })
      ).token,
    );

    expect(invite?.expired).toBe(false);

    const expiredServer = buildServer({
      wiseSandbox: createWiseSandboxService({
        now: () => "2026-03-18T00:00:00.000Z",
      }),
    });
    const expiredCreateResponse = await expiredServer.inject({
      method: "POST",
      url: "/api/invites",
      payload: {
        studentName: "Expired Student",
        parentEmail: "expired@example.com",
        assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
        expiresAt: "2026-03-17T23:59:59.000Z",
      },
    });
    const expiredToken = (expiredCreateResponse.json() as { token: string })
      .token;
    const expiredResponse = await expiredServer.inject({
      method: "GET",
      url: `/api/public/invites/${expiredToken}`,
    });

    expect(expiredResponse.statusCode).toBe(410);
    expect(expiredResponse.json()).toMatchObject({
      error: "expired",
    });

    await expiredServer.close();
  });

  it("syncs submissions only for BeGifted-owned Wise sandbox tests", async () => {
    let createdTestId = "";
    const wiseSandbox = createWiseSandboxService({
      client: {
        configured: false,
        mode: "dry-run",
        namespace: "sandbox",
        launchUrlTemplate: undefined,
        async getAccountUser() {
          return {
            wiseUserId: "dry-account",
            name: "Sandbox",
            namespace: "sandbox",
          };
        },
        async createStudent(input) {
          return {
            wiseId: `student-${input.vendorUserId}`,
            vendorUserId: input.vendorUserId,
            displayName: input.displayName,
            email: input.email,
          };
        },
        async createCourse(input) {
          return {
            wiseId: "course-123",
            displayName: input.displayName,
            subject: input.subject,
          };
        },
        async assignCourseToStudent() {},
        async getCourseSections() {
          return [{ sectionId: "section-1", name: "Section 1" }];
        },
        async createTest(input) {
          createdTestId = "test-123";

          return {
            wiseId: createdTestId,
            classId: input.classId,
            displayName: input.displayName,
          };
        },
        async addQuestions() {},
        async updateTestSettings() {},
        async publishTest() {},
        async getTestSubmissions() {
          return {
            submissions: [
              {
                submissionId: "submission-1",
                userName: "BGT Dummy",
                answers: {
                  q1: "b",
                  q2: "c",
                  q3: "c",
                  q5: "c",
                  q6: "b",
                  q7: "b",
                  q9: "b",
                  q11: "they changed the amount of sugar",
                },
              },
            ],
          };
        },
      },
      now: () => "2026-03-18T00:00:00.000Z",
    });

    await wiseSandbox.createInvite({
      studentName: "Sandbox Student",
      parentEmail: "sandbox@example.com",
      assessmentVersionIds: ["science-uk-year-7-foundation-pretest"],
      expiresAt: "2026-03-19T23:59:59.000Z",
    });

    const syncResponse =
      await wiseSandbox.syncOwnedTestSubmissions(createdTestId);
    expect(syncResponse).toMatchObject({
      deliveryProvider: "wise-sandbox",
      testId: "test-123",
      assessmentId: "science-uk-year-7-foundation-pretest",
      totalSubmissions: 1,
      syncedSubmissions: [
        {
          submissionId: "submission-1",
        },
      ],
    });

    const server = buildServer({ wiseSandbox });
    const blockedResponse = await server.inject({
      method: "POST",
      url: "/api/wise/sandbox/tests/not-owned/submissions/sync",
    });

    expect(blockedResponse.statusCode).toBe(403);
    expect(blockedResponse.json()).toMatchObject({
      error: "sync_blocked",
    });

    await server.close();
  });
});
