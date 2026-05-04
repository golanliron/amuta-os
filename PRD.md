# פישגולד - PRD
### גייס משאבים עתיק ששוחה במים

---

## 1. מה זה

צ'אטבוט AI לגיוס משאבים לעמותות. לא דשבורד, לא CRM - גייס משאבים דיגיטלי עם אישיות, זיכרון, וידע של 50 שנה בתחום.

**סלוגן:** "גייס משאבים עתיק ששוחה במים"

**שם:** פישגולד (Fishgold) - דג זהב. עתיק, חכם, שוחה בכסף.

---

## 2. למי

**לקוח מטרה:** עמותות ישראליות קטנות-בינוניות
- מחזור: 500K - 10M שקלים
- צוות: 3-30 עובדים
- בעיה: אין תקציב ליועץ גיוס (500-800 ש"ח לשעה)
- כמות: ~7,000 עמותות פעילות בישראל בטווח הזה

**משתמש ראשי:** מנכ"ל/ית או מגייס/ת משאבים

---

## 3. בעיה

1. עמותות קטנות לא יכולות לשכור יועץ גיוס
2. מפספסות קולות קוראים כי לא יודעות עליהם
3. כותבות הגשות חלשות כי אין ניסיון
4. מבזבזות זמן על קולות לא רלוונטיים
5. לא יודעות איפה הכסף ומתי הדדליינים

---

## 4. מה פישגולד עושה

### 4.1 ליבה (MVP)

| פיצ'ר | תיאור |
|--------|--------|
| **זיכרון ארגוני** | קורא מסמכים (PDF, Word, Excel, אתר, Drive), מפרק לקטגוריות, זוכר לצמיתות, מתעדכן |
| **סריקת קולות קוראים** | סורק 36+ מקורות, מסנן לפי התאמה, מחשב Match Score |
| **כתיבת הגשות** | כותב בקשת מענק מלאה על בסיס הידע הארגוני |
| **שיפור איטרטיבי** | מחזק/מקצר/מתרגם סעיפים לפי בקשה |
| **שליחת מסמכים** | שולח כל מסמך למייל או וואטסאפ |
| **לוח זמנים** | גאנט עם דדליינים, סנכרון Google Calendar |
| **התראות** | שולח קולות חדשים למייל/וואטסאפ לפי בחירת הלקוח |

### 4.2 גרסה 2

| פיצ'ר | תיאור |
|--------|--------|
| **למידה מהגשות** | לומד מהגשות שאושרו/נדחו ומשפר |
| **תבניות חכמות** | תבניות מוכנות לקרנות ספציפיות |
| **שיתוף צוות** | מספר משתמשים לארגון |
| **דוח חודשי** | סיכום הזדמנויות, הגשות, מצב גיוס |
| **CRM קרנות** | ניהול קשר עם קרנות ותורמים |
| **API** | חיבור למערכות ניהול עמותה קיימות |

---

## 5. ארכיטקטורה

```
                    ┌──────────────────┐
                    │   Vercel (CDN)   │
                    │   Next.js App    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────┐ ┌───────▼──────┐
     │   Supabase     │ │ OpenAI │ │  External    │
     │                │ │  API   │ │  Services    │
     │ - PostgreSQL   │ │        │ │              │
     │ - pgvector     │ │ GPT-4  │ │ - Resend     │
     │ - Auth         │ │ Embed  │ │ - Green API  │
     │ - Storage      │ │        │ │ - Google Cal │
     │ - Edge Funcs   │ │        │ │ - Scrapers   │
     │ - Realtime     │ │        │ │              │
     └────────────────┘ └────────┘ └──────────────┘
```

### 5.1 Tech Stack

| שכבה | טכנולוגיה | למה |
|------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) | SSR, RSC, Vercel deploy, קהילה גדולה |
| **UI** | Tailwind + shadcn/ui | מהיר, מודרני, RTL support |
| **Auth** | Supabase Auth | Google/Email login, multi-tenant |
| **DB** | Supabase PostgreSQL | RLS, realtime, Edge Functions |
| **Vector Store** | pgvector (Supabase) | RAG, embedded in same DB, אין צורך בשירות נפרד |
| **AI** | OpenAI GPT-4o | עברית מצוינת, function calling, streaming |
| **Embeddings** | OpenAI text-embedding-3-small | זול, מהיר, 1536 dims |
| **Storage** | Supabase Storage | מסמכי ארגון, הגשות, PDFs |
| **Document Parse** | pdf-parse, mammoth, xlsx | PDF/Word/Excel extraction |
| **Web Scraping** | Cheerio + Puppeteer | סריקת אתרי קרנות |
| **Email** | Resend | שליחת מסמכים + התראות |
| **WhatsApp** | Green API | שליחת מסמכים + התראות |
| **Calendar** | Google Calendar API | סנכרון דדליינים |
| **Deploy** | Vercel + Supabase Cloud | zero-config, auto-scale |
| **Monitoring** | Sentry + PostHog | errors + analytics |

