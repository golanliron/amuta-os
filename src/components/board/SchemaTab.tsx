"use client";

import { GlassCard } from "../ui/GlassCard";
import type { MondayBoard } from "@/types";

const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
  color: { label: "סטטוס", color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  date: { label: "תאריך", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  "multiple-person": { label: "אנשים", color: "var(--color-green)", bg: "var(--color-green-light)" },
  numbers: { label: "מספר", color: "var(--color-blue)", bg: "var(--color-blue-light)" },
  text: { label: "טקסט", color: "var(--color-muted)", bg: "var(--color-surf2)" },
};

export function SchemaTab({ board }: { board: MondayBoard }) {
  return (
    <div className="fade-up">
      <GlassCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14 }}>
            📋 מבנה הבורד ({board.columns.length} עמודות)
          </span>
        </div>
        {board.columns.map((col, i) => {
          const t = typeLabels[col.type] || { label: col.type, color: "var(--color-muted)", bg: "var(--color-surf2)" };
          return (
            <div key={col.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px",
              borderBottom: i < board.columns.length - 1 ? "1px solid var(--color-border)" : "none",
              transition: "background 0.1s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surf2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: "var(--color-text)", fontSize: 13, fontWeight: 500 }}>{col.title}</span>
              <span style={{ background: t.bg, color: t.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{t.label}</span>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
}
