import type {
  EventEnvelope,
  ObjectiveResult,
  ResolveReviewRequest,
  ReviewQueueItem,
  SeedGradingAnswerInput,
  SeedGradingRequest,
  SeedGradingResponse,
  SeedGradingResult,
} from "./contracts.js";

function normalizeValue(value: string | number) {
  return String(value).trim().toLowerCase();
}

function buildAnswerPreview(
  answer: string | number | Array<string | number>,
): string {
  if (Array.isArray(answer)) {
    return answer.map((value) => String(value)).join(", ");
  }

  return String(answer);
}

function clampScore(score: number, maxScore: number) {
  return Math.min(maxScore, Math.max(0, score));
}

function createGradingEvent(
  type: "grading.finished" | "review.required",
  sessionId: string,
  gradingResultId: string,
  occurredAt: string,
): EventEnvelope<"grading.finished" | "review.required"> {
  return {
    eventId: `${type}:${gradingResultId}:${occurredAt}`,
    type,
    occurredAt,
    sessionId,
    actorType: "system",
    source: "api",
  };
}

function gradeSeedAnswer(
  sessionId: string,
  answerInput: SeedGradingAnswerInput,
): SeedGradingResult {
  const id = `grading-${answerInput.submissionAnswerId}`;
  const answerPreview = buildAnswerPreview(answerInput.answer);

  if (answerInput.gradingMode === "objective") {
    const objectiveResult = evaluateObjectiveAnswer(
      answerInput.answer,
      answerInput.acceptedAnswers ?? [],
    );

    return {
      id,
      sessionId,
      submissionAnswerId: answerInput.submissionAnswerId,
      questionId: answerInput.questionId,
      prompt: answerInput.prompt,
      gradingMode: answerInput.gradingMode,
      answerPreview,
      scoreAwarded: objectiveResult.isCorrect ? answerInput.maxScore : 0,
      maxScore: answerInput.maxScore,
      confidence: 1,
      requiresReview: false,
      rationale: objectiveResult.isCorrect
        ? "Matched accepted answer."
        : "Did not match accepted answer.",
      reviewedBy: null,
      reviewedAt: null,
      reviewStatus: "resolved",
    };
  }

  const hasDraftContent = answerPreview.trim().length > 0;
  const draftScore = hasDraftContent
    ? Math.max(1, Math.round(answerInput.maxScore * 0.6))
    : 0;

  return {
    id,
    sessionId,
    submissionAnswerId: answerInput.submissionAnswerId,
    questionId: answerInput.questionId,
    prompt: answerInput.prompt,
    gradingMode: answerInput.gradingMode,
    answerPreview,
    scoreAwarded: clampScore(draftScore, answerInput.maxScore),
    maxScore: answerInput.maxScore,
    confidence: hasDraftContent ? 0.35 : 0.1,
    requiresReview: true,
    rationale: hasDraftContent
      ? "Seed rubric draft created for manual review."
      : "Empty subjective response requires manual review.",
    reviewedBy: null,
    reviewedAt: null,
    reviewStatus: "pending",
  };
}

export function evaluateObjectiveAnswer(
  answer: string | number | Array<string | number>,
  acceptedAnswers: string[],
): ObjectiveResult {
  const normalizedAnswer = Array.isArray(answer)
    ? answer.map(normalizeValue).sort()
    : [normalizeValue(answer)];
  const normalizedAccepted = acceptedAnswers.map(normalizeValue).sort();

  const isCorrect =
    normalizedAnswer.length === normalizedAccepted.length &&
    normalizedAnswer.every(
      (value, index) => value === normalizedAccepted[index],
    );

  return {
    isCorrect,
    normalizedAnswer,
    acceptedAnswers: normalizedAccepted,
  };
}

export function createReviewQueueItem(
  gradingResult: SeedGradingResult,
): ReviewQueueItem {
  return {
    gradingResultId: gradingResult.id,
    sessionId: gradingResult.sessionId,
    submissionAnswerId: gradingResult.submissionAnswerId,
    questionId: gradingResult.questionId,
    prompt: gradingResult.prompt,
    answerPreview: gradingResult.answerPreview,
    scoreAwarded: gradingResult.scoreAwarded,
    maxScore: gradingResult.maxScore,
    confidence: gradingResult.confidence,
    rationale: gradingResult.rationale,
    reviewStatus: gradingResult.reviewStatus,
  };
}

export function createReviewQueue(
  gradingResults: SeedGradingResult[],
): ReviewQueueItem[] {
  return gradingResults
    .filter(
      (gradingResult) =>
        gradingResult.requiresReview &&
        gradingResult.reviewStatus === "pending",
    )
    .map(createReviewQueueItem);
}

export function evaluateSeedGrading(
  request: SeedGradingRequest,
  occurredAt = new Date().toISOString(),
): SeedGradingResponse {
  const gradingResults = request.answers.map((answerInput) =>
    gradeSeedAnswer(request.sessionId, answerInput),
  );
  const reviewQueue = createReviewQueue(gradingResults);
  const events = gradingResults.flatMap((gradingResult) => {
    const gradingFinished = createGradingEvent(
      "grading.finished",
      request.sessionId,
      gradingResult.id,
      occurredAt,
    );

    if (!gradingResult.requiresReview) {
      return [gradingFinished];
    }

    return [
      gradingFinished,
      createGradingEvent(
        "review.required",
        request.sessionId,
        gradingResult.id,
        occurredAt,
      ),
    ];
  });

  return {
    sessionId: request.sessionId,
    gradingResults,
    reviewQueue,
    events,
  };
}

export function resolveReviewItem(
  gradingResult: SeedGradingResult,
  request: ResolveReviewRequest,
  reviewedAt = new Date().toISOString(),
): SeedGradingResult {
  const nextScore =
    request.scoreAwarded === undefined
      ? gradingResult.scoreAwarded
      : clampScore(request.scoreAwarded, gradingResult.maxScore);

  return {
    ...gradingResult,
    scoreAwarded: nextScore,
    confidence: 1,
    requiresReview: false,
    rationale: request.rationale
      ? `${gradingResult.rationale} Review: ${request.rationale}`
      : gradingResult.rationale,
    reviewedBy: request.reviewedBy,
    reviewedAt,
    reviewStatus: "resolved",
  };
}