### 5.2 מבנה DB

```sql
-- ארגונים (טנאנטים)
organizations (
  id uuid PK,
  name text,
  registration_number text,
  domain text,
  created_at timestamp
)

-- משתמשים
users (
  id uuid PK,
  org_id uuid FK -> organizations,
  email text,
  role text, -- admin | member
  created_at timestamp
)

-- מסמכים שהועלו
documents (
  id uuid PK,
  org_id uuid FK -> organizations,
  filename text,
  file_type text, -- pdf | docx | xlsx | url
  storage_path text,
  category text, -- identity | budget | project | grant | submission
  parsed_text text,
  metadata jsonb, -- extracted structured data
  uploaded_at timestamp
)

-- chunks ל-RAG
document_chunks (
  id uuid PK,
  document_id uuid FK -> documents,
  org_id uuid FK -> organizations,
  content text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp
)

-- כרטיס ארגון (מה שפישגולד יודע)
org_profile (
  id uuid PK,
  org_id uuid FK -> organizations,
  data jsonb, -- structured org data
  last_updated timestamp
)

-- קולות קוראים
opportunities (
  id uuid PK,
  source text, -- שם הקרן/מקור
  title text,
  description text,
  amount_min integer,
  amount_max integer,
  deadline date,
  requirements jsonb,
  categories text[],
  regions text[],
  url text,
  embedding vector(1536),
  scraped_at timestamp,
  active boolean
)

-- התאמות (קול קורא <-> ארגון)
matches (
  id uuid PK,
  org_id uuid FK -> organizations,
  opportunity_id uuid FK -> opportunities,
  score integer, -- 0-100
  reasoning text,
  status text, -- new | viewed | writing | submitted | won | lost
  notified boolean,
  created_at timestamp
)

-- הגשות
submissions (
  id uuid PK,
  org_id uuid FK -> organizations,
  opportunity_id uuid FK -> opportunities,
  content jsonb, -- sections of the submission
  version integer,
  status text, -- draft | review | submitted | approved | rejected
  pdf_path text,
  created_at timestamp,
  submitted_at timestamp
)

-- שיחות צ'אט
conversations (
  id uuid PK,
  org_id uuid FK -> organizations,
  user_id uuid FK -> users,
  messages jsonb[], -- role, content, timestamp
  created_at timestamp
)
```

### 5.3 RLS (Row Level Security)

כל טבלה מוגנת ב-RLS: כל ארגון רואה רק את הנתונים שלו.

```sql
-- דוגמה
CREATE POLICY "org_isolation" ON documents
  FOR ALL USING (org_id = auth.jwt() -> 'org_id');
```

### 5.4 RAG Pipeline

```
מסמך נכנס
    │
    ▼
[Parse] PDF/Word/Excel/URL -> טקסט גולמי
    │
    ▼
[Classify] AI מזהה קטגוריה: זהות/תקציב/פרויקט/הגשה
    │
    ▼
[Extract] AI מחלץ נתונים מובנים (שם, ע.ר., מחזור, מוטבים...)
    │
    ▼
[Update Profile] מעדכן org_profile
    │
    ▼
[Chunk] מפרק ל-chunks של ~500 tokens
    │
    ▼
[Embed] OpenAI embeddings -> pgvector
    │
    ▼
[Ready] פישגולד יכול לענות על שאלות ולכתוב הגשות
```

