import { createHash, randomUUID } from "node:crypto";

export const wiseSandboxOwner = "begifted-sandbox" as const;

export const wiseSandboxStudentPrefix = "BGT-DUMMY";
export const wiseSandboxCoursePrefix = "BGT-SANDBOX";
export const wiseSandboxTestPrefix = "BGT-TEST";

export const wiseAllowedWriteActions = [
  "create-student",
  "create-course",
  "assign-course-to-student",
  "create-test",
  "add-test-questions",
  "update-test-settings",
  "publish-test",
] as const;

export const wiseReadActions = [
  "get-account-user",
  "get-test-submissions",
] as const;

export type WiseSandboxEntityType = "student" | "course" | "test";

export type WiseWriteAction = (typeof wiseAllowedWriteActions)[number];
export type WiseReadAction = (typeof wiseReadActions)[number];
export type WiseAction = WiseWriteAction | WiseReadAction;

export interface WiseEntityBinding {
  wiseId: string;
  entityType: WiseSandboxEntityType;
  owner: typeof wiseSandboxOwner;
  externalRef: string;
  displayName: string;
  createdAt: string;
  metadata?: Record<string, string | string[] | number | boolean | null>;
}

export interface WiseWriteGuardInput {
  action: WiseAction;
  entityType?: WiseSandboxEntityType;
  targetWiseId?: string;
  targetDisplayName?: string;
  bindings?: Iterable<WiseEntityBinding>;
}

export interface WiseWriteGuardResult {
  allowed: boolean;
  action: WiseAction;
  dryRunOnly: boolean;
  reason: string;
}

export interface CreateInviteRequest {
  studentName: string;
  parentEmail: string;
  recipientEmails?: string[];
  assessmentVersionIds: string[];
  expiresAt: string;
}

export interface CreateInviteResponse {
  inviteId: string;
  token: string;
  status: "sandbox_ready";
  expiresAt: string;
  deliveryProvider: "wise-sandbox";
  assessmentVersionIds: string[];
  launchUrl: string | null;
  dryRun: boolean;
  publishedQuestionIds: string[];
  skippedQuestionIds: string[];
}

export interface PublicInviteLookupResponse {
  inviteId: string;
  token: string;
  studentName: string;
  assessmentTitles: string[];
  expiresAt: string;
  deliveryProvider: "wise-sandbox";
  launchUrl: string | null;
  launchReady: boolean;
  launchInstructions: string;
}

export interface WiseSandboxStudent {
  wiseId: string;
  vendorUserId: string;
  displayName: string;
  email: string;
}

export interface WiseSandboxCourse {
  wiseId: string;
  displayName: string;
  subject: string;
}

export interface WiseSandboxTest {
  wiseId: string;
  classId: string;
  displayName: string;
  publishedQuestionIds: string[];
  skippedQuestionIds: string[];
}

export interface WiseWriteLogEntry {
  logId: string;
  occurredAt: string;
  action: WiseAction;
  endpoint: string;
  dryRun: boolean;
  targetWiseId?: string;
  payloadPreview: string;
}

export interface WiseSubmissionGradingRecord {
  submissionId: string;
  userName: string;
  sessionId: string;
  gradingResultIds: string[];
}

export interface WiseSubmissionSyncResponse {
  deliveryProvider: "wise-sandbox";
  testId: string;
  assessmentId: string;
  totalSubmissions: number;
  syncedSubmissions: WiseSubmissionGradingRecord[];
}

const namePrefixesByEntityType: Record<WiseSandboxEntityType, string> = {
  student: wiseSandboxStudentPrefix,
  course: wiseSandboxCoursePrefix,
  test: wiseSandboxTestPrefix,
};

export function getWiseSandboxPrefix(entityType: WiseSandboxEntityType) {
  return namePrefixesByEntityType[entityType];
}

export function createWiseSandboxStudentName(studentName: string) {
  const externalRef = createWiseSandboxExternalRef(studentName);
  const suffix = externalRef.slice(-6).toUpperCase();

  return `${wiseSandboxStudentPrefix} Student ${suffix}`;
}

export function createWiseSandboxCourseName(assessmentTitle: string) {
  return `${wiseSandboxCoursePrefix} ${assessmentTitle.trim()}`;
}

export function createWiseSandboxTestName(assessmentTitle: string) {
  return `${wiseSandboxTestPrefix} ${assessmentTitle.trim()}`;
}

export function createWiseSandboxToken() {
  return randomUUID();
}

export function createWiseSandboxExternalRef(seed: string) {
  const normalized = seed.trim().toLowerCase();
  const digest = createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 12);

  return `bgt-sandbox-${digest}`;
}

export function isOwnedWiseBinding(
  binding: WiseEntityBinding | undefined,
  entityType: WiseSandboxEntityType,
) {
  return (
    binding?.owner === wiseSandboxOwner &&
    binding.entityType === entityType &&
    binding.displayName.startsWith(getWiseSandboxPrefix(entityType))
  );
}

export function evaluateWiseWriteGuard({
  action,
  entityType,
  targetWiseId,
  targetDisplayName,
  bindings = [],
}: WiseWriteGuardInput): WiseWriteGuardResult {
  const isWriteAction = wiseAllowedWriteActions.includes(
    action as WiseWriteAction,
  );
  if (!isWriteAction) {
    return {
      allowed: true,
      action,
      dryRunOnly: false,
      reason: "Read-only Wise action allowed.",
    };
  }

  if (!entityType) {
    return {
      allowed: true,
      action,
      dryRunOnly: false,
      reason: "Creation action allowed without an existing Wise entity target.",
    };
  }

  if (!targetWiseId || !targetDisplayName) {
    return {
      allowed: false,
      action,
      dryRunOnly: true,
      reason:
        "Mutation blocked because target Wise ownership could not be verified.",
    };
  }

  const binding = Array.from(bindings).find(
    (candidate) =>
      candidate.wiseId === targetWiseId && candidate.entityType === entityType,
  );

  if (!binding || !isOwnedWiseBinding(binding, entityType)) {
    return {
      allowed: false,
      action,
      dryRunOnly: true,
      reason:
        "Mutation blocked because the Wise entity is not BeGifted-owned sandbox data.",
    };
  }

  if (!targetDisplayName.startsWith(getWiseSandboxPrefix(entityType))) {
    return {
      allowed: false,
      action,
      dryRunOnly: true,
      reason:
        "Mutation blocked because the Wise entity does not use the reserved sandbox naming prefix.",
    };
  }

  return {
    allowed: true,
    action,
    dryRunOnly: false,
    reason: "Mutation allowed for a BeGifted-owned Wise sandbox entity.",
  };
}

export function isCreateInviteRequest(
  payload: unknown,
): payload is CreateInviteRequest {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.studentName === "string" &&
    typeof candidate.parentEmail === "string" &&
    typeof candidate.expiresAt === "string" &&
    Array.isArray(candidate.assessmentVersionIds) &&
    candidate.assessmentVersionIds.every(
      (value) => typeof value === "string",
    ) &&
    (candidate.recipientEmails === undefined ||
      (Array.isArray(candidate.recipientEmails) &&
        candidate.recipientEmails.every((value) => typeof value === "string")))
  );
}
