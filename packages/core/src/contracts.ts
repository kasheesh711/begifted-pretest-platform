export const primaryObjectives = [
  "Digitize assessments into a schema-driven platform",
  "Automate objective grading and route subjective grading to review",
  "Generate parent-ready diagnostic reports with business recommendations",
] as const;

export const appAreas = [
  "Student invitations and secure assessment sessions",
  "Content ingestion, normalization, and QA approval",
  "Diagnostics, reporting, and review workflow automation",
] as const;

export type AgentOwner =
  | "PM"
  | "Platform"
  | "Frontend"
  | "Content"
  | "Grading"
  | "QA";

export interface ObjectiveResult {
  isCorrect: boolean;
  normalizedAnswer: string[];
  acceptedAnswers: string[];
}

export type GradingMode = "objective" | "subjective";

export type ReviewQueueStatus = "pending" | "resolved";

export interface SeedGradingAnswerInput {
  submissionAnswerId: string;
  questionId: string;
  prompt: string;
  gradingMode: GradingMode;
  answer: string | number | Array<string | number>;
  acceptedAnswers?: string[];
  maxScore: number;
}

export interface SeedGradingRequest {
  sessionId: string;
  answers: SeedGradingAnswerInput[];
}

export interface SeedGradingResult {
  id: string;
  sessionId: string;
  submissionAnswerId: string;
  questionId: string;
  prompt: string;
  gradingMode: GradingMode;
  answerPreview: string;
  scoreAwarded: number;
  maxScore: number;
  confidence: number;
  requiresReview: boolean;
  rationale: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewStatus: ReviewQueueStatus;
}

export interface ReviewQueueItem {
  gradingResultId: string;
  sessionId: string;
  submissionAnswerId: string;
  questionId: string;
  prompt: string;
  answerPreview: string;
  scoreAwarded: number;
  maxScore: number;
  confidence: number;
  rationale: string;
  reviewStatus: ReviewQueueStatus;
}

export interface EventEnvelope<EventType extends string> {
  eventId: string;
  type: EventType;
  occurredAt: string;
  sessionId: string;
  actorType: "system" | "staff";
  source: "api";
}

export interface SeedGradingResponse {
  sessionId: string;
  gradingResults: SeedGradingResult[];
  reviewQueue: ReviewQueueItem[];
  events: Array<EventEnvelope<"grading.finished" | "review.required">>;
}

export interface ResolveReviewRequest {
  reviewedBy: string;
  scoreAwarded?: number;
  rationale?: string;
}
