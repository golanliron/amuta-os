"use client";

import type { ReactNode } from "react";

export function Chip({
  children,
  color = "#B8FF5C",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        background: color + "18",
        color,
        border: `1px solid ${color}30`,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
