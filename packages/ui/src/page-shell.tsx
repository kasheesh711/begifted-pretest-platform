import type { CSSProperties, ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  maxWidth?: number;
  gradient?: string;
}

const defaultGradient =
  "radial-gradient(circle at top left, rgba(229, 176, 104, 0.35), transparent 32%), linear-gradient(180deg, #fff7ed 0%, #f5f3ff 100%)";

export function PageShell({
  children,
  maxWidth = 720,
  gradient = defaultGradient,
}: PageShellProps) {
  const outerStyle: CSSProperties = {
    minHeight: "100vh",
    padding: "48px 24px 80px",
    background: gradient,
  };

  const innerStyle: CSSProperties = {
    maxWidth,
    margin: "0 auto",
    display: "grid",
    gap: 24,
  };

  return (
    <main style={outerStyle}>
      <section style={innerStyle}>{children}</section>
    </main>
  );
}
