"use client";

import { Button, Card, PageShell, TextInput } from "@begifted/ui";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { buildApiUrl } from "../../../lib/api";

const seededAssessmentId = "science-uk-year-7-foundation-pretest";

const headerAccent: CSSProperties = {
  width: 42,
  height: 6,
  borderRadius: 999,
  background: "linear-gradient(90deg, #b45309, #d97706)",
  marginBottom: 18,
};

const tagline: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 12,
  color: "#b45309",
};

const heading: CSSProperties = {
  margin: "8px 0 8px",
  fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
  lineHeight: 1.15,
};

const subtitle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  color: "#57534e",
  maxWidth: 560,
};

const divider: CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(148,163,184,0.2)",
  margin: "8px 0",
};

const sectionLabel: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 17,
  fontWeight: 600,
  color: "#292524",
};

const chipRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 4,
};

const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: 13,
  background: "rgba(180, 83, 9, 0.08)",
  color: "#92400e",
  border: "1px solid rgba(180, 83, 9, 0.15)",
};

const removeBtn: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#92400e",
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
  fontFamily: "inherit",
};

export default function NewInvitePage() {
  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<null | {
    token: string;
    launchUrl: string | null;
    dryRun: boolean;
    publishedQuestionIds: string[];
    skippedQuestionIds: string[];
  }>(null);

  function addRecipient() {
    const email = recipientInput.trim();
    if (email && !recipientEmails.includes(email)) {
      setRecipientEmails((prev) => [...prev, email]);
      setRecipientInput("");
    }
  }

  function removeRecipient(email: string) {
    setRecipientEmails((prev) => prev.filter((e) => e !== email));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setCreatedInvite(null);

    try {
      const response = await fetch(buildApiUrl("/api/invites"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          parentEmail,
          recipientEmails,
          assessmentVersionIds: [seededAssessmentId],
          expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString(),
        }),
      });
      const payload = (await response.json()) as
        | {
            token: string;
            launchUrl: string | null;
            dryRun: boolean;
            publishedQuestionIds: string[];
            skippedQuestionIds: string[];
          }
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "Failed to create Wise sandbox invite.",
        );
      }

      if (!("token" in payload)) {
        throw new Error("Wise sandbox invite response was incomplete.");
      }

      setCreatedInvite(payload);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create invite.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell maxWidth={640}>
      <Card>
        <div style={headerAccent} />
        <p style={tagline}>Staff Portal</p>
        <h1 style={heading}>Create Assessment Invite</h1>
        <p style={subtitle}>
          Send a BeGifted-managed Wise sandbox link to a dummy-only pre-test.
          This flow never attaches anything to live Wise students, classes, or
          billing records.
        </p>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <h2 style={sectionLabel}>Student details</h2>
          <TextInput
            label="Student name"
            placeholder="e.g. Alex Chen"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
          />
          <TextInput
            label="Parent email"
            type="email"
            placeholder="parent@example.com"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            required
          />

          <hr style={divider} />

          <h2 style={sectionLabel}>Additional recipients</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <TextInput
                label="Recipient email"
                type="email"
                placeholder="colleague@school.edu"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                hint="Optional — add anyone who should receive the report."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Button type="button" variant="secondary" onClick={addRecipient}>
                Add
              </Button>
            </div>
          </div>
          {recipientEmails.length > 0 && (
            <div style={chipRow}>
              {recipientEmails.map((email) => (
                <span key={email} style={chip}>
                  {email}
                  <button
                    type="button"
                    style={removeBtn}
                    onClick={() => removeRecipient(email)}
                    aria-label={`Remove ${email}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <hr style={divider} />

          <h2 style={sectionLabel}>Scheduling</h2>
          <TextInput
            label="Invite expires"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            hint="The student will not be able to start the assessment after this date."
            required
          />

          <hr style={divider} />

          <h2 style={sectionLabel}>Assessments</h2>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              color: "#78716c",
              lineHeight: 1.5,
            }}
          >
            Sandbox mode currently publishes one seeded assessment:
            <strong> Year 7 Science Foundation Pre-Test</strong>. Only
            deterministic questions supported by Wise are published; all other
            items stay in BeGifted for later grading and diagnostics.
          </p>

          <div style={chipRow}>
            <span style={chip}>Sandbox only</span>
            <span style={chip}>Dummy Wise student</span>
            <span style={chip}>No live class mutations</span>
          </div>

          {submitError ? (
            <p style={{ marginTop: 16, color: "#b91c1c", fontSize: 14 }}>
              {submitError}
            </p>
          ) : null}

          {createdInvite ? (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 16,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(180, 83, 9, 0.18)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: "#92400e" }}>
                Sandbox invite created
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#57534e" }}>
                Token: {createdInvite.token}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#57534e" }}>
                Published to Wise: {createdInvite.publishedQuestionIds.length}{" "}
                questions
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#57534e" }}>
                Kept out of Wise: {createdInvite.skippedQuestionIds.length}{" "}
                questions
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#57534e" }}>
                Mode: {createdInvite.dryRun ? "Dry run" : "Live sandbox"}
              </p>
              {createdInvite.launchUrl ? (
                <p style={{ margin: "10px 0 0", fontSize: 14 }}>
                  <a
                    href={buildApiUrl(createdInvite.launchUrl)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0f766e", fontWeight: 600 }}
                  >
                    Open launch bridge
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create sandbox invite"}
            </Button>
            <Button type="button" variant="secondary" disabled>
              Save draft
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