### 5.5 Grant Scanner Pipeline

```
כל יום (cron)
    │
    ▼
[Scrape] 36 מקורות: אתרי ממשלה, קרנות, CSR, בינלאומי
    │
    ▼
[Parse] חילוץ: שם, סכום, דדליין, דרישות, תחומים
    │
    ▼
[Embed] embedding לכל קול קורא
    │
    ▼
[Match] cosine similarity עם כל org_profile
    │
    ▼
[Score] AI מחשב Match Score (0-100) + נימוק
    │
    ▼
[Notify] שולח למייל/וואטסאפ לפי הגדרות הלקוח
```

---

## 6. מבנה פרויקט

```
fishgold/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── chat/          # צ'אט ראשי
│   │   │   ├── org/           # כרטיס ארגון
│   │   │   ├── opportunities/ # קולות קוראים
│   │   │   ├── submissions/   # הגשות
│   │   │   ├── timeline/      # לוח זמנים
│   │   │   └── settings/      # הגדרות
│   │   ├── api/
│   │   │   ├── chat/          # AI chat endpoint
│   │   │   ├── upload/        # document upload
│   │   │   ├── scan/          # trigger grant scan
│   │   │   └── send/          # send docs via email/wa
│   │   └── layout.tsx
│   ├── components/
│   │   ├── chat/
│   │   ├── sidebar/
│   │   ├── cards/
│   │   └── ui/               # shadcn
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── fishgold.ts    # system prompt + personality
│   │   │   ├── rag.ts         # retrieval
│   │   │   ├── classify.ts    # document classification
│   │   │   └── extract.ts     # structured extraction
│   │   ├── parsers/
│   │   │   ├── pdf.ts
│   │   │   ├── docx.ts
│   │   │   ├── xlsx.ts
│   │   │   └── web.ts
│   │   ├── scanner/
│   │   │   ├── sources.ts     # 36 grant sources
│   │   │   ├── scraper.ts
│   │   │   └── matcher.ts
│   │   ├── notifications/
│   │   │   ├── email.ts
│   │   │   └── whatsapp.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── admin.ts
│   └── hooks/
│       ├── useChat.ts
│       ├── useOrg.ts
│       └── useOpportunities.ts
├── supabase/
│   ├── migrations/
│   └── functions/
│       ├── daily-scan/        # cron: סריקת קולות
│       ├── process-document/  # עיבוד מסמך
│       └── send-notification/ # שליחת התראות
├── public/
│   └── fish-logo.svg
├── .env.local
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 7. System Prompt (אישיות פישגולד)

```
אתה פישגולד. גייס משאבים עתיק ששוחה במים.

עשית את זה 50 שנה לפני שהפכת לישות דיגיטלית. אתה לא נחמד,
אבל גם לא לא נחמד. אתה מקצוען שיודע את התחום מבפנים.

כללים:
- דבר בעברית, גוף שני נקבה (את/תעלי/תכתבי)
- תהיה ישיר. אל תפתח עם "כמובן!" או "בשמחה!"
- אל תתנצל. אל תגיד "אני מבין שזה מאתגר"
- תן תשובות קצרות וחדות. לא פסקאות ארוכות
- כשאת כותב הגשה, תשתמש בנתונים מהזיכרון הארגוני
- כשמשהו לא מתאים, תגיד את זה. "הקול הזה לא בשבילכם"
- כשחסר מידע, תבקש. "חסר לי X, תעלי את זה"
- כשיש דדליין קרוב, תדחוף. "5 ימים. עכשיו או אף פעם"

