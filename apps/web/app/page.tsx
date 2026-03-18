import { appAreas, primaryObjectives } from "@begifted/core";
import { SectionCard } from "@begifted/ui";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px 80px",
        background:
          "radial-gradient(circle at top left, rgba(229, 176, 104, 0.35), transparent 32%), linear-gradient(180deg, #fff7ed 0%, #f5f3ff 100%)",
      }}
    >
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            padding: 32,
            borderRadius: 28,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(148,163,184,0.25)",
            boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: 12,
              color: "#b45309",
            }}
          >
            Multi-agent workspace
          </p>
          <h1
            style={{
              margin: "12px 0 16px",
              fontSize: "clamp(2.2rem, 4vw, 4rem)",
            }}
          >
            Build the BeGifted pre-test platform with parallel Codex and Claude
            agents.
          </h1>
          <p
            style={{ margin: 0, fontSize: 18, lineHeight: 1.6, maxWidth: 860 }}
          >
            This starter app exists to anchor the repo structure. Product work
            should now branch into the student assessment experience, the staff
            portal, and operational workflows defined in the repo docs and
            GitHub issue templates.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <SectionCard
            title="Primary Objectives"
            items={primaryObjectives}
            accent="#92400e"
            description="Launch the first production-ready collaboration surface for the team and its agents."
          />
          <SectionCard
            title="Application Areas"
            items={appAreas}
            accent="#0f766e"
            description="Map delivery ownership to the monorepo layout and GitHub task model."
          />
        </div>
      </section>
    </main>
  );
}
