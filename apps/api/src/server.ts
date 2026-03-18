import Fastify from "fastify";

import { evaluateObjectiveAnswer } from "@begifted/core";

export function buildServer() {
  const server = Fastify({ logger: false });

  server.get("/health", async () => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  server.post("/api/grading/evaluate", async (request) => {
    const payload = request.body as {
      answer: string | number | Array<string | number>;
      acceptedAnswers: string[];
    };

    return {
      result: evaluateObjectiveAnswer(payload.answer, payload.acceptedAnswers),
    };
  });

  return server;
}
