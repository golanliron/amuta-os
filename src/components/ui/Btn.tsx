"use client";

import type { ReactNode, CSSProperties } from "react";

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: "var(--color-accent)",
    color: "#FFFFFF",
    fontWeight: 700,
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text)",
    border: "1px solid var(--color-border2)",
  },
  subtle: {
    background: "var(--color-surf2)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  },
  danger: {
    background: "var(--color-red-light)",
    color: "var(--color-red)",
    border: "1px solid rgba(225,112,85,0.25)",
  },
};

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  style = {},
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "subtle" | "danger";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-dm)",
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 7,
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.2s",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
