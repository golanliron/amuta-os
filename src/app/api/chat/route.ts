import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGrantsClient } from '@/lib/supabase/grants-db';
import { FISHGOLD_SYSTEM_PROMPT, buildContext, buildOrgContext } from '@/lib/ai/fishgold';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ===== URL Detection & Fetching =====

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

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

async function lookupGrantByUrl(url: string): Promise<string | null> {
  try {
    const grantsDb = createGrantsClient();
    const { data: grant } = await grantsDb
      .from('grants')
      .select('title, description, funder, deadline, amount, categories, target_populations, regions, eligibility, url')
      .eq('url', url)
      .single();

    if (grant) {
      return [
        `[מידע על קול קורא מהמאגר]`,
        `כותרת: ${grant.title}`,
        grant.funder ? `גוף מממן: ${grant.funder}` : '',
        grant.deadline ? `דדליין: ${grant.deadline}` : '',
        grant.amount ? `סכום: עד ${(grant.amount / 1000).toFixed(0)}K ש"ח` : '',
        grant.categories?.length ? `קטגוריות: ${grant.categories.join(', ')}` : '',
        grant.target_populations?.length ? `אוכלוסיות: ${grant.target_populations.join(', ')}` : '',
        grant.regions?.length ? `אזורים: ${grant.regions.join(', ')}` : '',
        grant.eligibility ? `תנאי זכאות: ${grant.eligibility}` : '',
        grant.description ? `תיאור מלא: ${grant.description}` : '',
      ].filter(Boolean).join('\n');
    }

    // Try partial URL match (some URLs have tracking params)
    const baseUrl = url.split('?')[0];
    const { data: partialMatch } = await grantsDb
      .from('grants')
      .select('title, description, funder, deadline, amount, categories, target_populations, regions, eligibility, url')
      .ilike('url', `%${baseUrl.slice(-60)}%`)
      .limit(1)
      .single();

    if (partialMatch) {
      return [
        `[מידע על קול קורא מהמאגר]`,
        `כותרת: ${partialMatch.title}`,
        partialMatch.funder ? `גוף מממן: ${partialMatch.funder}` : '',
        partialMatch.deadline ? `דדליין: ${partialMatch.deadline}` : '',
        partialMatch.amount ? `סכום: עד ${(partialMatch.amount / 1000).toFixed(0)}K ש"ח` : '',
        partialMatch.categories?.length ? `קטגוריות: ${partialMatch.categories.join(', ')}` : '',
        partialMatch.target_populations?.length ? `אוכלוסיות: ${partialMatch.target_populations.join(', ')}` : '',
        partialMatch.regions?.length ? `אזורים: ${partialMatch.regions.join(', ')}` : '',
        partialMatch.eligibility ? `תנאי זכאות: ${partialMatch.eligibility}` : '',
        partialMatch.description ? `תיאור מלא: ${partialMatch.description}` : '',
      ].filter(Boolean).join('\n');
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Try grants DB fallback
      const grantData = await lookupGrantByUrl(url);
      if (grantData) return grantData;
      return `[שגיאה: ${res.status} ${res.statusText}]`;
    }

    const contentType = res.headers.get('content-type') || '';

    if (contentType.match(/image|video|audio|octet-stream|pdf|zip/)) {
      // PDF/binary — try grants DB for the full description
      const grantData = await lookupGrantByUrl(url);
      if (grantData) return grantData;
      return `[קובץ בינארי: ${contentType}. לא ניתן לקרוא PDF ישירות. אם יש לך מידע נוסף על קול הקורא, שתף אותו.]`;
    }

    const text = await res.text();

    if (contentType.includes('json')) {
      return text.slice(0, 12000);
    }

    if (contentType.includes('html')) {
      const cleaned = stripHtml(text);
      // If HTML is too short (SPA/empty), try grants DB
      if (cleaned.length < 200) {
        const grantData = await lookupGrantByUrl(url);
        if (grantData) return grantData;
      }
      return cleaned.slice(0, 12000);
    }

    return text.slice(0, 12000);
  } catch (e) {
    // Network error — try grants DB fallback
    const grantData = await lookupGrantByUrl(url);
    if (grantData) return grantData;
    return `[לא הצלחתי לקרוא את הלינק: ${e instanceof Error ? e.message : 'שגיאה'}]`;
  }
}

interface FetchedUrl {
  url: string;
  content: string;
}

