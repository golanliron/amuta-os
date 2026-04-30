import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { boardName, itemsCount, columns, statusDistribution } =
      await req.json();

    const prompt = `אתה מומחה לניתוח ארגונים ומערכות ניהול. בורד Monday:
שם: "${boardName}" | פריטים: ${itemsCount}
עמודות: ${columns}
סטטוסים: ${statusDistribution || "אין"}

ענה JSON בלבד ללא backticks:
{"boardType":"מילה אחת","summary":"משפט אחד תמציתי","kpis":[{"name":"...","desc":"...","icon":"emoji","insight":"..."}],"automations":[{"name":"...","trigger":"...","action":"...","priority":"גבוה/בינוני/נמוך"}],"insight":"תובנה מפתיעה אחת","tags":["תג1","תג2"]}
4 kpis, 3 automations.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const raw = textBlock?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "שגיאה בניתוח AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
