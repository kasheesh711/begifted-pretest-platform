import type { CSSProperties, InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#44403c",
  letterSpacing: "0.02em",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1.5px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(255,255,255,0.95)",
  fontSize: 15,
  fontFamily: "inherit",
  color: "#1f2937",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};

const hintStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#78716c",
  lineHeight: 1.4,
};

const errorStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#dc2626",
  lineHeight: 1.4,
};

export function TextInput({
  label,
  hint,
  error,
  id,
  style,
  ...props
}: TextInputProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={fieldId} style={labelStyle}>
        {label}
      </label>
      <input
        id={fieldId}
        style={{
          ...inputStyle,
          ...(error
            ? {
                borderColor: "#dc2626",
                boxShadow: "0 0 0 2px rgba(220,38,38,0.1)",
              }
            : {}),
          ...style,
        }}
        {...props}
      />
      {error ? (
        <p style={errorStyle}>{error}</p>
      ) : hint ? (
        <p style={hintStyle}>{hint}</p>
      ) : null}
    </div>
  );
}
