import { evaluateObjectiveAnswer } from "./grading.js";

export type ScalarAnswer = string | number;
export type SubmittedAnswer = ScalarAnswer | Array<ScalarAnswer>;
export type GradingMode = "deterministic" | "manual-review-required";
export type ReviewResolution = "pending" | "confirmed" | "score-overridden";

export interface ObjectiveEvaluationRequest {
  answer: SubmittedAnswer;
  acceptedAnswers: string[];
}

export interface SessionAnswerInput {
  submissionAnswerId: string;
  questionId: string;
  gradingMode: GradingMode;
  answer: SubmittedAnswer;
  acceptedAnswers?: string[];
  maxScore: number;
}

export interface SessionEvaluationRequest {
  sessionId: string;
  submittedAt?: string;
  answers: SessionAnswerInput[];
}

export interface ReviewResolutionRequest {
  reviewedBy: string;
  scoreAwarded: number;
  rationale: string;
}

export interface GradingEvent {
  eventId: string;
  eventType: "grading.finished" | "review.required";
  occurredAt: string;
  sessionId: string;
  actorType: "system";
  source: "api";
  gradingResultId?: string;
}

export interface GradingResultRecord {
  id: string;
  sessionId: string;
  submissionAnswerId: string;
  questionId: string;
  gradingMode: GradingMode;
  answer: SubmittedAnswer;
  scoreAwarded: number;
  maxScore: number;
  confidence: number;
  requiresReview: boolean;
  rationale: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  resolution: ReviewResolution;
}

export interface SessionGradingSummary {
  totalAnswers: number;
  autoScoredCount: number;
  reviewRequiredCount: number;
}

export interface SessionGradingResponse {
  sessionId: string;
  submittedAt: string;
  gradingResults: GradingResultRecord[];
  summary: SessionGradingSummary;
  events: GradingEvent[];
}

export interface ReviewQueueResponse {
  items: GradingResultRecord[];
  total: number;
}

export interface ReviewResolutionResponse {
  gradingResult: GradingResultRecord;
}

function isScalarAnswer(value: unknown): value is ScalarAnswer {
  return typeof value === "string" || typeof value === "number";
}

function isSubmittedAnswer(value: unknown): value is SubmittedAnswer {
  return (
    isScalarAnswer(value) ||
    (Array.isArray(value) && value.every((item) => isScalarAnswer(item)))
  );
}

function isGradingMode(value: unknown): value is GradingMode {
  return value === "deterministic" || value === "manual-review-required";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isSessionAnswerInput(value: unknown): value is SessionAnswerInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "submissionAnswerId" in value &&
    typeof value.submissionAnswerId === "string" &&
    "questionId" in value &&
    typeof value.questionId === "string" &&
    "gradingMode" in value &&
    isGradingMode(value.gradingMode) &&
    "answer" in value &&
    isSubmittedAnswer(value.answer) &&
    "maxScore" in value &&
    isFiniteNumber(value.maxScore) &&
    (!("acceptedAnswers" in value) ||
      value.acceptedAnswers === undefined ||
      isStringArray(value.acceptedAnswers))
  );
}

export function isObjectiveEvaluationRequest(
  payload: unknown,
): payload is ObjectiveEvaluationRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "answer" in payload &&
    isSubmittedAnswer(payload.answer) &&
    "acceptedAnswers" in payload &&
    isStringArray(payload.acceptedAnswers)
  );
}

export function isSessionEvaluationRequest(
  payload: unknown,
): payload is SessionEvaluationRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "sessionId" in payload &&
    typeof payload.sessionId === "string" &&
    (!("submittedAt" in payload) ||
      payload.submittedAt === undefined ||
      typeof payload.submittedAt === "string") &&
    "answers" in payload &&
    Array.isArray(payload.answers) &&
    payload.answers.every((answer) => isSessionAnswerInput(answer))
  );
}

export function isReviewResolutionRequest(
  payload: unknown,
): payload is ReviewResolutionRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "reviewedBy" in payload &&
    typeof payload.reviewedBy === "string" &&
    "scoreAwarded" in payload &&
    isFiniteNumber(payload.scoreAwarded) &&
    "rationale" in payload &&
    typeof payload.rationale === "string"
  );
}

export function createGradingResultId(
  sessionId: string,
  submissionAnswerId: string,
) {
  return `${sessionId}:${submissionAnswerId}`;
}

function createEvent(
  eventType: GradingEvent["eventType"],
  sessionId: string,
  gradingResultId?: string,
): GradingEvent {
  const occurredAt = new Date().toISOString();

  return {
    eventId: `${eventType}:${gradingResultId ?? sessionId}:${occurredAt}`,
    eventType,
    occurredAt,
    sessionId,
    actorType: "system",
    source: "api",
    gradingResultId,
  };
}

