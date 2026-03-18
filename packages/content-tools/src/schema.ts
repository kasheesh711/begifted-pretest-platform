import { z } from "zod";

export const gradingModeSchema = z.enum([
  "deterministic",
  "rubric-assisted",
  "manual-review-required",
]);

export const questionTypeSchema = z.enum([
  "multiple_choice",
  "multi_select",
  "numeric",
  "short_text",
  "matching",
  "ordering",
  "long_form",
]);

export const questionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  type: questionTypeSchema,
  marks: z.number().int().positive(),
  topicTags: z.array(z.string()).min(1),
  gradingMode: gradingModeSchema,
  acceptedAnswers: z.array(z.string()).default([]),
});

export const assessmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  curriculum: z.string(),
  level: z.string(),
  durationMinutes: z.number().int().positive(),
  questions: z.array(questionSchema).min(1),
});

export type Assessment = z.infer<typeof assessmentSchema>;
