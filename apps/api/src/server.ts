import Fastify from "fastify";

import {
  type GradingResultRecord,
  createReviewResolutionResponse,
  evaluateObjectiveAnswer,
  evaluateSessionAnswers,
  isCreateInviteRequest,
  isObjectiveEvaluationRequest,
  isReviewResolutionRequest,
  isSessionEvaluationRequest,
  listReviewQueue,
  resolveReview,
} from "@begifted/core";
import {
  type WiseSandboxService,
  createWiseSandboxService,
} from "./wise-sandbox.js";

function createInvalidRequestResponse(message: string) {
  return {
    error: "invalid_request",
    message,
  };
}

interface BuildServerOptions {
  wiseSandbox?: WiseSandboxService;
}

function createErrorResponse(error: string, message: string) {
  return { error, message };
}

export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({ logger: false });
  const gradingResults = new Map<string, GradingResultRecord>();
  const wiseSandbox = options.wiseSandbox ?? createWiseSandboxService();

  server.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  server.get("/api/wise/sandbox/account", async () => {
    return wiseSandbox.getAccountSnapshot();
  });

  server.get("/api/wise/sandbox/logs", async () => {
    const items = wiseSandbox.listLogs();

    return {
      total: items.length,
      items,
    };
  });

  server.post("/api/invites", async (request, reply) => {
    const payload = request.body;

    if (!isCreateInviteRequest(payload)) {
      reply.code(400);

      return createInvalidRequestResponse(
        "Expected studentName, parentEmail, assessmentVersionIds, and expiresAt for a Wise sandbox invite.",
      );
    }

    try {
      return await wiseSandbox.createInvite(payload);
    } catch (error) {
      reply.code(400);

      return createErrorResponse(
        "invalid_request",
        error instanceof Error
          ? error.message
          : "Failed to create Wise sandbox invite.",
      );
    }
  });

  server.get("/api/public/invites/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const invite = wiseSandbox.getPublicInvite(token);

    if (!invite) {
      reply.code(404);

      return createErrorResponse("not_found", "Invite was not found.");
    }

    if (invite.expired) {
      reply.code(410);

      return createErrorResponse("expired", "Invite has expired.");
    }

    return invite.invite;
  });

  server.get("/api/public/invites/:token/launch", async (request, reply) => {
    const { token } = request.params as { token: string };
    const invite = wiseSandbox.getPublicInvite(token);

    if (!invite) {
      reply.code(404);

      return createErrorResponse("not_found", "Invite was not found.");
    }

    if (invite.expired) {
      reply.code(410);

      return createErrorResponse("expired", "Invite has expired.");
    }

    const launchUrl = wiseSandbox.resolveLaunchUrl(token);
    if (!launchUrl) {
      reply.code(409);

      return createErrorResponse(
        "launch_unavailable",
        "Invite launch target is not available.",
      );
    }

    return reply.redirect(launchUrl, 303);
  });

  server.post(
    "/api/wise/sandbox/tests/:testId/submissions/sync",
    async (request, reply) => {
      const { testId } = request.params as { testId: string };

      try {
        return await wiseSandbox.syncOwnedTestSubmissions(testId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sync Wise sandbox submissions.";
        reply.code(
          /not a BeGifted-owned sandbox entity/i.test(message) ? 403 : 400,
        );

        return createErrorResponse("sync_blocked", message);
      }
    },
  );

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
