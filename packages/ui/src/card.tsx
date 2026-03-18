import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  accent?: string;
  style?: CSSProperties;
}

export function Card({ children, accent, style }: CardProps) {
  const cardStyle: CSSProperties = {
    padding: 32,
    borderRadius: 24,
    background: "rgba(255,255,255,0.92)",
    border: accent
      ? `1px solid ${accent}30`
      : "1px solid rgba(148,163,184,0.25)",
    boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
    ...style,
  };

  return <div style={cardStyle}>{children}</div>;
}
