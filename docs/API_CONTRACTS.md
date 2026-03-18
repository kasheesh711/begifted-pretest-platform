# API Contracts

## API style

- JSON over HTTPS
- versioned under `/api`
- idempotent writes where possible
- auth split between staff-authenticated endpoints and invite-token endpoints

## Public invite endpoints

### `POST /api/invites`

Creates an assessment invite.

Request fields:

- `studentName`
- `parentEmail`
- `recipientEmails`
- `assessmentVersionIds`
- `expiresAt`

Response fields:

- `inviteId`
- `status`
- `expiresAt`

### `POST /api/invites/:inviteId/send`

Triggers email delivery of the invite link.

### `GET /api/public/invites/:token`

Returns token validity, student-safe metadata, and assigned assessments.

### `POST /api/public/sessions/:sessionId/autosave`

Stores partial answers.

### `POST /api/public/sessions/:sessionId/submit`

Locks the session and emits `submission.completed`.

## Staff endpoints

### `POST /api/grading/evaluate`

Seeds grading results for a submitted session and emits shell grading events.

Request fields:

- `sessionId`
- `submittedAt` optional
- `answers[]`
- `answers[].submissionAnswerId`
- `answers[].questionId`
- `answers[].gradingMode`
- `answers[].answer`
- `answers[].acceptedAnswers` optional for deterministic items
- `answers[].maxScore`

Response fields:

- `sessionId`
- `submittedAt`
- `gradingResults`
- `summary`
- `events`

### `GET /api/review-queue`

Returns submissions requiring review.

Response fields:

- `items`
- `total`

### `POST /api/review-queue/:gradingResultId/resolve`

Stores a review decision or score override.

Request fields:

- `reviewedBy`
- `scoreAwarded`
- `rationale`

Response fields:

- `gradingResult`

### `POST /api/reports/:sessionId/generate`

Creates a report draft payload and artifact.

### `POST /api/reports/:sessionId/approve`

Marks a report approved and emits `report.approved`.

### `POST /api/reports/:sessionId/send`

Dispatches the final report to recipients.

## Event contracts

- `invite.created`
- `invite.sent`
- `submission.completed`
- `grading.finished`
- `review.required`
- `report.generated`
- `report.approved`
- `report.sent`

Each event payload must include:

- `eventId`
- `occurredAt`
- `sessionId` or `inviteId`
- `actorType`
- `source`

## Error expectations

- public token endpoints return `404` or `410` for invalid or expired links
- submission endpoints reject writes after final submit
- report send endpoints reject when unresolved reviews remain