async function fetchUrls(message: string): Promise<FetchedUrl[]> {
  const urls = message.match(URL_REGEX);
  if (!urls || urls.length === 0) return [];

  const unique = [...new Set(urls)].slice(0, 3);
  const results: FetchedUrl[] = [];

  await Promise.all(
    unique.map(async (url) => {
      const content = await fetchUrlContent(url);
      if (content && content.length > 50) {
        results.push({ url, content });
      } else if (content) {
        // SPA or minimal content — still return with note
        results.push({
          url,
          content: `[האתר ${url} הוא אפליקציית SPA ולא ניתן לקרוא את התוכן שלו אוטומטית. התוכן שנקרא: "${content}". כדי ללמוד את הארגון, בקשי מהמשתמש להעלות מסמכים (תקנון, דוח כספי, תיאור פעילות) או לספר על הארגון בטקסט חופשי.]`,
        });
      }
    })
  );

  return results;
}

function formatUrlsForMessage(fetched: FetchedUrl[]): string {
  if (fetched.length === 0) return '';
  const parts = fetched.map((f) => `\n[תוכן מהלינק ${f.url}]:\n${f.content}`);
  return '\n\nתוכן שנקרא מלינקים בהודעה:' + parts.join('\n');
}

// ===== Auto-learn from URLs: extract org data and save =====

async function learnFromUrls(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  fetched: FetchedUrl[]
) {
  if (fetched.length === 0) return;

  for (const { url, content } of fetched) {
    // Skip error messages
    if (content.startsWith('[')) continue;
    if (content.length < 100) continue;

    // 1. Extract structured org data with AI
    try {
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        system: `אתה מנתח תוכן מאתרי אינטרנט של ארגונים ועמותות.
חלץ מהטקסט הבא כמה שיותר מידע מובנה על הארגון.
החזר JSON תקין בלבד עם השדות הרלוונטיים:
- name: שם הארגון
- registration_number: מספר עמותה (אם יש)
- mission: מטרת הארגון (משפט-שניים)
- focus_areas: מערך תחומי פעילות
- regions: מערך אזורי פעילות
- beneficiaries_count: מספר מוטבים (אם מצוין)
- annual_budget: תקציב שנתי (אם מצוין)
- employees_count: מספר עובדים (אם מצוין)
- active_projects: מערך של {name, description}
- key_achievements: מערך הישגים
- content_type: "org_website" | "call_for_proposals" | "article" | "other"
- summary: סיכום קצר של מה שנמצא בלינק

אם זה לא אתר של ארגון (למשל קול קורא או כתבה), עדיין מלא content_type ו-summary.
החזר רק JSON תקין, בלי טקסט נוסף.`,
        messages: [{ role: 'user', content: content.slice(0, 6000) }],
        max_tokens: 1000,
      });

      const raw = res.content[0].type === 'text' ? res.content[0].text : '{}';
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      const extracted = JSON.parse(jsonMatch[1]!.trim()) as Record<string, unknown>;

      // 2. Save as document for RAG
      const { data: doc } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          filename: `url_${new URL(url).hostname}`,
          file_type: 'url',
          storage_path: url,
          category: extracted.content_type === 'org_website' ? 'identity' : 'other',
          parsed_text: content.slice(0, 50000),
          metadata: { url, ...extracted },
          status: 'ready',
        })
        .select('id')
        .single();

      if (doc) {
        // Save chunks for RAG
        const chunks = chunkText(content);
        for (const chunk of chunks) {
          await supabase.from('document_chunks').insert({
            document_id: doc.id,
            org_id: orgId,
            content: chunk,
            metadata: { url, source: 'url_scan', content_type: extracted.content_type },
          });
        }
      }

      // 3. If it's an org website, update org_profile
      if (extracted.content_type === 'org_website') {
        const { data: existing } = await supabase
          .from('org_profiles')
          .select('data')
          .eq('org_id', orgId)
          .single();

        const current = (existing?.data as Record<string, unknown>) || {};
        const merged = { ...current };

        // Merge new data — only overwrite if currently empty
        for (const key of [
          'name',
          'registration_number',
          'mission',
          'focus_areas',
          'regions',
          'beneficiaries_count',
          'annual_budget',
          'employees_count',
          'key_achievements',
        ]) {
          if (extracted[key] && !merged[key]) {
            merged[key] = extracted[key];
          }
        }

        // Append projects
        if (Array.isArray(extracted.active_projects)) {
          const existingProjects = (merged.active_projects as unknown[]) || [];
          merged.active_projects = [...existingProjects, ...(extracted.active_projects as unknown[])];
        }

        await supabase.from('org_profiles').upsert(
          {
            org_id: orgId,
            data: merged,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'org_id' }
        );
      }
    } catch (err) {
      console.error('learnFromUrls error for', url, ':', err instanceof Error ? err.message : err);
    }
  }
}

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

