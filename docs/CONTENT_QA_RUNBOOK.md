# Content QA Runbook

## Purpose

Provide a repeatable workflow for importing assessment files, validating normalized content, and approving publication.

## Process

1. Copy source assets into `content/raw` through a tracked issue.
2. Extract diagrams and linked assets into `content/assets`.
3. Normalize the assessment into JSON under `content/normalized`.
4. Run `npm run validate:content`.
5. Compare the normalized structure against the source paper and mark scheme.
6. Confirm every question has topic tags, grading mode, and marks.
7. Record reviewer notes in `content/qa`.
8. Mark the version `approved` only after all gaps are resolved.

## Mandatory checks

- source asset traceability
- complete answer-key coverage or explicit manual-review flag
- correct ordering and mark totals
- asset references render correctly
- rubric criteria exist for subjective items

## Escalation

- missing mark scheme: block publication
- unclear diagram extraction: escalate to Content Pipeline Agent
- ambiguous rubric: escalate to Grading/Diagnostics Agent

