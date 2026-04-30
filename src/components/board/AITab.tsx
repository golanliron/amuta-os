"use client";

import { GlassCard } from "../ui/GlassCard";
import { Btn } from "../ui/Btn";
import { Spinner } from "../ui/Spinner";
import type { AIAnalysis } from "@/types";

export function AITab({
  analysis, analyzing, aiError, loadingItems, onRunAI,
}: {
  analysis: AIAnalysis | null; analyzing: boolean; aiError: string | null; loadingItems: boolean; onRunAI: () => void;
}) {
  if (!analysis && !analyzing && !aiError) {
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 60 }}>
        <div style={{ fontSize: 56 }}>🤖</div>
        <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 700, fontSize: 20 }}>ניתוח AI חכם</div>
        <div style={{ color: "var(--color-muted)", fontSize: 14, textAlign: "center", lineHeight: 1.8, maxWidth: 380 }}>
          Claude יזהה את סוג הבורד, ימליץ על מדדים חשובים, ויציע אוטומציות שיחסכו לך זמן
        </div>
        <Btn onClick={onRunAI} disabled={loadingItems} style={{ marginTop: 8 }}>🤖 הפעילי ניתוח</Btn>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 60 }}>
        <Spinner size={36} />
        <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-accent)", fontWeight: 600, fontSize: 16 }}>Claude מנתח את הבורד...</div>
        <div style={{ color: "var(--color-muted)", fontSize: 13 }}>מזהה סוג · מחשב מדדים · מציע אוטומציות</div>
      </div>
    );
  }

  if (aiError) {
    return (
      <GlassCard style={{ border: "1px solid var(--color-red)", background: "var(--color-red-light)" }}>
        <div style={{ color: "var(--color-red)", fontWeight: 600, fontSize: 14 }}>⚠ {aiError}</div>
      </GlassCard>
    );
  }

  if (!analysis) return null;

  const priorityColor = (p: string) =>
    p === "גבוה" ? "var(--color-red)" : p === "בינוני" ? "#E67E22" : "var(--color-green)";
  const priorityBg = (p: string) =>
    p === "גבוה" ? "var(--color-red-light)" : p === "בינוני" ? "var(--color-amber-light)" : "var(--color-green-light)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">
      {/* Summary */}
      <GlassCard glow>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {analysis.boardType}
          </span>
          {analysis.tags?.map((t, i) => (
            <span key={i} style={{ background: "var(--color-surf2)", color: "var(--color-muted)", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
              {t}
            </span>
          ))}
        </div>
        <p style={{ color: "var(--color-text)", fontSize: 15, lineHeight: 1.8, margin: 0 }}>{analysis.summary}</p>
      </GlassCard>

      {/* KPIs */}
      <GlassCard className="fade-up-2">
        <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 15, marginBottom: 16 }}>📈 מדדים מומלצים</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {analysis.kpis?.map((k, i) => (
            <div key={i} style={{ background: "var(--color-surf2)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{k.icon}</div>
              <div style={{ color: "var(--color-text)", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{k.name}</div>
              <div style={{ color: "var(--color-muted)", fontSize: 12, lineHeight: 1.6, marginBottom: k.insight ? 10 : 0 }}>{k.desc}</div>
              {k.insight && <div style={{ color: "var(--color-accent)", fontSize: 12, fontWeight: 500 }}>💡 {k.insight}</div>}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Automations */}
      <GlassCard className="fade-up-3">
        <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 15, marginBottom: 16 }}>⚡ אוטומציות מומלצות</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {analysis.automations?.map((a, i) => (
            <div key={i} style={{ background: "var(--color-surf2)", borderRadius: 12, padding: 16, borderRight: `4px solid ${priorityColor(a.priority)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "var(--color-text)", fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                <span style={{ background: priorityBg(a.priority), color: priorityColor(a.priority), padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {a.priority}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "var(--color-text2)", fontSize: 12, background: "#FFFFFF", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  כש: {a.trigger}
                </span>
                <span style={{ color: "var(--color-muted)", fontSize: 14 }}>→</span>
                <span style={{ color: "var(--color-text2)", fontSize: 12, background: "#FFFFFF", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  אז: {a.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Insight */}
      <div className="fade-up-4" style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-mid)", borderRadius: 14, padding: 20 }}>
        <div style={{ color: "var(--color-accent)", fontWeight: 600, fontSize: 12, letterSpacing: "0.5px", marginBottom: 8 }}>💡 תובנה</div>
        <p style={{ color: "var(--color-text)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{analysis.insight}</p>
      </div>

      <Btn variant="ghost" onClick={onRunAI} style={{ width: "fit-content", fontSize: 13 }}>🔄 נתחי מחדש</Btn>
    </div>
  );
}
