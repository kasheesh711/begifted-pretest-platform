# Content Model

## Canonical question types

- `multiple_choice`
- `multi_select`
- `numeric`
- `short_text`
- `matching`
- `ordering`
- `long_form`

## Assessment schema

Each normalized assessment must store:

- assessment metadata: subject, curriculum, level, title, duration
- ordered questions
- grading mode per question
- accepted answers or rubric references
- topic tags and diagnostic tags
- asset references

## Answer key rules

### Deterministic items

- exact-match values
- optional normalized alternatives
- optional numeric tolerance

### Rubric-assisted items

- criterion list
- score bands
- model answer or anchor notes
- escalation threshold for manual review

### Manual-review-required items

- rubric reference
- explicit reviewer instructions

## Asset handling

- binaries originate in `content/raw`
- extracted images and diagrams live in `content/assets`
- normalized JSON refers to assets by stable relative path and version

## QA state model

- `draft`
- `parsed`
- `normalized`
- `review-needed`
- `approved`
- `published`
- `archived`

## Publication rules

- no assessment publishes without schema validation
- no assessment publishes without at least one QA record
- every question must have topic tags and grading mode
- missing mark schemes block publication for objective auto-grading

