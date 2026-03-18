import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CreateInviteRequest,
  type CreateInviteResponse,
  type PublicInviteLookupResponse,
  type SessionAnswerInput,
  type SessionGradingResponse,
  type WiseAction,
  type WiseEntityBinding,
  type WiseReadAction,
  type WiseSandboxCourse,
  type WiseSandboxEntityType,
  type WiseSandboxStudent,
  type WiseSandboxTest,
  type WiseSubmissionGradingRecord,
  type WiseSubmissionSyncResponse,
  type WiseWriteAction,
  type WiseWriteLogEntry,
  createWiseSandboxToken as createCoreInviteToken,
  createWiseSandboxCourseName,
  createWiseSandboxExternalRef,
  createWiseSandboxStudentName,
  createWiseSandboxTestName,
  evaluateSessionAnswers,
  evaluateWiseWriteGuard,
  wiseAllowedWriteActions,
  wiseSandboxCoursePrefix,
  wiseSandboxOwner,
  wiseSandboxStudentPrefix,
  wiseSandboxTestPrefix,
} from "@begifted/core";

type WiseQuestionType =
  | "MCQ_SINGLE_CORRECT"
  | "FILL_IN_THE_BLANK"
  | "INTEGER_ANSWER";

interface AssessmentRecord {
  id: string;
  title: string;
  subject: string;
  curriculum: string;
  level: string;
  durationMinutes: number;
  questions: Array<{
    id: string;
    prompt: string;
    type: string;
    marks: number;
    gradingMode: string;
    acceptedAnswers: string[];
  }>;
}

interface WiseQuestionDraft {
  questionId: string;
  marks: number;
  question_type: WiseQuestionType;
  text: string;
  answer: string;
  options?: Record<string, string>;
}

interface WisePublishedAssessment {
  assessmentId: string;
  assessmentTitle: string;
  publishedQuestionIds: string[];
  skippedQuestionIds: string[];
  questionDrafts: WiseQuestionDraft[];
}

interface WiseClientConfig {
  host?: string;
  examHost?: string;
  userId?: string;
  apiKey?: string;
  instituteId?: string;
  namespace?: string;
  userAgent?: string;
  allowMutations?: boolean;
  launchUrlTemplate?: string;
}

interface WiseAccountUser {
  wiseUserId: string;
  name: string;
  namespace: string;
  email?: string;
}

interface WiseCourseSection {
  sectionId: string;
  name: string;
}

interface WiseSubmissionRecord {
  submissionId: string;
  userName: string;
  answers: Record<string, string>;
}

interface WiseTestSubmissionBundle {
  submissions: WiseSubmissionRecord[];
}

interface WiseClient {
  configured: boolean;
  mode: "dry-run" | "live";
  namespace: string;
  launchUrlTemplate?: string;
  getAccountUser(): Promise<WiseAccountUser>;
  createStudent(input: {
    vendorUserId: string;
    displayName: string;
    email: string;
    phoneNumber: string;
  }): Promise<WiseSandboxStudent>;
  createCourse(input: {
    displayName: string;
    subject: string;
  }): Promise<WiseSandboxCourse>;
  assignCourseToStudent(input: {
    courseId: string;
    studentId: string;
  }): Promise<void>;
  getCourseSections(courseId: string): Promise<WiseCourseSection[]>;
  createTest(input: {
    classId: string;
    displayName: string;
    sectionId: string;
  }): Promise<Pick<WiseSandboxTest, "wiseId" | "classId" | "displayName">>;
  addQuestions(input: {
    classId: string;
    testId: string;
    questions: WiseQuestionDraft[];
  }): Promise<void>;
  updateTestSettings(input: {
    classId: string;
    testId: string;
    displayName: string;
    questionDrafts: WiseQuestionDraft[];
  }): Promise<void>;
  publishTest(input: { classId: string; testId: string }): Promise<void>;
  getTestSubmissions(input: {
    classId: string;
    testId: string;
  }): Promise<WiseTestSubmissionBundle>;
}

interface WiseSandboxInviteRecord {
  inviteId: string;
  token: string;
  studentName: string;
  parentEmail: string;
  recipientEmails: string[];
  expiresAt: string;
  assessmentVersionIds: string[];
  assessmentTitles: string[];
  deliveryProvider: "wise-sandbox";
  launchUrl: string | null;
  dryRun: boolean;
  wiseStudentId: string;
  wiseCourseId: string;
  wiseTestId: string;
  publishedQuestionIds: string[];
  skippedQuestionIds: string[];
}

function toIsoNow() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseJsonResponse(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function extractWiseId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record._id === "string") {
      return record._id;
    }
    if (typeof record.id === "string") {
      return record.id;
    }
    if (typeof record.$oid === "string") {
      return record.$oid;
    }
  }

  return null;
}

