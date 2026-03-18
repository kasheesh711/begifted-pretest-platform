import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BeGifted Pre-Test Platform",
  description: "Multi-agent bootstrap for the BeGifted pre-test platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f6f1e8",
          color: "#1f2937",
        }}
      >
        {children}
      </body>
    </html>
  );
}
