import Fastify from "fastify";

import {
  type GradingResultRecord,
  createReviewResolutionResponse,
  evaluateObjectiveAnswer,
  evaluateSessionAnswers,
  isObjectiveEvaluationRequest,
  isReviewResolutionRequest,
  isSessionEvaluationRequest,
  listReviewQueue,
  resolveReview,
} from "@begifted/core";

function createInvalidRequestResponse(message: string) {
  return {
    error: "invalid_request",
    message,
  };
}

export function buildServer() {
  const server = Fastify({ logger: false });
  const gradingResults = new Map<string, GradingResultRecord>();

  server.get("/health", async () => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  server.post("/api/grading/evaluate", async (request, reply) => {
    const payload = request.body;

    if (isSessionEvaluationRequest(payload)) {
      const result = evaluateSessionAnswers(payload);

      for (const gradingResult of result.gradingResults) {
        gradingResults.set(gradingResult.id, gradingResult);
      }

      return result;
    }

    if (!isObjectiveEvaluationRequest(payload)) {
      reply.code(400);

      return createInvalidRequestResponse(
        "Expected either an objective evaluation payload or a session grading payload.",
      );
    }

    return {
      result: evaluateObjectiveAnswer(payload.answer, payload.acceptedAnswers),
    };
  });

  server.get("/api/review-queue", async () => {
    return listReviewQueue(gradingResults.values());
  });

  server.post(
    "/api/review-queue/:gradingResultId/resolve",
    async (request, reply) => {
      const { gradingResultId } = request.params as { gradingResultId: string };
      const payload = request.body;
      const gradingResult = gradingResults.get(gradingResultId);

      if (!gradingResult) {
        reply.code(404);

        return {
          error: "not_found",
          message: "Grading result was not found.",
        };
      }

      if (!isReviewResolutionRequest(payload)) {
        reply.code(400);

        return createInvalidRequestResponse(
          "Expected reviewedBy, scoreAwarded, and rationale for review resolution.",
        );
      }

      if (!gradingResult.requiresReview) {
        reply.code(409);

        return {
          error: "review_not_required",
          message: "Grading result is not pending review.",
        };
      }

      const resolvedResult = resolveReview(gradingResult, payload);

      gradingResults.set(resolvedResult.id, resolvedResult);

      return createReviewResolutionResponse(resolvedResult);
    },
  );

  return server;
}
