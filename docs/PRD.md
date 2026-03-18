# Product Requirements Document

## Objective

Build a production system that lets BeGifted send curriculum-appropriate pre-tests to families, grade the submissions with minimal human intervention, generate diagnostic reports, and support the product owner's follow-up call with consistent package recommendations.

## Business workflow

1. Parent contacts BeGifted about one or more classes.
2. Staff selects the correct assessment based on subject, curriculum, and level.
3. The system sends a secure invitation link to the parent or student.
4. The student completes the pre-test on the platform.
5. Objective questions are graded automatically.
6. Subjective responses are draft-scored and queued for staff validation.
7. The system generates an Academic Trial Report draft plus suggested next-step package.
8. Staff validates the result and the product owner calls the parent.
9. The approved report is emailed to the parent and institution recipients.

## Users

- `Parent`: receives invitations and the final report
- `Student`: completes the assigned pre-test
- `Product Owner`: validates outcomes, calls parents, and overrides recommendations
- `Academic Staff`: reviews grading exceptions, content QA, and diagnostics
- `Operations/Admin`: manages templates, invitations, recipient lists, and reporting

## V1 scope

- secure invitation-based student access
- structured assessment content model
- objective auto-grading
- subjective draft scoring with required review
- rule-based package recommendation with override
- report generation and email dispatch
- database-backed submission and audit history
- GitHub-driven engineering delivery workflow

## Out of scope for V1

- payments
- recurring student accounts
- adaptive testing
- multilingual content delivery
- institution self-service portal
- direct CRM integration beyond optional export or webhook preparation

## Success metrics

- invitation-to-submission completion rate above 70% for valid invites
- 90%+ of objective items graded without manual intervention
- under 10 minutes staff review time for a standard submission
- parent report delivery within one business day of submission
- zero orphaned submissions or lost reports

## Operational constraints

- hybrid grading remains mandatory for writing-heavy assessments
- business recommendations must stay auditable and rule-based
- content publication requires QA sign-off
- the product owner is the final human checkpoint before parent delivery

## Rollout phases

### Phase 1

Objective-heavy assessments, internal staff workflows, and baseline report automation.

### Phase 2

Writing-heavy assessments, expanded diagnostic rules, and institution-recipient automation.

### Phase 3

Operational analytics, content scale-up, and optional CRM or payment adjacency.

## Acceptance criteria by subsystem

### Invitation and access

- staff can create an invite tied to one or more assessments
- invite links expire and cannot be reused after submission
- student progress autosaves

### Grading and review

- deterministic items grade immediately
- rubric-assisted items include score suggestion, rationale, and confidence
- manual review queue blocks report release until resolved

### Reporting

- system generates a branded PDF and internal breakdown
- suggested package follows stored rules and can be overridden
- email delivery logs all recipients and timestamps

### Content operations

- assessments cannot publish without schema validation and QA state
- imported assets remain traceable to source files
- each question carries topic tags and grading mode

