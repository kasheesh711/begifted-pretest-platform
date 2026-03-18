# QA Record: science-uk-year-7-foundation-pretest

## Status

- Publication state: draft
- Reviewer: unassigned
- Last updated: 2026-03-18

## Source files

- Question paper: `Pretest for Wise/Science/QP_UK/YEAR 7 Science Foundation Pre-Test.docx`
- Mark scheme: `Pretest for Wise/Science/MS_UK/Year 7 - ANSWER KEY & MARK SCHEME.docx`

## Normalization summary

- Assessment ID: `science-uk-year-7-foundation-pretest`
- Curriculum: UK
- Level: Year 7
- Duration: 45 minutes
- Total questions: 15
- Objective items: 9
- Hybrid/rubric items: 3
- Manual-review writing items: 3

## Modeling decisions

- Q4 is represented as one `matching` item with the canonical mapping `Solid:B|Liquid:C|Gas:A`.
- Q8, Q10, and Q12 are marked `rubric-assisted` because the mark scheme contains stable model answers with short explanatory criteria.
- Q13, Q14, and Q15 are marked `manual-review-required` because they depend on writing quality, command-word understanding, and paragraph structure.
- Accepted answers for deterministic items include both the letter and the canonical text where the mark scheme is unambiguous.

## Diagnostic coverage

- Core scientific knowledge: life processes, photosynthesis, temperature units, states of matter, physical vs chemical change, food chains, forces
- Reading and reasoning: experiment aims, variables, particle-theory explanations, fair testing
- Scientific writing and exam technique: command words, explanation quality, paragraph structure

## Ambiguities and follow-up

- The current schema does not support subparts explicitly, so Q13 is stored as one `long_form` item worth 4 marks.
- The current schema also does not store rubric rows separately, so the writing mark scheme for Q15 is preserved in the accepted-answer summary and this QA note.
- If partial-credit deterministic matching is required later, extend the grading engine rather than changing this record ad hoc.

## Validation

- `npm run validate:content`
