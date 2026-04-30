"use client";

interface Payload {
  color?: string;
  name?: string;
  value: number;
}

export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Payload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: "9px 14px",
        fontSize: 12,
        fontFamily: "var(--font-dm)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      {label && (
        <div
          style={{
            color: "var(--color-muted)",
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color || "var(--color-accent)",
            fontWeight: 600,
          }}
        >
          {p.name ? `${p.name}: ` : ""}
          {p.value}
        </div>
      ))}
    </div>
  );
}
