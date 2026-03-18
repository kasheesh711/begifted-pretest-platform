# QA Note: Year 7 Science Foundation Pre-Test

## Publication State
- Status: `approved` (Draft imported and verified)

## Checks Performed
- [x] source asset traceability: Sourced from `Pretest for Wise/Science/QP_UK/YEAR 7 Science Foundation Pre-Test.docx` and `MARK SCHEME.docx`.
- [x] complete answer-key coverage: Every question is mapped. Rubrics captured for Section B and C.
- [x] correct ordering and mark totals: Verified total 30 marks.
- [x] asset references render correctly: No image assets present in this test.
- [x] rubric criteria exist for subjective items: Yes, added to Q8, Q10, Q11, Q12, Q13, Q14, Q15.

## Ambiguities and Resolutions
- **Matching Question (Q4):** `acceptedAnswers` uses a `"State:Letter"` format (e.g. `"Solid:B"`) as matching pairs aren't strongly typed in `schema.ts`.
- **Reading Passage:** Since the schema doesn't yet support a shared passage, the reading passage text is embedded directly into the prompt for Q8.
- **Sub-Questions:** Q13 has parts a and b. We merged them into a single 4-mark question in our JSON with a combined rubric, matching the total mark count and schema capabilities without creating sub-question types.