function createSyntheticPhoneNumber(seed: string) {
  const digits = seed.replace(/\D/g, "").padEnd(10, "0").slice(0, 10);

  return `+1${digits}`;
}

function createSyntheticStudentIdentity(studentName: string) {
  const ref = createWiseSandboxExternalRef(studentName);
  const slug = slugify(studentName) || "student";

  return {
    externalRef: ref,
    vendorUserId: ref,
    email: `${slug}.${ref}@example.invalid`,
    phoneNumber: createSyntheticPhoneNumber(ref),
  };
}

function parseMultipleChoiceDraft(
  question: AssessmentRecord["questions"][number],
) {
  const lines = question.prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const options: Record<string, string> = {};
  const stem: string[] = [];

  for (const line of lines) {
    const match = /^([A-D])\.\s*(.+)$/.exec(line);
    if (match) {
      const [, optionKey, optionValue] = match;
      if (!optionKey || !optionValue) {
        continue;
      }

      options[optionKey.toLowerCase()] = optionValue;
      continue;
    }
    stem.push(line);
  }

  const answer = question.acceptedAnswers.find((value) =>
    /^[A-D]$/i.test(value.trim()),
  );

  if (Object.keys(options).length < 2 || !answer) {
    return null;
  }

  return {
    questionId: question.id,
    marks: question.marks,
    question_type: "MCQ_SINGLE_CORRECT" as const,
    text: stem.join("\n"),
    answer: answer.trim().toLowerCase(),
    options,
  };
}

function parseFillBlankDraft(question: AssessmentRecord["questions"][number]) {
  if (question.acceptedAnswers.length === 0) {
    return null;
  }

  return {
    questionId: question.id,
    marks: question.marks,
    question_type: "FILL_IN_THE_BLANK" as const,
    text: question.prompt,
    answer: question.acceptedAnswers.join(", "),
  };
}

function parseIntegerDraft(question: AssessmentRecord["questions"][number]) {
  const answer = question.acceptedAnswers.find((value) =>
    /^\d+$/.test(value.trim()),
  );
  if (!answer) {
    return null;
  }

  return {
    questionId: question.id,
    marks: question.marks,
    question_type: "INTEGER_ANSWER" as const,
    text: question.prompt,
    answer: answer.trim(),
  };
}

function buildWisePublishedAssessment(
  assessment: AssessmentRecord,
): WisePublishedAssessment {
  const publishedQuestionIds: string[] = [];
  const skippedQuestionIds: string[] = [];
  const questionDrafts: WiseQuestionDraft[] = [];

  for (const question of assessment.questions) {
    if (question.gradingMode !== "deterministic" || question.marks !== 1) {
      skippedQuestionIds.push(question.id);
      continue;
    }

    let draft: WiseQuestionDraft | null = null;

    if (question.type === "multiple_choice") {
      draft = parseMultipleChoiceDraft(question);
    } else if (question.type === "short_text") {
      draft = parseFillBlankDraft(question);
    } else if (question.type === "numeric") {
      draft = parseIntegerDraft(question);
    }

    if (!draft) {
      skippedQuestionIds.push(question.id);
      continue;
    }

    questionDrafts.push(draft);
    publishedQuestionIds.push(question.id);
  }

  return {
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    publishedQuestionIds,
    skippedQuestionIds,
    questionDrafts,
  };
}

function loadAssessmentCatalogFromDisk() {
  const normalizedDir = fileURLToPath(
    new URL("../../../content/normalized", import.meta.url),
  );
  const files = readdirSync(normalizedDir).filter((file) =>
    file.endsWith(".json"),
  );
  const catalog = new Map<string, AssessmentRecord>();

  for (const file of files) {
    const raw = readFileSync(join(normalizedDir, file), "utf8");
    const assessment = JSON.parse(raw) as AssessmentRecord;
    catalog.set(assessment.id, assessment);
  }

  return catalog;
}

class InMemoryWiseSandboxStore {
  #bindings = new Map<string, WiseEntityBinding>();
  #bindingsByExternalRef = new Map<string, WiseEntityBinding>();
  #invitesByToken = new Map<string, WiseSandboxInviteRecord>();
  #logs: WiseWriteLogEntry[] = [];
  #syncedSubmissions = new Map<string, SessionGradingResponse[]>();

  getBindings() {
    return this.#bindings.values();
  }

  getBindingById(wiseId: string) {
    return this.#bindings.get(wiseId);
  }

  getBindingByExternalRef(
    entityType: WiseSandboxEntityType,
    externalRef: string,
  ) {
    return this.#bindingsByExternalRef.get(`${entityType}:${externalRef}`);
  }

