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

    if (!res.ok) return `[שגיאה: ${res.status} ${res.statusText}]`;

    const contentType = res.headers.get('content-type') || '';

    if (contentType.match(/image|video|audio|octet-stream|pdf|zip/)) {
      return `[קובץ בינארי: ${contentType}]`;
    }

    const text = await res.text();

    if (contentType.includes('json')) {
      return text.slice(0, 12000);
    }

    if (contentType.includes('html')) {
      const cleaned = stripHtml(text);
      return cleaned.slice(0, 12000);
    }

    return text.slice(0, 12000);
  } catch (e) {
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
): Promise<{ knowledge: string; rag: string }> {
  try {
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
        .limit(6);

      if (chunks?.length) {
        rag = buildContext(chunks);
      }
    }

    // Fallback: recent document chunks
    if (!rag) {
      const { data: recent } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .eq('org_id', orgId)
        .neq('metadata->>source', 'knowledge_base')
        .order('created_at', { ascending: false })
        .limit(4);

      if (recent?.length) {
        rag = buildContext(recent);
      }
    }

    return { knowledge, rag };
  } catch {
    return { knowledge: '', rag: '' };
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
      system: `אתה מומחה גיוס משאבים. דרג כל קול קורא 1-10 לפי התאמה לארגון.
קריטריונים: תחום (40%), אוכלוסייה (30%), גודל ארגון (15%), גיאוגרפיה (15%).
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
    const [{ data: profile }, { knowledge, rag }] = await Promise.all([
      fetchedUrls.length > 0
        ? supabase.from('org_profiles').select('data').eq('org_id', org_id).single()
        : Promise.resolve({ data: profileBefore }),
      loadAllChunks(supabase, org_id, message),
    ]);

    const urlContent = formatUrlsForMessage(fetchedUrls);
    const orgContext = buildOrgContext(profile?.data ?? null, org?.name ?? null);

    // Load matched opportunities if profile exists (pass message for intent detection)
    const opportunityContext = await scanOpportunities(
      supabase, org_id, profile?.data as Record<string, unknown> | null, org?.name ?? null, message
    );

    const systemPrompt = FISHGOLD_SYSTEM_PROMPT + orgContext + knowledge + rag + opportunityContext;

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
