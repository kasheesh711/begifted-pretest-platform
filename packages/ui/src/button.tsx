import type { ButtonHTMLAttributes, CSSProperties } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 28px",
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background 0.15s, box-shadow 0.15s, opacity 0.15s",
  border: "none",
  lineHeight: 1.4,
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #b45309, #92400e)",
    color: "#fff",
    boxShadow: "0 4px 14px rgba(180, 83, 9, 0.3)",
  },
  secondary: {
    background: "rgba(255,255,255,0.85)",
    color: "#92400e",
    border: "1.5px solid rgba(146, 64, 14, 0.25)",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
  },
};

export function Button({
  variant = "primary",
  fullWidth,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(fullWidth ? { width: "100%" } : {}),
        ...(disabled ? { opacity: 0.55, cursor: "not-allowed" } : {}),
        ...style,
      }}
      disabled={disabled}
      {...props}
    />
  );
}