// ===== Knowledge & RAG Loading =====

async function loadAllChunks(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  message: string
): Promise<{ knowledge: string; rag: string; docSummary: string }> {
  try {
    // Load ALL documents list (for completeness awareness)
    const { data: allDocs } = await supabase
      .from('documents')
      .select('id, filename, category, file_type, parsed_text, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    let docSummary = '';
    if (allDocs?.length) {
      // Build a rich summary of ALL documents Fishgold has access to
      const docLines = allDocs.map(d => {
        const preview = d.parsed_text ? d.parsed_text.slice(0, 500) : '';
        return `[${d.category || 'other'}] ${d.filename}${preview ? `:\n${preview}` : ''}`;
      });
      docSummary = `\n\n===== כל המסמכים שקראת (${allDocs.length} מסמכים) =====\n${docLines.join('\n\n')}`;

      // Truncate if too long, but keep as much as possible
      if (docSummary.length > 20000) {
        docSummary = docSummary.slice(0, 20000) + '\n[... עוד מסמכים]';
      }
    }

    // Load knowledge base chunks (always)
    const { data: kbChunks } = await supabase
      .from('document_chunks')
      .select('content, metadata')
      .eq('org_id', orgId)
      .eq('metadata->>source', 'knowledge_base')
      .order('created_at');

    let knowledge = '';
    if (kbChunks?.length) {
      const parts = kbChunks.map(
        (c) => `### ${(c.metadata as Record<string, string>)?.title || 'מידע'}\n${c.content}`
      );
      knowledge = '\n\n===== בסיס ידע ארגוני =====\n' + parts.join('\n\n');
    }

    // RAG: search relevant non-knowledge chunks
    let rag = '';
    const keywords = message
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5)
      .join(' & ');

    if (keywords) {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .eq('org_id', orgId)
        .neq('metadata->>source', 'knowledge_base')
        .textSearch('content', keywords, { type: 'plain' })
        .limit(8);

      if (chunks?.length) {
        rag = buildContext(chunks);
      }
    }

    // Fallback: recent document chunks (load more)
    if (!rag) {
      const { data: recent } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .eq('org_id', orgId)
        .neq('metadata->>source', 'knowledge_base')
        .order('created_at', { ascending: false })
        .limit(8);

      if (recent?.length) {
        rag = buildContext(recent);
      }
    }

    return { knowledge, rag, docSummary };
  } catch {
    return { knowledge: '', rag: '', docSummary: '' };
  }
}

// ===== Opportunity Scanning =====

const SCAN_KEYWORDS = ['קול קורא', 'קולות קוראים', 'הזדמנויות', 'מענק', 'מענקים', 'מימון', 'תמצא לי', 'יש משהו בשבילי', 'סרוק', 'חפש לי'];

function userAsksForOpportunities(message: string): boolean {
  return SCAN_KEYWORDS.some((kw) => message.includes(kw));
}

