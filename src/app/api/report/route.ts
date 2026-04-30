import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { boardContext, reportType, orgName } = await req.json();

    if (!boardContext) {
      return NextResponse.json({ error: "חסרים נתוני בורד" }, { status: 400 });
    }

    const reportPrompts: Record<string, string> = {
      management: `צור דוח מנהלים מקצועי ומפורט מנתוני הבורד. הדוח חייב לכלול:

## מבנה הדוח:

### 1. תקציר מנהלים (3-4 משפטים)
סיכום חד של מצב הבורד - מה עובד, מה דורש תשומת לב.

### 2. נתונים עיקריים
טבלה עם כל הסטטוסים, כמויות ואחוזים.

### 3. צווארי בקבוק ונקודות כאב
- פריטים תקועים (ציין שמות!)
- עמודות עם שיעור מילוי נמוך
- סטטוסים שמרכזים יותר מדי פריטים

### 4. הישגים ונקודות חיוביות
מה עובד טוב? מה מתקדם?

### 5. המלצות לפעולה מיידית
3-5 פעולות קונקרטיות שכדאי לעשות עכשיו. לא כלליות - ספציפיות עם שמות פריטים.

### 6. מבט קדימה
מה צפוי לקרות אם ממשיכים בקצב הנוכחי?

חשוב: השתמש במספרים, אחוזים, שמות ספציפיים. הדוח חייב להיות מוכן לשליחה לדירקטוריון כמו שהוא.`,

      weekly: `צור דוח שבועי קצר וחד מנתוני הבורד:

### סיכום שבועי
- מה השתנה השבוע (הערכה לפי הנתונים)
- כמה פריטים בכל סטטוס (טבלה)
- מה דורש תשומת לב דחופה
- 3 פעולות מומלצות לשבוע הבא

תהיה קצר, קולע, עם מספרים.`,

      donors: `צור דוח למשקיעים/תורמים מנתוני הבורד:

### דוח התקדמות למשקיעים

1. **סיכום ביצועים** - מספרים מרכזיים, אחוזי השלמה
2. **הישגים עיקריים** - מה הושג, כמה פריטים הושלמו
3. **אתגרים ופתרונות** - מה היה קשה ומה עשינו
4. **תוכנית המשך** - מה בתכנון

הטון: מקצועי, אופטימי אבל כנה, מותאם למשקיעים שרוצים לראות ROI.`,

      kpi: `צור דוח KPIs מנתוני הבורד:

חלץ 4-6 KPIs מרכזיים מהנתונים. לכל KPI:
- **שם ה-KPI**
- **ערך נוכחי** (מספר/אחוז)
- **מגמה** (עלייה/ירידה/יציב)
- **המלצה** (מה לעשות)

הצג בטבלה מסודרת. אחרי הטבלה תן 2-3 תובנות מרכזיות.`,
    };

    const type = reportType || "management";
    const prompt = reportPrompts[type] || reportPrompts.management;

    const systemPrompt = `אתה AnyDay - מייצר דוחות מקצועיים מנתוני Monday.com.
${orgName ? `שם הארגון: ${orgName}` : ""}

## כללים:
- עברית מקצועית, נקייה
- מספרים ואחוזים בכל פסקה
- שמות פריטים ספציפיים (לא "כמה פריטים")
- כותרות ברורות עם **כותרת**
- טבלאות עם | עמודה | עמודה |
- הדוח חייב להיות מוכן לשליחה כמו שהוא
- אל תוסיף הערות כמו "הערה: הנתונים מבוססים על..." - פשוט תן את הדוח

נתוני הבורד:
שם: ${boardContext.boardName}
מספר פריטים: ${boardContext.itemsCount}
עמודות: ${boardContext.columns}
סטטוסים: ${boardContext.statusDistribution || "אין"}
פריטים לדוגמה: ${boardContext.sampleItems || "אין"}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );

    return NextResponse.json({ report: textBlock?.text || "לא הצלחתי ליצור דוח" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
