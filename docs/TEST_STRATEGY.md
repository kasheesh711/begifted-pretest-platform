# Test Strategy

## Principles

- every task must declare the checks it requires
- contracts and schemas are tested before UI polish
- changes to grading, diagnostics, or content rules require deterministic fixtures

## Test layers

### Unit tests

- grading helpers
- recommendation rules
- content schema validators
- UI helpers and pure state transforms

### Integration tests

- API routes
- invite/session lifecycle
- grading pipeline boundaries
- report-generation orchestration

### End-to-end tests

- invite receipt to submission
- review queue to approval
- report generation and delivery

## Minimum required checks

- docs-only task: proofread plus link/path verification
- config/CI task: lint, typecheck, workflow syntax validation where possible
- API task: lint, typecheck, unit tests, route integration tests
- web task: lint, typecheck, unit tests, screenshot or interaction evidence
- content task: schema validation plus QA record update

## Ownership

- QA/Ops Agent owns CI and test harnesses
- feature agents own tests for the code they change
- PM/Spec Agent ensures acceptance criteria are testable

