import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
// PDF: try pdf-parse first (robust), fallback to pdfjs-dist
async function parsePDF(buffer: Buffer): Promise<string> {
  // Method 1: pdf-parse (simpler, more reliable)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    if (result.text && result.text.trim().length > 10) {
      return result.text;
    }
  } catch (e) {
    console.error('pdf-parse failed, trying pdfjs:', e);
  }

  // Method 2: pdfjs-dist fallback
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items as { str?: string }[])
        .filter((item) => item && typeof item.str === 'string')
        .map((item) => item.str!)
        .join(' ');
      pages.push(text);
    }
    return pages.join('\n\n');
  } catch (e) {
    console.error('pdfjs-dist also failed:', e);
    return '';
  }
}

// DOCX: mammoth works fine with dynamic import
async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const extract = mammoth.default?.extractRawText || mammoth.extractRawText;
  const result = await extract({ buffer });
  return result.value || '';
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ===== Text Extraction =====

async function extractTextFromFile(file: File): Promise<{ text: string; fileType: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
  const buffer = Buffer.from(await file.arrayBuffer());

  switch (ext) {
    case 'pdf': {
      const text = await parsePDF(buffer);
      return { text, fileType: 'pdf' };
    }
    case 'docx':
    case 'doc': {
      const text = await parseDocx(buffer);
      return { text, fileType: 'docx' };
    }
    case 'xlsx':
    case 'xls': {
      // Basic: read as text, won't work well but better than nothing
      return { text: `[קובץ אקסל: ${file.name}]`, fileType: 'xlsx' };
    }
    case 'html':
    case 'htm': {
      const html = buffer.toString('utf-8');
      const cleaned = stripHtml(html);
      return { text: cleaned, fileType: 'html' };
    }
    case 'txt':
    case 'md':
    case 'csv': {
      return { text: buffer.toString('utf-8'), fileType: ext };
    }
    default: {
      const text = buffer.toString('utf-8');
      if (text.length > 100 && !text.includes('\u0000')) {
        return { text, fileType: ext };
      }
      return { text: `[קובץ ${ext}: ${file.name}]`, fileType: ext };
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== AI Classification & Extraction =====

async function classifyDocument(text: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    system: `סווג את המסמך הזה לקטגוריה אחת בלבד:
- identity: תקנון, תיאור ארגוני, דף אודות, חזון ומטרות
- budget: דוחות כספיים, מאזנים, תקציבים
- project: תיאורי פרויקטים, תוכניות עבודה, דוחות פעילות
- grant: הסכמי מענק, מכתבי מימון
- submission: הגשות קודמות לקרנות
- other: כל דבר אחר

ענה רק עם שם הקטגוריה באנגלית, בלי שום דבר אחר.`,
    messages: [{ role: 'user', content: text.slice(0, 4000) }],
    max_tokens: 20,
  });

  const category = (res.content[0].type === 'text' ? res.content[0].text : '')
    .trim().toLowerCase();
  const valid = ['identity', 'budget', 'project', 'grant', 'submission', 'other'];
  return valid.includes(category) ? category : 'other';
}

async function extractStructuredData(text: string, category: string): Promise<Record<string, unknown>> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    system: `חלץ נתונים מובנים מהמסמך. החזר JSON תקין בלבד.
לפי הקטגוריה ${category}:
- identity: name, registration_number, founded_year, mission, focus_areas (מערך), regions (מערך), beneficiaries_count, employees_count
- budget: annual_budget (מספר), revenue_sources, expenses_breakdown
- project: project_name, description, budget, beneficiaries, region
- grant: source, amount, period, conditions
- submission: target_fund, amount_requested, project_name

חלץ מה שזמין. עברית מותרת בערכים. החזר רק JSON תקין.`,
    messages: [{ role: 'user', content: text.slice(0, 5000) }],
    max_tokens: 1000,
  });

  try {
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}';
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    return JSON.parse(jsonMatch[1]!.trim());
  } catch {
    return {};
  }
}

async function summarizeDocument(text: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    system: `סכם את המסמך ב-2-3 משפטים בעברית. ציין: שם הארגון, תחום פעילות, נקודות מפתח.`,
    messages: [{ role: 'user', content: text.slice(0, 5000) }],
    max_tokens: 200,
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

// ===== Chunking =====

function chunkText(text: string, maxChars: number = 2000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

// ===== Main Handler =====

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const orgId = formData.get('org_id') as string;

    if (!orgId || !file) {
      return Response.json({ error: 'Missing file or org_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Extract text from file
    const { text: parsedText, fileType } = await extractTextFromFile(file);

    if (parsedText.length < 20) {
      return Response.json({
        error: 'לא הצלחתי לחלץ טקסט מהקובץ. נסי פורמט אחר (PDF, DOCX, TXT).',
      }, { status: 400 });
    }

    // 2. Classify + Extract + Summarize in parallel
    const [category, metadata, summary] = await Promise.all([
      classifyDocument(parsedText),
      extractStructuredData(parsedText, 'identity'),
      summarizeDocument(parsedText),
    ]);

    // Re-extract with correct category if not identity
    let finalMetadata = metadata;
    if (category !== 'identity') {
      finalMetadata = await extractStructuredData(parsedText, category);
    }

    // 3. Upload to storage (non-blocking)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    let storagePath = `${orgId}/${Date.now()}_${safeName}`;
    try {
      await supabase.storage.from('documents').upload(storagePath, file);
    } catch {
      storagePath = `local/${safeName}`;
    }

    // 4. Save document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        org_id: orgId,
        filename: file.name,
        file_type: fileType,
        storage_path: storagePath,
        category,
        parsed_text: parsedText.slice(0, 50000),
        metadata: { ...finalMetadata, summary },
        status: 'ready',
      })
      .select('id')
      .single();

    if (docError || !doc) {
      console.error('Doc insert error:', docError);
      return Response.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // 5. Store chunks for RAG
    const chunks = chunkText(parsedText);
    for (const chunkContent of chunks) {
      await supabase.from('document_chunks').insert({
        document_id: doc.id,
        org_id: orgId,
        content: chunkContent,
        metadata: { category, filename: file.name },
      });
    }

    // 6. Update org profile
    await updateOrgProfile(supabase, orgId, category, finalMetadata);

    return Response.json({
      document_id: doc.id,
      category,
      summary,
      extracted_fields: finalMetadata,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ===== Org Profile Update =====

async function updateOrgProfile(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  category: string,
  newData: Record<string, unknown>
) {
  const { data: existing } = await supabase
    .from('org_profiles')
    .select('data')
    .eq('org_id', orgId)
    .single();

  const current = (existing?.data as Record<string, unknown>) || {};
  const merged = { ...current };

  if (category === 'identity') {
    for (const key of ['name', 'registration_number', 'founded_year', 'mission', 'focus_areas', 'regions', 'beneficiaries_count', 'employees_count']) {
      if (newData[key]) merged[key] = newData[key];
    }
  } else if (category === 'budget') {
    if (newData.annual_budget) merged.annual_budget = newData.annual_budget;
  } else if (category === 'project') {
    const projects = (merged.active_projects as unknown[]) || [];
    projects.push(newData);
    merged.active_projects = projects;
  } else if (category === 'grant') {
    const grants = (merged.existing_grants as unknown[]) || [];
    grants.push(newData);
    merged.existing_grants = grants;
  }

  await supabase.from('org_profiles').upsert({
    org_id: orgId,
    data: merged,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'org_id' });
}