async function scanOpportunities(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  profileData: Record<string, unknown> | null,
  orgName: string | null,
  userMessage?: string
): Promise<string> {
  if (!profileData || Object.keys(profileData).length < 3) {
    return '';
  }

  const forceRescan = userMessage ? userAsksForOpportunities(userMessage) : false;

  // Check if we already have recent matches (last 24h) — unless user explicitly asks
  if (!forceRescan) {
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('org_id', orgId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentMatches && recentMatches.length > 0) {
      // Load existing matches and enrich from grants DB
      const { data: matches } = await supabase
        .from('matches')
        .select('score, reasoning, opportunity_id')
        .eq('org_id', orgId)
        .gte('score', 50)
        .order('score', { ascending: false })
        .limit(5);

      if (matches && matches.length > 0) {
        // Fetch grant details from the shared grants DB
        const grantsDb = createGrantsClient();
        const oppIds = matches.map(m => m.opportunity_id);
        const { data: grants } = await grantsDb
          .from('grants')
          .select('id, title, deadline, funder, url, description, amount')
          .in('id', oppIds);

        const grantsMap = new Map((grants || []).map(g => [g.id, g]));

        const lines = matches.map((m) => {
          const opp = grantsMap.get(m.opportunity_id);
          if (!opp) return null;
          return `- **${opp.title}** (ציון: ${m.score}/100)${opp.deadline ? ` | דדליין: ${opp.deadline}` : ''}${opp.funder ? ` | ${opp.funder}` : ''}${opp.amount ? ` | עד ${(opp.amount / 1000).toFixed(0)}K ש"ח` : ''}${opp.url ? ` | לינק: ${opp.url}` : ''}\n  ${m.reasoning}${opp.description ? `\n  תיאור: ${opp.description.slice(0, 200)}` : ''}`;
        }).filter(Boolean);

        if (lines.length > 0) {
          return `\n\n===== הזדמנויות מתאימות =====\nמצאתי ${lines.length} קולות קוראים שמתאימים:\n${lines.join('\n')}`;
        }
      }
      return '';
    }
  }

  // Run a fresh scan — query the shared grants database (updated daily by scanner)
  try {
    const today = new Date().toISOString().split('T')[0];
    const grantsDb = createGrantsClient();
    const { data: opportunities, error: oppError } = await grantsDb
      .from('grants')
      .select('id, title, description, deadline, categories, target_populations, funder, url')
      .eq('is_database', true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(60);

    if (oppError) {
      console.error('Opportunities query error:', oppError);
      return '';
    }
    if (!opportunities || opportunities.length === 0) {
      console.log('No opportunities found');
      return '';
    }
    console.log(`Scan: found ${opportunities.length} active opportunities`);

    // Pre-filter by category/population overlap
    const focusAreas = (profileData.focus_areas as string[]) || [];
    const mission = (profileData.mission as string) || '';
    const orgText = [...focusAreas, mission].join(' ');

    const catKeywords: Record<string, string> = {
      education: 'חינוך|לימוד|נשירה|מלגות|הכשרה',
      welfare: 'רווחה|סיכון|ליווי|נוער|צעירים',
      community: 'קהילה|חברה|התנדבות',
      employment: 'תעסוקה|עבודה|הכוונה',
      health: 'בריאות|נפשי|רפואה',
    };

    const orgCats = Object.entries(catKeywords)
      .filter(([, pattern]) => new RegExp(pattern).test(orgText))
      .map(([cat]) => cat);

    const filtered = opportunities.filter((opp) => {
      if (!opp.categories?.length) return true;
      return opp.categories.some((c: string) => orgCats.includes(c));
    }).slice(0, 15);

    if (filtered.length === 0) return '';

    // AI scoring
    const orgContext = buildOrgContext(profileData, orgName);
    const oppList = filtered.map((o, i) =>
      `${i + 1}. "${o.title}" | קטגוריות: ${o.categories?.join(', ') || '-'} | אוכלוסיות: ${o.target_populations?.join(', ') || '-'} | דדליין: ${o.deadline || '-'} | גוף: ${o.funder || '-'}`
    ).join('\n');

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      system: `אתה מומחה גיוס משאבים ישראלי. דרג כל קול קורא 1-10 לפי התאמה לארגון.
קריטריונים: תחום פעילות (30%), אוכלוסיית יעד (30%), גיאוגרפיה (25%), גודל ארגון (15%).

כללים קריטיים:
- קרנות וגופים שפועלים מחוץ לישראל ולא מממנים פעילות בישראל = ציון 1-2 מקסימום.
- אם הקול קורא מיועד לאוכלוסייה אחרת לגמרי (למשל קשישים כשהארגון עובד עם צעירים) = ציון 1-3.
- "education" או "welfare" כקטגוריה רחבה לא מספיקה. חייב חפיפה ממשית בתחום הספציפי.
- ציון 8+ רק כשיש התאמה ממשית בתחום + אוכלוסייה + גיאוגרפיה.
החזר JSON בלבד: [{"index": 1, "score": 8, "reasoning": "נימוק קצר"}]
רק ציון 6 ומעלה. אם אין — מערך ריק [].`,
      messages: [{ role: 'user', content: `${orgContext}\n\nקולות קוראים:\n${oppList}` }],
      max_tokens: 1500,
    });

    const raw = res.content[0].type === 'text' ? res.content[0].text : '[]';
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    let scored: { index: number; score: number; reasoning: string }[] = [];
    try {
      scored = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return '';
    }

    // Save matches and build context
    const goodMatches = scored.filter((s) => s.score >= 6);
    if (goodMatches.length === 0) return '';

    const lines: string[] = [];
    for (const item of goodMatches.slice(0, 5)) {
      const opp = filtered[item.index - 1];
      if (!opp) continue;

      lines.push(`- **${opp.title}** (ציון: ${item.score}/10)${opp.deadline ? ` | דדליין: ${opp.deadline}` : ''}${opp.funder ? ` | ${opp.funder}` : ''}${opp.url ? ` | לינק: ${opp.url}` : ''}\n  ${item.reasoning}${opp.description ? `\n  תיאור: ${opp.description.slice(0, 200)}` : ''}`);

      // Save to DB
      const { error: matchErr } = await supabase.from('matches').upsert(
        { org_id: orgId, opportunity_id: opp.id, score: item.score * 10, reasoning: item.reasoning, status: 'new' },
        { onConflict: 'org_id,opportunity_id', ignoreDuplicates: false }
      );
      if (matchErr) console.error('Match save error:', matchErr.message);
    }

    return `\n\n===== הזדמנויות מתאימות =====\nסרקתי ${filtered.length} קולות קוראים פתוחים. מצאתי ${lines.length} שמתאימים:\n${lines.join('\n')}`;
  } catch (e) {
    console.error('Scan error:', e);
    return '';
  }
}

