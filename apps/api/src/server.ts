import Fastify from "fastify";

import {
  type ResolveReviewRequest,
  type SeedGradingRequest,
  type SeedGradingResult,
  createReviewQueue,
  evaluateObjectiveAnswer,
  evaluateSeedGrading,
  resolveReviewItem,
} from "@begifted/core";

export function buildServer() {
  const server = Fastify({ logger: false });
  const gradingResults = new Map<string, SeedGradingResult>();

  server.get("/health", async () => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  server.post("/api/grading/evaluate", async (request) => {
    const payload = request.body as Partial<SeedGradingRequest> & {
      answer?: string | number | Array<string | number>;
      acceptedAnswers?: string[];
    };

    if (
      typeof payload.sessionId === "string" &&
      Array.isArray(payload.answers) &&
      payload.answers.length > 0
    ) {
      const response = evaluateSeedGrading({
        sessionId: payload.sessionId,
        answers: payload.answers,
      });

      for (const gradingResult of response.gradingResults) {
        gradingResults.set(gradingResult.id, gradingResult);
      }

      return response;
    }

    return {
      result: evaluateObjectiveAnswer(
        payload.answer ?? "",
        payload.acceptedAnswers ?? [],
      ),
    };
  });

  server.get("/api/review-queue", async () => ({
    items: createReviewQueue(Array.from(gradingResults.values())),
  }));

  server.post(
    "/api/review-queue/:gradingResultId/resolve",
    async (request, reply) => {
      const params = request.params as { gradingResultId: string };
      const body = request.body as ResolveReviewRequest;
      const gradingResult = gradingResults.get(params.gradingResultId);

      if (!gradingResult) {
        reply.code(404);
        return {
          error: "not_found",
          message: `No grading result found for ${params.gradingResultId}.`,
        };
      }

      if (
        !gradingResult.requiresReview ||
        gradingResult.reviewStatus !== "pending"
      ) {
        reply.code(409);
        return {
          error: "review_not_pending",
          message: `Grading result ${params.gradingResultId} does not require review.`,
        };
      }

      const resolvedResult = resolveReviewItem(gradingResult, body);
      gradingResults.set(resolvedResult.id, resolvedResult);

      return {
        gradingResult: resolvedResult,
        reviewQueue: createReviewQueue(Array.from(gradingResults.values())),
      };
    },
  );

  return server;
}
