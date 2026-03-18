# Data Model

## Core entities

### AssessmentTemplate

- `id`
- `subject`
- `curriculum`
- `level`
- `title`
- `durationMinutes`
- `status`
- `latestVersionId`

### AssessmentVersion

- `id`
- `assessmentTemplateId`
- `versionNumber`
- `sourceAssetRefs`
- `publishedAt`
- `qaState`
- `questionCount`

### Question

- `id`
- `assessmentVersionId`
- `sequence`
- `type`
- `prompt`
- `marks`
- `topicTags`
- `gradingMode`
- `assetRefs`

### AnswerKey

- `id`
- `questionId`
- `acceptedAnswers`
- `tolerance`
- `rubricRef`
- `diagnosticTags`

### Invite

- `id`
- `studentName`
- `parentEmail`
- `recipientEmails`
- `assessmentVersionIds`
- `tokenHash`
- `expiresAt`
- `status`

### AssessmentSession

- `id`
- `inviteId`
- `startedAt`
- `submittedAt`
- `status`
- `autosaveVersion`

### SubmissionAnswer

- `id`
- `sessionId`
- `questionId`
- `answerPayload`
- `submittedAt`

### GradingResult

- `id`
- `submissionAnswerId`
- `scoreAwarded`
- `maxScore`
- `confidence`
- `requiresReview`
- `rationale`
- `reviewedBy`
- `reviewedAt`

### DiagnosticSummary

- `id`
- `sessionId`
- `overallBand`
- `strengths`
- `weaknesses`
- `topicBreakdown`
- `examTechniqueFlags`

### RecommendationRule

- `id`
- `subject`
- `curriculum`
- `scoreBand`
- `severityThreshold`
- `recommendedHours`
- `recommendedPackage`

### ReportArtifact

- `id`
- `sessionId`
- `status`
- `pdfUrl`
- `approvedBy`
- `approvedAt`
- `sentAt`

## Relationship notes

- one template has many versions
- one version has many questions
- one question has one answer key definition per version
- one invite can assign one or more assessment versions
- one invite creates one primary assessment session
- one session has many answers, grading results, diagnostics, and reports

## Audit requirements

- invite creation and resend history
- every grading override
- every recommendation override
- every report generation and resend event
- content publication history per assessment version