// ===== Company Scanning =====

const COMPANY_KEYWORDS = ['חברות', 'חברה', 'תורמים', 'תורם', 'עסקים', 'קרנות', 'CSR', 'שותפות', 'שותפויות', 'מי תורם', 'למי לפנות', 'פנייה', 'מייל לחברה', 'נסח מייל', 'כתוב מייל', 'תרומות', 'גיוס מעסקים'];

function userAsksAboutCompanies(message: string): boolean {
  return COMPANY_KEYWORDS.some((kw) => message.includes(kw));
}

async function findSpecificCompany(
  supabase: ReturnType<typeof createAdminClient>,
  userMessage: string
): Promise<string | null> {
  // Extract potential company/fund names from message (3+ word segments or known patterns)
  const msg = userMessage.toLowerCase();
  // Skip if message is too short or is a generic question
  if (msg.length < 5) return null;

  // Search companies whose name appears in the message
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('name, company_type, description, interests, donation_amount, contact_name, contact_email, contact_phone, contact_role, website')
    .eq('active', true);

  if (!allCompanies) return null;

  // Find companies whose name appears in the user message (case insensitive)
  const matches = allCompanies.filter(c => {
    const name = c.name.toLowerCase();
    // Skip very short names that might cause false positives
    if (name.length < 3) return false;
    return msg.includes(name);
  });

  if (matches.length === 0) return null;

  // Build context for the matched companies
  const lines = matches.slice(0, 5).map(c => {
    const parts = [`[חברה מהמאגר שלך] "${c.name}" | סוג: ${c.company_type}`];
    if (c.description) parts.push(`תיאור: ${c.description.slice(0, 300)}`);
    if (c.interests?.length) parts.push(`תחומי עניין: ${c.interests.join(', ')}`);
    if (c.donation_amount) parts.push(`תרומות: ${(c.donation_amount / 1000).toFixed(0)}K ש"ח`);
    if (c.contact_name) parts.push(`איש קשר: ${c.contact_name}${c.contact_role ? ` (${c.contact_role})` : ''}`);
    if (c.contact_email) parts.push(`מייל: ${c.contact_email}`);
    if (c.contact_phone) parts.push(`טלפון: ${c.contact_phone}`);
    if (c.website) parts.push(`אתר: ${c.website}`);
    return parts.join(' | ');
  });

  return `\n\n===== חברות שנמצאו בהודעה =====\n${lines.join('\n')}`;
}

