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
