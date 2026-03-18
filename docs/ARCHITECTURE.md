# Architecture Overview

## Selected stack

- frontend: Next.js with TypeScript
- API and background entrypoints: Fastify with TypeScript
- shared contracts and business logic: `packages/core`
- content ingestion and validation: `packages/content-tools`
- database and auth target: Supabase
- job orchestration target: Trigger.dev or Inngest
- hosting target: Vercel for web and managed Node runtime for API
- notifications target: Resend or Postmark
- monitoring target: Sentry

## Monorepo boundaries

- `apps/web` owns the student test experience and internal portal surfaces
- `apps/api` owns authenticated APIs, public invite endpoints, and job triggers
- `packages/core` owns contracts shared across apps and future services
- `packages/ui` owns reusable presentation components
- `packages/content-tools` owns schema validation, import pipelines, and QA tooling

## Runtime architecture

1. Staff creates an invite and selects assessment templates.
2. API stores the invite, recipient data, and expiration policy.
3. Email service sends a one-time access link.
4. Student uses the web app to complete the assessment.
5. Submission answers are persisted incrementally.
6. Objective grading runs synchronously or in a background job.
7. Subjective items are scored with rubric-assisted logic and review flags.
8. Diagnostics and recommendation rules assemble the report payload.
9. Staff validates the result.
10. Approved report is rendered to PDF and distributed.

## Application boundaries

### Web app

- invitation landing
- assessment session UI
- staff dashboard
- grading review queue
- report preview and approval screens

### API app

- health and operational endpoints
- invite/session/submission APIs
- grading orchestration endpoints
- webhook endpoints for email, auth, and future automation

## Data flow

- raw binary assets enter `content/raw`
- normalized JSON is stored in `content/normalized`
- runtime content is loaded into database records or object storage-backed references
- submissions generate grading results and diagnostics
- approved results generate PDF artifacts and email events

## Auth and invitation model

- staff authenticate through managed auth
- students use secure invite tokens rather than full accounts in V1
- invite tokens map to assessment sessions with limited lifetime and single-submission policy

## Grading pipeline

- deterministic evaluation for objective items
- rubric-assisted draft scoring for short and long form responses
- confidence thresholding and mandatory review routing
- audit trail on every manual override

## Diagnostics and reporting pipeline

- aggregate missed objectives by topic and skill tag
- map topic severity to parent-facing diagnostic summaries
- generate next-step package recommendations from rule tables
- render report payload into code-owned PDF template

## External services

- GitHub: engineering workflow, issues, Projects, PR gating
- Supabase: database, storage, auth, row-level security
- Vercel: frontend deployment and preview URLs
- Email provider: invite and report delivery
- Sentry: runtime monitoring