async function scanCompanies(
  supabase: ReturnType<typeof createAdminClient>,
  profileData: Record<string, unknown> | null,
  orgName: string | null,
  userMessage: string
): Promise<string> {
  // Check if user mentions a specific company name (even without generic keywords)
  const specificCompanyMatch = await findSpecificCompany(supabase, userMessage);
  if (specificCompanyMatch) return specificCompanyMatch;

  if (!userAsksAboutCompanies(userMessage)) return '';

  try {
    // Get companies from DB
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, company_type, description, interests, donation_amount, csr_rank, contact_name, contact_email, contact_phone, contact_role, website')
      .eq('active', true)
      .limit(954);

    if (error || !companies?.length) return '';

    // If org has a profile, find matching companies using AI
    if (profileData && Object.keys(profileData).length >= 3) {
      const focusAreas = (profileData.focus_areas as string[]) || [];
      const mission = (profileData.mission as string) || '';
      const regions = (profileData.regions as string[]) || [];
      const orgText = [...focusAreas, mission, ...regions].join(' ').toLowerCase();

      // Pre-filter: companies with overlapping interests or CSR
      const candidates = companies.filter((c) => {
        if (!c.interests?.length && !c.description) return false;
        const companyText = [...(c.interests || []), c.description || ''].join(' ').toLowerCase();
        // Check for keyword overlap
        const orgWords = orgText.split(/\s+/).filter(w => w.length > 2);
        return orgWords.some(w => companyText.includes(w)) || c.csr_rank;
      });

      // Take top candidates (prioritize funds and high CSR rank)
      const sorted = candidates.sort((a, b) => {
        if (a.company_type === 'fund' && b.company_type !== 'fund') return -1;
        if (b.company_type === 'fund' && a.company_type !== 'fund') return 1;
        return (a.csr_rank || 999) - (b.csr_rank || 999);
      }).slice(0, 20);

      if (sorted.length === 0) {
        return `\n\n===== חברות וארגונים =====\nיש לי ${companies.length} חברות וארגונים במאגר, אבל לא מצאתי התאמות ברורות לפרופיל שלכם. תשאלו על סוג ספציפי (קרנות, עסקים, חברות ציבוריות) ואמצא.`;
      }

      // AI scoring for top candidates
      const orgContext = buildOrgContext(profileData, orgName);
      const compList = sorted.map((c, i) =>
        `${i + 1}. "${c.name}" | סוג: ${c.company_type} | תחומי עניין: ${c.interests?.join(', ') || '-'} | תרומות: ${c.donation_amount ? `${(c.donation_amount / 1000).toFixed(0)}K` : 'לא ידוע'} | CSR: ${c.csr_rank || 'לא ידוע'}${c.description ? ` | תיאור: ${c.description.slice(0, 150)}` : ''}`
      ).join('\n');

      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        system: `אתה מומחה גיוס משאבים ישראלי. דרג כל חברה 1-10 לפי התאמה לארגון.
קריטריונים: חפיפת תחומי עניין (35%), פעילות בישראל (25%), גודל תרומות (20%), דירוג CSR (20%).

כללים קריטיים:
- חברות/קרנות שפועלות רק מחוץ לישראל ולא תורמות לארגונים ישראליים = ציון 1-2.
- חפיפה כללית בקטגוריה (education, welfare) לא מספיקה. חייב חפיפה ספציפית.
- ציון 8+ רק כשיש התאמה ברורה בתחום + גיאוגרפיה + היסטוריית תרומות רלוונטית.
החזר JSON בלבד: [{"index": 1, "score": 8, "reasoning": "נימוק קצר", "approach_tip": "טיפ קצר איך לפנות"}]
רק ציון 5 ומעלה. אם אין — מערך ריק [].`,
        messages: [{ role: 'user', content: `${orgContext}\n\nחברות:\n${compList}` }],
        max_tokens: 2000,
      });

      const raw = res.content[0].type === 'text' ? res.content[0].text : '[]';
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      let scored: { index: number; score: number; reasoning: string; approach_tip?: string }[] = [];
      try {
        scored = JSON.parse(jsonMatch[1]!.trim());
      } catch {
        return '';
      }

      const goodMatches = scored.filter((s) => s.score >= 5).slice(0, 8);
      if (goodMatches.length === 0) return '';

      const lines = goodMatches.map((item) => {
        const c = sorted[item.index - 1];
        if (!c) return null;
        return `- ${c.name} (${c.company_type === 'fund' ? 'קרן' : c.company_type === 'public' ? 'ציבורית' : c.company_type === 'private' ? 'פרטית' : 'עסק'}, ציון: ${item.score}/10)${c.donation_amount ? ` | תרומות: ${(c.donation_amount / 1000).toFixed(0)}K ש"ח` : ''}${c.contact_name ? ` | איש קשר: ${c.contact_name}` : ''}${c.contact_email ? ` | ${c.contact_email}` : ''}\n  ${item.reasoning}${item.approach_tip ? `\n  טיפ לפנייה: ${item.approach_tip}` : ''}`;
      }).filter(Boolean);

      return `\n\n===== חברות מתאימות =====\nמצאתי ${lines.length} חברות/קרנות שכדאי לפנות אליהן (מתוך ${companies.length} במאגר):\n${lines.join('\n')}`;
    }

    // No profile — just provide stats
    const typeCounts: Record<string, number> = {};
    for (const c of companies) {
      typeCounts[c.company_type] = (typeCounts[c.company_type] || 0) + 1;
    }
    const statsLine = Object.entries(typeCounts).map(([t, c]) => `${c} ${t === 'fund' ? 'קרנות' : t === 'public' ? 'ציבוריות' : t === 'private' ? 'פרטיות' : 'עסקים'}`).join(', ');

    return `\n\n===== מאגר חברות =====\nיש לי ${companies.length} חברות וארגונים: ${statsLine}. כולם עם פרטי קשר מלאים. תעלו מסמכים על הארגון ואתאים לכם את החברות הכי רלוונטיות.`;
  } catch (e) {
    console.error('Company scan error:', e);
    return '';
  }
}

