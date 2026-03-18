"use client";

import { Button, Card, PageShell, TextInput } from "@begifted/ui";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Submission will be wired to POST /api/invites once backend is ready.
  }

  return (
    <PageShell maxWidth={640}>
      <Card>
        <div style={headerAccent} />
        <p style={tagline}>Staff Portal</p>
        <h1 style={heading}>Create Assessment Invite</h1>
        <p style={subtitle}>
          Send a secure pre-test link to a student. The invite will include the
          selected assessments and expire on the date you choose.
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
            Assessment selection will be available once the content catalogue is
            populated. For now, invites will be created without specific
            assessment bindings.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button type="submit">Create invite</Button>
            <Button type="button" variant="secondary">
              Save draft
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