  saveBinding(binding: WiseEntityBinding) {
    this.#bindings.set(binding.wiseId, binding);
    this.#bindingsByExternalRef.set(
      `${binding.entityType}:${binding.externalRef}`,
      binding,
    );
  }

  saveInvite(invite: WiseSandboxInviteRecord) {
    this.#invitesByToken.set(invite.token, invite);
  }

  getInviteByToken(token: string) {
    return this.#invitesByToken.get(token);
  }

  listLogs() {
    return [...this.#logs];
  }

  appendLog(entry: WiseWriteLogEntry) {
    this.#logs.unshift(entry);
    this.#logs.splice(50);
  }

  saveSyncedSubmissions(testId: string, responses: SessionGradingResponse[]) {
    this.#syncedSubmissions.set(testId, responses);
  }

  getSyncedSubmissions(testId: string) {
    return this.#syncedSubmissions.get(testId) ?? [];
  }
}

function createWiseWriteLog(
  action: WiseAction,
  endpoint: string,
  dryRun: boolean,
  payload: unknown,
  targetWiseId?: string,
): WiseWriteLogEntry {
  const payloadPreview =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

  return {
    logId: randomUUID(),
    occurredAt: toIsoNow(),
    action,
    endpoint,
    dryRun,
    targetWiseId,
    payloadPreview: payloadPreview.slice(0, 1_000),
  };
}

