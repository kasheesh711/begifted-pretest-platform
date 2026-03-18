import { Button, Card, PageShell } from "@begifted/ui";
import type { CSSProperties } from "react";
import { buildApiUrl } from "../../lib/api";

interface StudentLandingProps {
  params: Promise<{ token: string }>;
}

interface InviteLookupResult {
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

const tealGradient =
  "radial-gradient(circle at top left, rgba(20, 184, 166, 0.25), transparent 36%), linear-gradient(180deg, #f0fdfa 0%, #f5f3ff 100%)";

const accentBar: CSSProperties = {
  width: 42,
  height: 6,
  borderRadius: 999,
  background: "linear-gradient(90deg, #0f766e, #14b8a6)",
  marginBottom: 18,
};

const tagline: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 12,
  color: "#0f766e",
};

const heading: CSSProperties = {
  margin: "8px 0 12px",
  fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
  lineHeight: 1.15,
};

const body: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.7,
  color: "#44403c",
  maxWidth: 540,
};

const stepGrid: CSSProperties = {
  display: "grid",
  gap: 16,
};

const stepCard: CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
};

const stepNumber: CSSProperties = {
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: 12,
  background: "rgba(15, 118, 110, 0.08)",
  color: "#0f766e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 15,
};

const stepTitle: CSSProperties = {
  margin: "0 0 2px",
  fontSize: 15,
  fontWeight: 600,
  color: "#1f2937",
};

const stepDesc: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#57534e",
};

const steps = [
  {
    number: "1",
    title: "Verify your sandbox invite",
    description:
      "Confirm your assigned assessment before launching the BeGifted sandbox bridge.",
  },
  {
    number: "2",
    title: "Open the Wise sandbox test",
    description:
      "The launch link opens only BeGifted-owned dummy Wise entities, never live classes or students.",
  },
  {
    number: "3",
    title: "Return for grading and diagnostics",
    description:
      "Sandbox submissions are pulled back into BeGifted for shadow grading and diagnostics.",
  },
];

export const dynamic = "force-dynamic";

async function loadInvite(token: string) {
  const response = await fetch(buildApiUrl(`/api/public/invites/${token}`), {
    cache: "no-store",
  });

  if (response.status === 404) {
    return { status: "missing" as const };
  }

  if (response.status === 410) {
    return { status: "expired" as const };
  }

  if (!response.ok) {
    return { status: "error" as const };
  }

  return {
    status: "ready" as const,
    invite: (await response.json()) as InviteLookupResult,
  };
}

export default async function StudentLandingPage({
  params,
}: StudentLandingProps) {
  const { token } = await params;
  const inviteState = await loadInvite(token);

  if (inviteState.status !== "ready") {
    const message =
      inviteState.status === "expired"
        ? "This sandbox invite has expired. Ask BeGifted to issue a new test link."
        : inviteState.status === "missing"
          ? "This sandbox invite could not be found."
          : "BeGifted could not load your sandbox invite right now.";

    return (
      <PageShell maxWidth={600} gradient={tealGradient}>
        <Card accent="#0f766e">
          <div style={accentBar} />
          <p style={tagline}>BeGifted Assessment</p>
          <h1 style={heading}>Sandbox invite unavailable</h1>
          <p style={body}>{message}</p>
        </Card>
      </PageShell>
    );
  }

  const { invite } = inviteState;
  const launchBridgeUrl = buildApiUrl(`/api/public/invites/${token}/launch`);

  return (
    <PageShell maxWidth={600} gradient={tealGradient}>
      <Card accent="#0f766e">
        <div style={accentBar} />
        <p style={tagline}>BeGifted Assessment</p>
        <h1 style={heading}>Welcome to your pre-test</h1>
        <p style={body}>
          You&rsquo;ve been invited to complete a BeGifted-managed sandbox
          assessment. This launch path uses only dummy Wise entities and does
          not touch any live student, class, billing, or credit records.
        </p>
      </Card>

      <Card accent="#0f766e">
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 17,
            fontWeight: 600,
            color: "#292524",
          }}
        >
          How it works
        </h2>
        <div style={stepGrid}>
          {steps.map((step) => (
            <div key={step.number} style={stepCard}>
              <div style={stepNumber}>{step.number}</div>
              <div>
                <p style={stepTitle}>{step.title}</p>
                <p style={stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card accent="#0f766e" style={{ textAlign: "center" as const }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 14,
            color: "#0f766e",
            fontWeight: 600,
          }}
        >
          Assigned assessment: {invite.assessmentTitles.join(", ")}
        </p>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 14,
            color: "#57534e",
            lineHeight: 1.5,
          }}
        >
          {invite.launchInstructions}
        </p>
        {invite.launchReady ? (
          <a
            href={launchBridgeUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 28px",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              background: "linear-gradient(135deg, #0f766e, #14b8a6)",
              boxShadow: "0 4px 14px rgba(15, 118, 110, 0.3)",
            }}
          >
            Launch sandbox assessment
          </a>
        ) : (
          <Button disabled>Launch unavailable</Button>
        )}
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            color: "#a8a29e",
          }}
        >
          Invite token: {invite.token.slice(0, 8)}&hellip;
        </p>
      </Card>
    </PageShell>
  );
}
