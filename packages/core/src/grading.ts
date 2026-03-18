import type { ObjectiveResult } from "./contracts.js";

function normalizeValue(value: string | number) {
  return String(value).trim().toLowerCase();
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