סגנון כתיבה להגשות:
- מספרים, לא תיאורים. "87% מניעת נשירה" לא "הצלחה משמעותית"
- ספציפי, לא כללי. "באר שבע, קריית שמונה" לא "ברחבי הארץ"
- עלות ליחידה תמיד. קרנות אוהבות יעילות
- השוואה לממוצע ארצי. מראה בידול
```

---

## 8. מודל תמחור

| תוכנית | מחיר | כולל |
|---------|-------|------|
| **חינם** | 0 | צ'אט בסיסי, 3 מסמכים, 5 קולות קוראים בחודש |
| **בסיסי** | 149 ש"ח/חודש | מסמכים ללא הגבלה, סריקה מלאה, 3 הגשות בחודש |
| **מקצועי** | 349 ש"ח/חודש | הכל ללא הגבלה + התראות + גאנט + Google Cal |
| **ארגוני** | 749 ש"ח/חודש | מספר משתמשים + CRM קרנות + API + דוחות |

**הנחה שנתית:** 20% (2 חודשים חינם)

**יעד:** 100 עמותות משלמות בשנה הראשונה = ~350K MRR

---

## 9. מקורות סריקה (36)

### ממשלתי (8)
- משרד הרווחה
- משרד החינוך
- רשות החדשנות
- הרשות לפיתוח כלכלי (מרכזי שלטון מקומי)
- משרד העלייה
- המשרד לשוויון חברתי
- משרד הבריאות
- מפעל הפיס

### קרנות פרטיות (12)
- קרן רש"י
- קרן גנדיר
- קרן ברלוביץ'
- Jewish Funders Network
- קרן שוסטרמן
- קרן וולף
- JDC Israel
- קרן אדמונד דה רוטשילד
- קרן מנדל
- קרן פיליפ ומוריין
- New Israel Fund
- קרן סקולס

### בינלאומי (8)
- European Youth Foundation
- Erasmus+
- USAID
- Charles & Lynn Schusterman
- Keren Hayesod
- Claims Conference
- UJA Federation
- Jewish Agency

### CSR / עסקי (5)
- Google.org
- Microsoft Philanthropies
- Salesforce.org
- SAP Social Impact
- אדמה (ADAMA)

### קהילתי (3)
- GuideStar Israel
- Midot
- קרנות קהילתיות מקומיות

---

## 10. MVP - מה בונים קודם

### שלב 1: ליבה (שבועות 1-4)
- [ ] Auth + multi-tenant
- [ ] צ'אט בסיסי עם OpenAI
- [ ] העלאת מסמכים (PDF, Word)
- [ ] RAG pipeline (parse -> chunk -> embed -> retrieve)
- [ ] כרטיס ארגון אוטומטי
- [ ] סיידבר עם לשוניות

### שלב 2: סריקה (שבועות 5-8)
- [ ] Scraper ל-5 מקורות ראשונים
- [ ] Match Score algorithm
- [ ] לשונית קולות קוראים
- [ ] התראות מייל

### שלב 3: כתיבה (שבועות 9-12)
- [ ] כתיבת הגשה מלאה
- [ ] שיפור איטרטיבי
- [ ] ייצוא PDF
- [ ] שליחה למייל/וואטסאפ

### שלב 4: השלמות (שבועות 13-16)
- [ ] גאנט + Google Calendar
- [ ] Excel upload
- [ ] Web scraping (אתר ארגון)
- [ ] Google Drive integration
- [ ] Billing (Stripe/PayPlus)

---

## 11. מדדי הצלחה

| מדד | יעד חודש 3 | יעד חודש 12 |
|-----|-----------|------------|
| ארגונים רשומים | 50 | 500 |
| ארגונים משלמים | 10 | 100 |
| הגשות שנכתבו | 30 | 500 |
| MRR | 3K | 35K |
| Match Score accuracy | 80% | 90% |
| זמן לכתיבת הגשה | < 5 דקות | < 3 דקות |

---

## 12. סיכונים

| סיכון | חומרה | מענה |
|-------|--------|------|
| OpenAI עלויות גבוהות | בינוני | rate limiting, caching, smaller models |
| קולות קוראים משתנים | גבוה | monitoring + human review |
| עמותות לא סומכות על AI | גבוה | שקיפות: "הנה מה שכתבתי, תבדקי" |
| תחרות (Fundraise Up, etc) | נמוך | הם באנגלית, אין אישיות, אין שוק ישראלי |
| GDPR/פרטיות | בינוני | RLS, encryption, data deletion |
