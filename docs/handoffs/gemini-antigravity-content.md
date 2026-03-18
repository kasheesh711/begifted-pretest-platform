# Gemini via Antigravity Handoff

## Assignment

- Agent: Gemini via Antigravity
- Role: Content Pipeline Agent
- Issue: `#1`
- Issue URL: `https://github.com/kasheesh711/begifted-pretest-platform/issues/1`
- Branch: `codex/feat/1-science-seed`
- Worktree: `/Users/kevinhsieh/Desktop/workspace/agents/gemini-content-1`

## Objective

Import one objective-heavy science assessment into normalized JSON and create its QA record.

## Allowed write scope

- `packages/content-tools/**`
- `content/**`
- related content docs only if they must change to explain the import or QA process

Do not edit runtime app code in `apps/web` or `apps/api`.

## First-read files

1. `AGENTS.md`
2. `docs/CONTENT_MODEL.md`
3. `docs/CONTENT_QA_RUNBOOK.md`
4. `content/normalized/example-assessment.json`
5. `packages/content-tools/src/schema.ts`
6. `packages/content-tools/src/validate-content.ts`

## Recommended source material

Start with the UK Year 7 science paper and its mark scheme because they are already represented by the sample normalized record shape.

- Question paper: `Pretest for Wise/Science/QP_UK/YEAR 7 Science Foundation Pre-Test.docx`
- Mark scheme: `Pretest for Wise/Science/MS_UK/Year 7 - ANSWER KEY & MARK SCHEME.docx`

## Deliverables

- one new normalized JSON file under `content/normalized/`
- one QA note under `content/qa/`
- any minimal content-tool changes required to support validation or clearer metadata

## Acceptance criteria

- one objective-heavy science assessment is represented in the canonical schema
- source and mark scheme remain traceable
- QA record exists and records current publication state
- `npm run validate:content` passes

## Validation

- `npm run validate:content`
- `npm run lint` if tooling code changes
- `npm run typecheck` if tooling code changes

## Notes for Gemini

- Prefer deterministic content modeling over over-generalizing the importer.
- If the source contains ambiguity, capture it in the QA note rather than guessing.
- Keep the first pass narrow and publishable; do not attempt a generic OCR or conversion framework in this issue.

## Handoff expectation

On pause or completion, provide:

- files changed
- validation run
- unresolved content ambiguities
- exact next suggested import task