function evaluateSessionAnswer(
  sessionId: string,
  submittedAt: string,
  answer: SessionAnswerInput,
): { gradingResult: GradingResultRecord; events: GradingEvent[] } {
  const gradingResultId = createGradingResultId(
    sessionId,
    answer.submissionAnswerId,
  );

  if (answer.gradingMode === "manual-review-required") {
    return {
      gradingResult: {
        id: gradingResultId,
        sessionId,
        submissionAnswerId: answer.submissionAnswerId,
        questionId: answer.questionId,
        gradingMode: answer.gradingMode,
        answer: answer.answer,
        scoreAwarded: 0,
        maxScore: answer.maxScore,
        confidence: 0,
        requiresReview: true,
        rationale: "Manual review required for this grading mode.",
        reviewedBy: null,
        reviewedAt: null,
        submittedAt,
        resolution: "pending",
      },
      events: [createEvent("review.required", sessionId, gradingResultId)],
    };
  }

  if (!answer.acceptedAnswers || answer.acceptedAnswers.length === 0) {
    return {
      gradingResult: {
        id: gradingResultId,
        sessionId,
        submissionAnswerId: answer.submissionAnswerId,
        questionId: answer.questionId,
        gradingMode: answer.gradingMode,
        answer: answer.answer,
        scoreAwarded: 0,
        maxScore: answer.maxScore,
        confidence: 0,
        requiresReview: true,
        rationale:
          "Accepted answers were not provided for deterministic grading.",
        reviewedBy: null,
        reviewedAt: null,
        submittedAt,
        resolution: "pending",
      },
      events: [createEvent("review.required", sessionId, gradingResultId)],
    };
  }

  const evaluation = evaluateObjectiveAnswer(
    answer.answer,
    answer.acceptedAnswers,
  );
  const scoreAwarded = evaluation.isCorrect ? answer.maxScore : 0;

  return {
    gradingResult: {
      id: gradingResultId,
      sessionId,
      submissionAnswerId: answer.submissionAnswerId,
      questionId: answer.questionId,
      gradingMode: answer.gradingMode,
      answer: answer.answer,
      scoreAwarded,
      maxScore: answer.maxScore,
      confidence: evaluation.isCorrect ? 1 : 0.25,
      requiresReview: false,
      rationale: evaluation.isCorrect
        ? "Deterministic evaluation matched the accepted answers."
        : "Deterministic evaluation did not match the accepted answers.",
      reviewedBy: null,
      reviewedAt: null,
      submittedAt,
      resolution: "confirmed",
    },
    events: [],
  };
}

export function evaluateSessionAnswers(
  payload: SessionEvaluationRequest,
): SessionGradingResponse {
  const submittedAt = payload.submittedAt ?? new Date().toISOString();
  const gradingResultsForSession = payload.answers.map((answer) =>
    evaluateSessionAnswer(payload.sessionId, submittedAt, answer),
  );
  const gradingResults = gradingResultsForSession.map(
    ({ gradingResult }) => gradingResult,
  );
  const events = gradingResultsForSession.flatMap(({ events }) => events);

  events.unshift(createEvent("grading.finished", payload.sessionId));

  return {
    sessionId: payload.sessionId,
    submittedAt,
    gradingResults,
    summary: {
      totalAnswers: gradingResults.length,
      autoScoredCount: gradingResults.filter((result) => !result.requiresReview)
        .length,
      reviewRequiredCount: gradingResults.filter(
        (result) => result.requiresReview,
      ).length,
    },
    events,
  };
}

export function listReviewQueue(
  gradingResults: Iterable<GradingResultRecord>,
): ReviewQueueResponse {
  const items = Array.from(gradingResults)
    .filter((result) => result.requiresReview)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));

  return {
    items,
    total: items.length,
  };
}

export function resolveReview(
  gradingResult: GradingResultRecord,
  payload: ReviewResolutionRequest,
): GradingResultRecord {
  const reviewedAt = new Date().toISOString();
  const resolution =
    payload.scoreAwarded === gradingResult.scoreAwarded
      ? "confirmed"
      : "score-overridden";

  return {
    ...gradingResult,
    scoreAwarded: payload.scoreAwarded,
    rationale: payload.rationale,
    reviewedBy: payload.reviewedBy,
    reviewedAt,
    requiresReview: false,
    confidence: 1,
    resolution,
  };
}

export function createReviewResolutionResponse(
  gradingResult: GradingResultRecord,
): ReviewResolutionResponse {
  return {
    gradingResult,
  };
}
