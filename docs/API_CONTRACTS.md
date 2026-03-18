# API Contracts

## API style

- JSON over HTTPS
- versioned under `/api`
- idempotent writes where possible
- auth split between staff-authenticated endpoints and invite-token endpoints

## Public invite endpoints

### `POST /api/invites`

Creates a Wise shadow sandbox invite.

Request fields:

- `studentName`
- `parentEmail`
- `recipientEmails`
- `assessmentVersionIds`
- `expiresAt`

Response fields:

- `inviteId`
- `token`
- `status`
- `expiresAt`
- `deliveryProvider`
- `launchUrl`
- `dryRun`
- `publishedQuestionIds`
- `skippedQuestionIds`

Notes:

- current sandbox flow supports exactly one assessment per invite
- current sandbox flow provisions only BeGifted-owned dummy Wise entities
- live Wise students, classes, billing, fees, and credits are out of scope and must not be touched

### `POST /api/invites/:inviteId/send`

Triggers email delivery of the invite link.

### `GET /api/public/invites/:token`

Returns token validity, student-safe metadata, assigned assessments, and sandbox launch metadata.

Response fields:

- `inviteId`
- `token`
- `studentName`
- `assessmentTitles`
- `expiresAt`
- `deliveryProvider`
- `launchUrl`
- `launchReady`
- `launchInstructions`

Error behavior:

- `404` when the invite token does not exist
- `410` when the invite has expired

### `GET /api/public/invites/:token/launch`

Validates the invite and redirects to the Wise sandbox launch target.

Error behavior:

- `404` when the invite token does not exist
- `410` when the invite has expired
- `409` when the launch target is unavailable

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

### `GET /api/wise/sandbox/account`

Returns the Wise sandbox connectivity snapshot.

Response fields:

- `deliveryProvider`
- `mode`
- `configured`
- `account`

### `GET /api/wise/sandbox/logs`

Returns recent Wise sandbox write logs.

Response fields:

- `total`
- `items`

### `POST /api/wise/sandbox/tests/:testId/submissions/sync`

Pulls submissions only for BeGifted-owned Wise sandbox tests and maps them into the grading shell.

Response fields:

- `deliveryProvider`
- `testId`
- `assessmentId`
- `totalSubmissions`
- `syncedSubmissions`

Error behavior:

- `403` when the test is not a BeGifted-owned sandbox binding
- `400` when the binding is incomplete or the sync request cannot be satisfied safely

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
- Wise shadow endpoints default to dry-run behavior unless `WISE_SANDBOX_ALLOW_MUTATIONS=true`
