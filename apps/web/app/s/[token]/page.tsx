import { Button, Card, PageShell } from "@begifted/ui";
import type { CSSProperties } from "react";

interface StudentLandingProps {
  params: Promise<{ token: string }>;
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
    title: "Verify your details",
    description:
      "Confirm your name and the assessments assigned to you before starting.",
  },
  {
    number: "2",
    title: "Complete the pre-test",
    description:
      "Answer each section at your own pace. Your progress is saved automatically.",
  },
  {
    number: "3",
    title: "Submit your responses",
    description:
      "Review your answers and submit. You won't be able to change responses after submission.",
  },
];

export default async function StudentLandingPage({
  params,
}: StudentLandingProps) {
  const { token } = await params;

  // Token validation will call GET /api/public/invites/:token once backend is ready.
  // For now we render the shell unconditionally.

  return (
    <PageShell maxWidth={600} gradient={tealGradient}>
      <Card accent="#0f766e">
        <div style={accentBar} />
        <p style={tagline}>BeGifted Assessment</p>
        <h1 style={heading}>Welcome to your pre-test</h1>
        <p style={body}>
          You&rsquo;ve been invited to complete an academic assessment. This
          helps your instructor understand your current level and recommend the
          best learning path for you.
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
            margin: "0 0 16px",
            fontSize: 14,
            color: "#57534e",
            lineHeight: 1.5,
          }}
        >
          When you&rsquo;re ready, click below to begin. Make sure you have a
          quiet space and enough time to finish without interruption.
        </p>
        <Button
          style={{
            background: "linear-gradient(135deg, #0f766e, #14b8a6)",
            boxShadow: "0 4px 14px rgba(15, 118, 110, 0.3)",
          }}
        >
          Begin assessment
        </Button>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            color: "#a8a29e",
          }}
        >
          Invite token: {token.slice(0, 8)}&hellip;
        </p>
      </Card>
    </PageShell>
  );
}
