import type { CSSProperties } from "react";

interface SectionCardProps {
  title: string;
  description: string;
  items: readonly string[];
  accent: string;
}

export function SectionCard({
  title,
  description,
  items,
  accent,
}: SectionCardProps) {
  const frameStyle: CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: "rgba(255,255,255,0.9)",
    border: `1px solid ${accent}30`,
    boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  };

  return (
    <section style={frameStyle}>
      <div
        style={{
          width: 42,
          height: 6,
          borderRadius: 999,
          background: accent,
          marginBottom: 18,
        }}
      />
      <h2 style={{ margin: "0 0 12px", fontSize: 24 }}>{title}</h2>
      <p style={{ margin: "0 0 16px", lineHeight: 1.6 }}>{description}</p>
      <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.7 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