// ===== Main Handler =====

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_id, org_id, user_id } = await request.json();

    if (!message || !org_id || !user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Step 1: Fetch URLs + org info in parallel
    const [fetchedUrls, { data: org }, { data: profileBefore }] = await Promise.all([
      fetchUrls(message),
      supabase.from('organizations').select('name, domain').eq('id', org_id).single(),
      supabase.from('org_profiles').select('data').eq('org_id', org_id).single(),
    ]);

    // Step 2: Learn from URLs BEFORE building context (so this response already knows the org)
    if (fetchedUrls.length > 0) {
      await learnFromUrls(supabase, org_id, fetchedUrls);
    }

    // Step 3: Re-fetch profile (may have been updated by learnFromUrls) + load knowledge in parallel
    const [{ data: profile }, { knowledge, rag, docSummary }] = await Promise.all([
      fetchedUrls.length > 0
        ? supabase.from('org_profiles').select('data').eq('org_id', org_id).single()
        : Promise.resolve({ data: profileBefore }),
      loadAllChunks(supabase, org_id, message),
    ]);

    const urlContent = formatUrlsForMessage(fetchedUrls);
    const orgContext = buildOrgContext(profile?.data ?? null, org?.name ?? null);

    // Load matched opportunities and companies if profile exists
    const [opportunityContext, companyContext] = await Promise.all([
      scanOpportunities(
        supabase, org_id, profile?.data as Record<string, unknown> | null, org?.name ?? null, message
      ),
      scanCompanies(
        supabase, profile?.data as Record<string, unknown> | null, org?.name ?? null, message
      ),
    ]);

    const systemPrompt = FISHGOLD_SYSTEM_PROMPT + orgContext + docSummary + knowledge + rag + opportunityContext + companyContext;

    // Load conversation history
    let chatMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (conversation_id) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversation_id)
        .eq('org_id', org_id)
        .single();

      if (conv?.messages) {
        chatMessages = (conv.messages as { role: string; content: string }[]).slice(-20).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }

    // Append URL content to the user message so Claude sees it
    const enrichedMessage = urlContent ? message + urlContent : message;
    chatMessages.push({ role: 'user', content: enrichedMessage });

    // Stream response with Claude
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: chatMessages,
      max_tokens: 8192,
    });

    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save conversation after streaming completes
        const now = new Date().toISOString();
        const userMsg = { role: 'user', content: message, timestamp: now };
        const assistantMsg = { role: 'assistant', content: fullResponse, timestamp: now };

        let convId = conversation_id;

        if (convId) {
          const { data: existing } = await supabase
            .from('conversations')
            .select('messages')
            .eq('id', convId)
            .single();

          const updatedMessages = [...((existing?.messages as unknown[]) || []), userMsg, assistantMsg];

          await supabase
            .from('conversations')
            .update({ messages: updatedMessages, updated_at: now })
            .eq('id', convId);
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              org_id,
              user_id,
              title: message.slice(0, 100),
              messages: [userMsg, assistantMsg],
            })
            .select('id')
            .single();

          convId = newConv?.id;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, conversation_id: convId })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