function createWiseClient(config: WiseClientConfig): WiseClient {
  const host = config.host ?? "https://api.wiseapp.live";
  const examHost = config.examHost ?? host;
  const namespace = config.namespace ?? "sandbox";
  const userAgent = config.userAgent ?? `VendorIntegrations/${namespace}`;
  const liveConfigPresent = Boolean(
    config.userId && config.apiKey && config.instituteId && config.namespace,
  );
  const liveWritesEnabled = liveConfigPresent && config.allowMutations === true;

  async function request(
    baseUrl: string,
    path: string,
    init?: RequestInit,
  ): Promise<Record<string, unknown>> {
    if (
      !liveConfigPresent ||
      !config.userId ||
      !config.apiKey ||
      !config.instituteId
    ) {
      throw new Error("Wise sandbox is not configured for live API calls.");
    }

    const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
    assertWiseSandboxEndpointAllowed(path);
    const headers = new Headers(init?.headers ?? {});

    headers.set(
      "authorization",
      `Basic ${Buffer.from(`${config.userId}:${config.apiKey}`).toString("base64")}`,
    );
    headers.set("x-api-key", config.apiKey);
    headers.set("x-wise-namespace", namespace);
    headers.set("user-agent", userAgent);
    headers.set("content-type", "application/json");

    const response = await fetch(url, {
      ...init,
      headers,
    });
    const text = await response.text();
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (!response.ok) {
      const message =
        typeof json.message === "string" ? json.message : response.statusText;
      throw new Error(`Wise request failed (${response.status}): ${message}`);
    }

    return json;
  }

  return {
    configured: liveConfigPresent,
    mode: liveWritesEnabled ? "live" : "dry-run",
    namespace,
    launchUrlTemplate: config.launchUrlTemplate,
    async getAccountUser() {
      if (!liveConfigPresent) {
        return {
          wiseUserId: "dryrun-account-user",
          name: "BeGifted Sandbox Owner",
          namespace,
          email: "sandbox-owner@example.invalid",
        };
      }

      const response = await request(host, "/user/getUser", { method: "GET" });
      const data = parseJsonResponse(response.data);

      return {
        wiseUserId:
          typeof data.uuid === "string"
            ? data.uuid
            : typeof data._id === "string"
              ? data._id
              : "wise-account-user",
        name: typeof data.name === "string" ? data.name : "Wise Account User",
        namespace:
          typeof data.namespace === "string" ? data.namespace : namespace,
        email: typeof data.email === "string" ? data.email : undefined,
      };
    },
    async createStudent(input) {
      if (!liveWritesEnabled) {
        return {
          wiseId: `dry-student-${input.vendorUserId}`,
          vendorUserId: input.vendorUserId,
          displayName: input.displayName,
          email: input.email,
        };
      }

      const response = await request(
        host,
        `/vendors/institutes/${config.instituteId}/users`,
        {
          method: "POST",
          body: JSON.stringify({
            vendorUserId: input.vendorUserId,
            name: input.displayName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            profile: "student",
          }),
        },
      );
      const user = parseJsonResponse(parseJsonResponse(response.data).user);

      return {
        wiseId:
          extractWiseId(user._id) ??
          extractWiseId(user.uuid) ??
          input.vendorUserId,
        vendorUserId: input.vendorUserId,
        displayName:
          typeof user.name === "string" ? user.name : input.displayName,
        email: typeof user.email === "string" ? user.email : input.email,
      };
    },
    async createCourse(input) {
      if (!liveWritesEnabled) {
        return {
          wiseId: `dry-course-${slugify(input.displayName)}`,
          displayName: input.displayName,
          subject: input.subject,
        };
      }

      const response = await request(host, "/teacher/addClass", {
        method: "POST",
        body: JSON.stringify({
          name: input.displayName,
          subject: input.subject,
          instituteId: config.instituteId,
          enableJoinMagicLink: true,
          magicLinkLoginRequired: false,
        }),
      });
      const data = parseJsonResponse(response.data);

      return {
        wiseId:
          extractWiseId(data._id) ?? `course-${slugify(input.displayName)}`,
        displayName:
          typeof data.name === "string" ? data.name : input.displayName,
        subject:
          typeof data.subject === "string" ? data.subject : input.subject,
      };
    },
    async assignCourseToStudent({ courseId, studentId }) {
      if (!liveWritesEnabled) {
        return;
      }

      await request(
        host,
        `/institutes/${config.instituteId}/assignClassToStudent`,
        {
          method: "POST",
          body: JSON.stringify({
            classId: courseId,
            userId: studentId,
            assign: true,
          }),
        },
      );
    },
    async getCourseSections(courseId) {
      if (!liveConfigPresent) {
        return [{ sectionId: `dry-section-${courseId}`, name: "Section 1" }];
      }

      const response = await request(
        host,
        `/user/classes/${courseId}/contentTimeline?showSequentialLearningDisabledSections=true`,
        { method: "GET" },
      );
      const data = parseJsonResponse(response.data);
      const timeline = Array.isArray(data.timeline) ? data.timeline : [];

      return timeline
        .map((entry) => parseJsonResponse(entry))
        .map((entry) => ({
          sectionId: extractWiseId(entry._id) ?? "",
          name: typeof entry.name === "string" ? entry.name : "Section 1",
        }))
        .filter((entry) => entry.sectionId.length > 0);
    },
    async createTest({ classId, displayName, sectionId }) {
      if (!liveWritesEnabled) {
        return {
          wiseId: `dry-test-${slugify(displayName)}`,
          classId,
          displayName,
        };
      }

      const response = await request(
        host,
        `/teacher/classes/${classId}/proxy/addTest`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "UserInputOmrTest",
            name: displayName,
            sectionId,
          }),
        },
      );
      const data = parseJsonResponse(parseJsonResponse(response.data).data);

      return {
        wiseId: extractWiseId(data._id) ?? `test-${slugify(displayName)}`,
        classId,
        displayName: typeof data.name === "string" ? data.name : displayName,
      };
    },
    async addQuestions({ classId, testId, questions }) {
      if (!liveWritesEnabled) {
        return;
      }

      await request(examHost, `/api/v1/teacher/tests/${testId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          class_id: classId,
          current_role: "teacher",
          questions: questions.map((question) => ({
            text: question.text,
            options: question.options ?? {},
            answer: question.answer,
            question_type: question.question_type,
          })),
        }),
      });
    },
    async updateTestSettings({ classId, testId, displayName, questionDrafts }) {
      if (!liveWritesEnabled) {
        return;
      }

      const markingSchemes = Object.fromEntries(
        Array.from(
          new Set(questionDrafts.map((draft) => draft.question_type)),
        ).map((questionType) => [
          questionType,
          {
            correct_marks: 1,
            incorrect_marks: 0,
          },
        ]),
      );

      await request(examHost, `/api/v2/teacher/tests/${testId}`, {
        method: "PUT",
        body: JSON.stringify({
          class_id: classId,
          user_id: config.userId,
          current_role: "teacher",
          test_type: "UserInputOmrTest",
          test: {
            name: displayName,
            description: "BeGifted Wise sandbox shadow test",
            max_marks: questionDrafts.length,
            duration: questionDrafts.length,
            mock_test: true,
            question_count: questionDrafts.length,
            marking_schemes: markingSchemes,
          },
        }),
      });
    },
    async publishTest({ classId, testId }) {
      if (!liveWritesEnabled) {
        return;
      }

      await request(examHost, `/api/v1/teacher/tests/${testId}/activate`, {
        method: "PUT",
        body: JSON.stringify({
          class_id: classId,
          user_id: config.userId,
          current_role: "teacher",
          test_id: testId,
        }),
      });
    },
    async getTestSubmissions({ classId, testId }) {
      if (!liveConfigPresent) {
        return {
          submissions: [],
        };
      }

      const response = await request(
        examHost,
        `/api/v1/teacher/tests/${testId}/submissions?class_id=${classId}&user_id=${config.userId}&current_role=teacher`,
        { method: "GET" },
      );
      const data = parseJsonResponse(response.data);
      const submissions = Array.isArray(data.submissions)
        ? data.submissions
        : [];

      return {
        submissions: submissions.map((submission) => {
          const record = parseJsonResponse(submission);

          return {
            submissionId:
              extractWiseId(record._id) ?? `submission-${randomUUID()}`,
            userName:
              typeof record.user_name === "string"
                ? record.user_name
                : "Wise Sandbox Student",
            answers:
              typeof record.answers === "object" && record.answers !== null
                ? (record.answers as Record<string, string>)
                : {},
          };
        }),
      };
    },
  };
}

interface WiseSandboxServiceOptions {
  client?: WiseClient;
  store?: InMemoryWiseSandboxStore;
  catalog?: Map<string, AssessmentRecord>;
  now?: () => string;
}

export interface WiseSandboxService {
  getAccountSnapshot(): Promise<{
    deliveryProvider: "wise-sandbox";
    mode: "dry-run" | "live";
    configured: boolean;
    account: WiseAccountUser;
  }>;
  createInvite(payload: CreateInviteRequest): Promise<CreateInviteResponse>;
  getPublicInvite(
    token: string,
  ): { expired: boolean; invite: PublicInviteLookupResponse } | null;
  resolveLaunchUrl(token: string): string | null;
  syncOwnedTestSubmissions(testId: string): Promise<WiseSubmissionSyncResponse>;
  listLogs(): WiseWriteLogEntry[];
}

const wiseAllowedEndpointPatterns = [
  /^\/user\/getUser$/,
  /^\/vendors\/institutes\/[^/]+\/users$/,
  /^\/teacher\/addClass$/,
  /^\/institutes\/[^/]+\/assignClassToStudent$/,
  /^\/user\/classes\/[^/]+\/contentTimeline(?:\?.*)?$/,
  /^\/teacher\/classes\/[^/]+\/proxy\/addTest$/,
  /^\/api\/v1\/teacher\/tests\/[^/]+\/questions$/,
  /^\/api\/v2\/teacher\/tests\/[^/]+$/,
  /^\/api\/v1\/teacher\/tests\/[^/]+\/activate$/,
  /^\/api\/v1\/teacher\/tests\/[^/]+\/submissions(?:\?.*)?$/,
];

const wiseBlockedEndpointPattern =
  /(bill|billing|credit|fee|fees|consultation|chat|admin|invoice|payment)/i;

export function assertWiseSandboxEndpointAllowed(path: string) {
  if (wiseBlockedEndpointPattern.test(path)) {
    throw new Error(`Wise sandbox blocked an unsafe endpoint path: ${path}.`);
  }

  const allowed = wiseAllowedEndpointPatterns.some((pattern) =>
    pattern.test(path),
  );

  if (!allowed) {
    throw new Error(
      `Wise sandbox blocked a non-allowlisted endpoint path: ${path}.`,
    );
  }
}

function ensureSingleAssessment(assessmentVersionIds: string[]) {
  if (assessmentVersionIds.length !== 1) {
    throw new Error(
      "Wise sandbox invite flow currently supports exactly one assessment per invite.",
    );
  }
}

function buildLaunchTarget(
  client: WiseClient,
  invite: Pick<
    WiseSandboxInviteRecord,
    "token" | "wiseCourseId" | "wiseTestId" | "wiseStudentId"
  >,
) {
  const template = client.launchUrlTemplate;

  if (template) {
    return template
      .replaceAll("{namespace}", client.namespace)
      .replaceAll("{classId}", invite.wiseCourseId)
      .replaceAll("{testId}", invite.wiseTestId)
      .replaceAll("{studentId}", invite.wiseStudentId)
      .replaceAll("{token}", invite.token);
  }

  const url = new URL(`https://${client.namespace}.wise.live`);
  url.searchParams.set("mode", "wise-sandbox");
  url.searchParams.set("classId", invite.wiseCourseId);
  url.searchParams.set("testId", invite.wiseTestId);
  url.searchParams.set("studentId", invite.wiseStudentId);
  url.searchParams.set("inviteToken", invite.token);

  return url.toString();
}

function createBinding(
  entityType: WiseSandboxEntityType,
  wiseId: string,
  externalRef: string,
  displayName: string,
  metadata: WiseEntityBinding["metadata"],
  now: string,
): WiseEntityBinding {
  return {
    wiseId,
    entityType,
    owner: wiseSandboxOwner,
    externalRef,
    displayName,
    createdAt: now,
    metadata,
  };
}

function getPublishedAssessmentBinding(
  store: InMemoryWiseSandboxStore,
  assessmentId: string,
) {
  return store.getBindingByExternalRef("test", assessmentId);
}

export function createWiseSandboxService(
  options: WiseSandboxServiceOptions = {},
): WiseSandboxService {
  const store = options.store ?? new InMemoryWiseSandboxStore();
  const client =
    options.client ??
    createWiseClient({
      host: process.env.WISE_API_HOST,
      examHost: process.env.WISE_EXAM_HOST,
      userId: process.env.WISE_USER_ID,
      apiKey: process.env.WISE_API_KEY,
      instituteId: process.env.WISE_INSTITUTE_ID,
      namespace: process.env.WISE_NAMESPACE,
      userAgent: process.env.WISE_USER_AGENT,
      allowMutations: process.env.WISE_SANDBOX_ALLOW_MUTATIONS === "true",
      launchUrlTemplate: process.env.WISE_SANDBOX_LAUNCH_URL_TEMPLATE,
    });
  const catalog = options.catalog ?? loadAssessmentCatalogFromDisk();
  const now = options.now ?? toIsoNow;

  function assertOwnedMutation(
    action: WiseWriteAction,
    entityType: WiseSandboxEntityType,
    binding: WiseEntityBinding | undefined,
  ) {
    const result = evaluateWiseWriteGuard({
      action,
      entityType,
      targetWiseId: binding?.wiseId,
      targetDisplayName: binding?.displayName,
      bindings: store.getBindings(),
    });

    if (!result.allowed) {
      throw new Error(result.reason);
    }
  }

  async function logWiseWrite(
    action: WiseWriteAction | WiseReadAction,
    endpoint: string,
    payload: unknown,
    targetWiseId?: string,
  ) {
    const isWrite = wiseAllowedWriteActions.includes(action as WiseWriteAction);
    if (!isWrite) {
      return;
    }

    store.appendLog(
      createWiseWriteLog(
        action,
        endpoint,
        client.mode === "dry-run",
        payload,
        targetWiseId,
      ),
    );
  }

  async function getOrCreateDummyStudent(studentName: string) {
    const syntheticIdentity = createSyntheticStudentIdentity(studentName);
    const existing = store.getBindingByExternalRef(
      "student",
      syntheticIdentity.externalRef,
    );
    if (existing) {
      return {
        wiseId: existing.wiseId,
        vendorUserId: syntheticIdentity.vendorUserId,
        displayName: existing.displayName,
        email: syntheticIdentity.email,
      };
    }

    const displayName = createWiseSandboxStudentName(studentName);
    await logWiseWrite(
      "create-student",
      "/vendors/institutes/:instituteId/users",
      {
        vendorUserId: syntheticIdentity.vendorUserId,
        displayName,
        email: syntheticIdentity.email,
      },
    );

    const student = await client.createStudent({
      vendorUserId: syntheticIdentity.vendorUserId,
      displayName,
      email: syntheticIdentity.email,
      phoneNumber: syntheticIdentity.phoneNumber,
    });

    store.saveBinding(
      createBinding(
        "student",
        student.wiseId,
        syntheticIdentity.externalRef,
        student.displayName,
        {
          vendorUserId: student.vendorUserId,
          email: student.email,
        },
        now(),
      ),
    );

    return student;
  }

  async function getOrCreateDummyCourse(assessment: AssessmentRecord) {
    const existing = store.getBindingByExternalRef("course", assessment.id);
    if (existing) {
      return {
        wiseId: existing.wiseId,
        displayName: existing.displayName,
        subject: assessment.subject,
      };
    }

    const displayName = createWiseSandboxCourseName(assessment.title);
    await logWiseWrite("create-course", "/teacher/addClass", {
      displayName,
      subject: assessment.subject,
    });

    const course = await client.createCourse({
      displayName,
      subject: assessment.subject,
    });

    store.saveBinding(
      createBinding(
        "course",
        course.wiseId,
        assessment.id,
        course.displayName,
        {
          assessmentId: assessment.id,
        },
        now(),
      ),
    );

    return course;
  }

  async function getOrCreateDummyTest(
    assessment: AssessmentRecord,
    course: WiseSandboxCourse,
  ) {
    const existing = getPublishedAssessmentBinding(store, assessment.id);
    if (existing) {
      return {
        wiseId: existing.wiseId,
        classId: course.wiseId,
        displayName: existing.displayName,
        publishedQuestionIds:
          (existing.metadata?.publishedQuestionIds as string[] | undefined) ??
          [],
        skippedQuestionIds:
          (existing.metadata?.skippedQuestionIds as string[] | undefined) ?? [],
      };
    }

    const publishedAssessment = buildWisePublishedAssessment(assessment);
    const sections = await client.getCourseSections(course.wiseId);
    const section = sections[0];

    if (!section) {
      throw new Error("Wise sandbox course does not expose a content section.");
    }

    const displayName = createWiseSandboxTestName(assessment.title);
    await logWiseWrite(
      "create-test",
      "/teacher/classes/:classId/proxy/addTest",
      {
        classId: course.wiseId,
        displayName,
        sectionId: section.sectionId,
      },
    );

    const test = await client.createTest({
      classId: course.wiseId,
      displayName,
      sectionId: section.sectionId,
    });
    const provisionalBinding = createBinding(
      "test",
      test.wiseId,
      assessment.id,
      test.displayName,
      {
        assessmentId: assessment.id,
        classId: course.wiseId,
        publishedQuestionIds: [],
        skippedQuestionIds: publishedAssessment.skippedQuestionIds,
      },
      now(),
    );
    store.saveBinding(provisionalBinding);
    assertOwnedMutation("add-test-questions", "test", provisionalBinding);

    await logWiseWrite(
      "add-test-questions",
      "/api/v1/teacher/tests/:testId/questions",
      {
        classId: course.wiseId,
        questions: publishedAssessment.questionDrafts,
      },
      test.wiseId,
    );
    await client.addQuestions({
      classId: course.wiseId,
      testId: test.wiseId,
      questions: publishedAssessment.questionDrafts,
    });
    assertOwnedMutation("update-test-settings", "test", provisionalBinding);

    await logWiseWrite(
      "update-test-settings",
      "/api/v2/teacher/tests/:testId",
      {
        classId: course.wiseId,
        questionCount: publishedAssessment.questionDrafts.length,
      },
      test.wiseId,
    );
    await client.updateTestSettings({
      classId: course.wiseId,
      testId: test.wiseId,
      displayName: test.displayName,
      questionDrafts: publishedAssessment.questionDrafts,
    });
    assertOwnedMutation("publish-test", "test", provisionalBinding);

    await logWiseWrite(
      "publish-test",
      "/api/v1/teacher/tests/:testId/activate",
      { classId: course.wiseId },
      test.wiseId,
    );
    await client.publishTest({ classId: course.wiseId, testId: test.wiseId });

    const finalTest: WiseSandboxTest = {
      wiseId: test.wiseId,
      classId: course.wiseId,
      displayName: test.displayName,
      publishedQuestionIds: publishedAssessment.publishedQuestionIds,
      skippedQuestionIds: publishedAssessment.skippedQuestionIds,
    };

    store.saveBinding({
      ...provisionalBinding,
      metadata: {
        assessmentId: assessment.id,
        classId: course.wiseId,
        publishedQuestionIds: finalTest.publishedQuestionIds,
        skippedQuestionIds: finalTest.skippedQuestionIds,
      },
    });

    return finalTest;
  }

  async function assignDummyStudentToCourse(
    course: WiseSandboxCourse,
    student: WiseSandboxStudent,
  ) {
    const courseBinding = store.getBindingById(course.wiseId);
    const studentBinding = store.getBindingById(student.wiseId);
    assertOwnedMutation("assign-course-to-student", "course", courseBinding);
    assertOwnedMutation("assign-course-to-student", "student", studentBinding);

    await logWiseWrite(
      "assign-course-to-student",
      "/institutes/:instituteId/assignClassToStudent",
      {
        classId: course.wiseId,
        studentId: student.wiseId,
      },
      course.wiseId,
    );

    await client.assignCourseToStudent({
      courseId: course.wiseId,
      studentId: student.wiseId,
    });
  }

  return {
    async getAccountSnapshot() {
      return {
        deliveryProvider: "wise-sandbox",
        mode: client.mode,
        configured: client.configured,
        account: await client.getAccountUser(),
      };
    },
    async createInvite(payload) {
      ensureSingleAssessment(payload.assessmentVersionIds);
      const [assessmentId] = payload.assessmentVersionIds;

      if (!assessmentId) {
        throw new Error(
          "Wise sandbox invite flow currently supports exactly one assessment per invite.",
        );
      }

      const assessment = catalog.get(assessmentId);

      if (!assessment) {
        throw new Error(
          `Assessment ${assessmentId} was not found in the content catalog.`,
        );
      }

      const student = await getOrCreateDummyStudent(payload.studentName);
      const course = await getOrCreateDummyCourse(assessment);
      const test = await getOrCreateDummyTest(assessment, course);

      await assignDummyStudentToCourse(course, student);

      const inviteId = randomUUID();
      const token = createCoreInviteToken();
      const provisionalInvite: WiseSandboxInviteRecord = {
        inviteId,
        token,
        studentName: payload.studentName,
        parentEmail: payload.parentEmail,
        recipientEmails: payload.recipientEmails ?? [],
        expiresAt: payload.expiresAt,
        assessmentVersionIds: [assessment.id],
        assessmentTitles: [assessment.title],
        deliveryProvider: "wise-sandbox",
        launchUrl: null,
        dryRun: client.mode === "dry-run",
        wiseStudentId: student.wiseId,
        wiseCourseId: course.wiseId,
        wiseTestId: test.wiseId,
        publishedQuestionIds: test.publishedQuestionIds,
        skippedQuestionIds: test.skippedQuestionIds,
      };
      provisionalInvite.launchUrl = `/api/public/invites/${token}/launch`;

      store.saveInvite(provisionalInvite);

      return {
        inviteId,
        token,
        status: "sandbox_ready",
        expiresAt: payload.expiresAt,
        deliveryProvider: "wise-sandbox",
        assessmentVersionIds: [assessment.id],
        launchUrl: provisionalInvite.launchUrl,
        dryRun: provisionalInvite.dryRun,
        publishedQuestionIds: test.publishedQuestionIds,
        skippedQuestionIds: test.skippedQuestionIds,
      };
    },
    getPublicInvite(token) {
      const invite = store.getInviteByToken(token);
      if (!invite) {
        return null;
      }

      const expired =
        new Date(invite.expiresAt).getTime() < new Date(now()).getTime();

      return {
        expired,
        invite: {
          inviteId: invite.inviteId,
          token: invite.token,
          studentName: invite.studentName,
          assessmentTitles: invite.assessmentTitles,
          expiresAt: invite.expiresAt,
          deliveryProvider: invite.deliveryProvider,
          launchUrl: invite.launchUrl,
          launchReady: !expired && invite.launchUrl !== null,
          launchInstructions: invite.dryRun
            ? "Wise sandbox is running in dry-run mode. The launch URL points to the sandbox bridge only."
            : "This sandbox invite launches only BeGifted-owned Wise dummy entities.",
        },
      };
    },
    resolveLaunchUrl(token) {
      const publicInvite = store.getInviteByToken(token);
      if (!publicInvite) {
        return null;
      }

      if (
        new Date(publicInvite.expiresAt).getTime() < new Date(now()).getTime()
      ) {
        return null;
      }

      return buildLaunchTarget(client, publicInvite);
    },
    async syncOwnedTestSubmissions(testId) {
      const testBinding = store.getBindingById(testId);
      const guard = evaluateWiseWriteGuard({
        action: "get-test-submissions",
        entityType: "test",
        targetWiseId: testId,
        targetDisplayName: testBinding?.displayName,
        bindings: store.getBindings(),
      });

      if (!testBinding || !guard.allowed) {
        throw new Error(
          "Submission sync blocked because the Wise test is not a BeGifted-owned sandbox entity.",
        );
      }

      const classId = String(testBinding.metadata?.classId ?? "");
      const assessmentId = String(testBinding.metadata?.assessmentId ?? "");
      const assessment = catalog.get(assessmentId);

      if (!classId || !assessment) {
        throw new Error(
          "Sandbox test binding is missing its assessment mapping.",
        );
      }

      const publishedAssessment = buildWisePublishedAssessment(assessment);
      const questionDraftsById = new Map(
        publishedAssessment.questionDrafts.map((draft) => [
          draft.questionId,
          draft,
        ]),
      );
      const bundle = await client.getTestSubmissions({ classId, testId });
      const gradingResponses: SessionGradingResponse[] = [];
      const syncedSubmissions: WiseSubmissionGradingRecord[] = [];

      for (const submission of bundle.submissions) {
        const answers = publishedAssessment.publishedQuestionIds.reduce<
          SessionAnswerInput[]
        >((accumulator, questionId, index) => {
          const draft = questionDraftsById.get(questionId);
          const fallbackAnswers = Object.values(submission.answers);
          const answer =
            submission.answers[questionId] ?? fallbackAnswers[index];

          if (!draft || answer === undefined) {
            return accumulator;
          }

          const acceptedAnswers =
            draft.question_type === "FILL_IN_THE_BLANK"
              ? draft.answer.split(",").map((value) => value.trim())
              : [draft.answer];

          accumulator.push({
            submissionAnswerId: `${submission.submissionId}:${questionId}`,
            questionId,
            gradingMode: "deterministic",
            answer,
            acceptedAnswers,
            maxScore: draft.marks,
          });

          return accumulator;
        }, []);

        const grading = evaluateSessionAnswers({
          sessionId: `wise-sandbox:${submission.submissionId}`,
          answers,
        });

        gradingResponses.push(grading);
        syncedSubmissions.push({
          submissionId: submission.submissionId,
          userName: submission.userName,
          sessionId: grading.sessionId,
          gradingResultIds: grading.gradingResults.map((result) => result.id),
        });
      }

      store.saveSyncedSubmissions(testId, gradingResponses);

      return {
        deliveryProvider: "wise-sandbox",
        testId,
        assessmentId,
        totalSubmissions: syncedSubmissions.length,
        syncedSubmissions,
      };
    },
    listLogs() {
      return store.listLogs();
    },
  };
}
