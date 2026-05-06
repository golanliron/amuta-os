import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGrantsClient } from '@/lib/supabase/grants-db';
import { FISHGOLD_SYSTEM_PROMPT, buildContext, buildOrgContext } from '@/lib/ai/fishgold';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Meta Cloud API config
const META_API_VERSION = 'v21.0';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'fishgold_webhook_2026';

// Legacy Green API config (fallback)
const GREEN_API_URL = process.env.GREEN_API_URL || '';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || '';
const GREEN_API_INSTANCE = process.env.GREEN_API_INSTANCE || '';

// Detect which provider is configured
const USE_META = !!META_PHONE_NUMBER_ID && !!META_ACCESS_TOKEN;

// ===== Webhook verification (GET) — Meta requires this =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Meta webhook verification
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }

  // Legacy Green API verification
  const legacyToken = searchParams.get('token');
  if (legacyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return Response.json({ status: 'verified' });
  }

  return Response.json({ error: 'Invalid token' }, { status: 403 });
}

// ===== Quick commands =====
const QUICK_COMMANDS: Record<string, string> = {
  'סריקה': 'scan',
  'סרוק': 'scan',
  'חפש': 'scan',
  'התאמות': 'matches',
  'קולות קוראים': 'matches',
  'הגשות': 'submissions',
  'סטטוס': 'status',
  'עזרה': 'help',
  'תפריט': 'help',
};

// ===== Parse incoming message from either provider =====
function parseIncomingMessage(body: Record<string, unknown>): { phone: string; text: string; senderName: string } | null {
  // Try Meta Cloud API format
  if (body.object === 'whatsapp_business_account') {
    const entry = (body.entry as { changes: { value: { messages?: { from: string; text?: { body: string }; type: string }[]; contacts?: { profile?: { name: string } }[] } }[] }[])?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return null;

    const phone = message.from || '';
    const text = message.text?.body || '';
    const senderName = value?.contacts?.[0]?.profile?.name || '';

    return { phone, text, senderName };
  }

  // Try Green API format
  const messageData = body.messageData as { typeMessage?: string; textMessageData?: { textMessage?: string }; extendedTextMessageData?: { text?: string } } | undefined;
  const senderData = body.senderData as { chatId?: string; senderName?: string } | undefined;

  if (!messageData || !senderData) return null;

  const messageType = messageData.typeMessage;
  if (messageType !== 'textMessage' && messageType !== 'extendedTextMessage') return null;

  const phone = senderData.chatId?.replace('@c.us', '') || '';
  const senderName = senderData.senderName || '';
  const text = messageData.textMessageData?.textMessage ||
               messageData.extendedTextMessageData?.text || '';

  // Don't respond to group messages
  if (senderData.chatId?.includes('@g.us')) return null;

  return { phone, text, senderName };
}

// ===== Incoming message (POST) =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = parseIncomingMessage(body);
    if (!parsed || !parsed.phone || !parsed.text) {
      return Response.json({ ok: true });
    }

    const { phone, text, senderName } = parsed;

    const supabase = createAdminClient();

    // 1. Find or create user by phone number
    const { data: waUser } = await supabase
      .from('whatsapp_users')
      .select('id, org_id, user_id, phone, name')
      .eq('phone', phone)
      .single();

    let orgId: string | null = null;

    if (waUser) {
      orgId = waUser.org_id;
      // Update last active
      await supabase.from('whatsapp_users')
        .update({ last_active_at: new Date().toISOString(), ...(senderName && senderName !== waUser.name ? { name: senderName } : {}) })
        .eq('id', waUser.id);
    } else {
      // New user — create a record
      await supabase
        .from('whatsapp_users')
        .insert({ phone, name: senderName })
        .select('id')
        .single();

      // Send onboarding message
      const onboardMsg =
        `שלום ${senderName || ''}! אני *Goldfish* — מומחה גיוס משאבים דיגיטלי.\n\n` +
        `אני יודע למצוא קולות קוראים, לנתח התאמה, ולכתוב הגשות.\n\n` +
        `כדי להתחיל, שלחו לי:\n` +
        `- שם הארגון שלכם\n` +
        `- או לינק לאתר\n` +
        `- או תיאור קצר (מה אתם עושים ולמי)\n\n` +
        `ואני אתחיל ללמוד ולחפש עבורכם!`;
      const isBridgeOnboard = request.headers.get('x-bridge-mode') === 'true';
      if (!isBridgeOnboard) await sendWhatsApp(phone, onboardMsg);
      return Response.json({ ok: true, reply: onboardMsg });
    }

    // 2. Handle users without org — onboarding flow
    if (!orgId) {
      orgId = await handleOnboarding(supabase, waUser.id, phone, text, senderName);
      const isBridgeOnboard2 = request.headers.get('x-bridge-mode') === 'true';
      if (orgId) {
        const linkedMsg =
          `מעולה! חיברתי אותך לארגון. אני מתחיל ללמוד עליכם.\n\n` +
          `בינתיים, הנה מה שאני יודע לעשות:\n` +
          `*סריקה* — חיפוש קולות קוראים מותאמים\n` +
          `*התאמות* — ההתאמות שכבר מצאתי\n` +
          `*סטטוס* — מצב ההגשות שלכם\n` +
          `*עזרה* — תפריט מלא\n\n` +
          `או פשוט כתבו לי מה אתם מחפשים!`;
        if (!isBridgeOnboard2) await sendWhatsApp(phone, linkedMsg);
        return Response.json({ ok: true, reply: linkedMsg });
      } else {
        const moreInfoMsg =
          `תודה! שלחו לי עוד פרטים על הארגון — שם, תחום פעילות, אוכלוסיית יעד, ואיזור גיאוגרפי. ככל שאדע יותר, אמצא יותר.`;
        if (!isBridgeOnboard2) await sendWhatsApp(phone, moreInfoMsg);
        return Response.json({ ok: true, reply: moreInfoMsg });
      }
    }

    // 3. Handle quick commands
    const command = QUICK_COMMANDS[text.trim()];
    if (command) {
      await handleCommand(supabase, phone, orgId, command);
      return Response.json({ ok: true });
    }

    // 4. Load org context if we have an org
    let orgContext = '';
    let ragContext = '';
    let matchesContext = '';

    if (orgId) {
      // Load org profile
      const { data: orgProfile } = await supabase
        .from('org_profiles')
        .select('data')
        .eq('org_id', orgId)
        .single();

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      orgContext = buildOrgContext(orgProfile?.data || null, org?.name);

      // RAG: search relevant chunks
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .eq('org_id', orgId)
        .textSearch('content', text.split(' ').slice(0, 5).join(' & '), { type: 'plain' })
        .limit(5);

      if (chunks && chunks.length > 0) {
        ragContext = buildContext(chunks as { content: string; metadata: Record<string, unknown> }[]);
      }

      // Load top matching opportunities
      const { data: matches } = await supabase
        .from('matches')
        .select('score, reasoning, opportunity_id')
        .eq('org_id', orgId)
        .gte('score', 70)
        .order('score', { ascending: false })
        .limit(5);

      if (matches && matches.length > 0) {
        const oppIds = matches.map(m => m.opportunity_id);
        const grantsDb = createGrantsClient();
        const { data: opps } = await grantsDb
          .from('grants')
          .select('id, title, funder, deadline, amount_max')
          .in('id', oppIds)
          .eq('active', true);

        if (opps && opps.length > 0) {
          const oppLines = opps.map(o => {
            const match = matches.find(m => m.opportunity_id === o.id);
            const deadline = o.deadline ? new Date(o.deadline).toLocaleDateString('he-IL') : 'לא צוין';
            return `- ${o.title} (${o.funder || 'לא צוין'}) | ציון: ${match?.score}% | דדליין: ${deadline} | עד ${o.amount_max ? (o.amount_max / 1000).toFixed(0) + 'K' : '?'} ש"ח`;
          });
          matchesContext = `\n\n===== קולות קוראים מותאמים =====\n${oppLines.join('\n')}`;
        }
      }
    }

    // 5. Load conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('role, content')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(10);

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (history) {
      // Reverse to chronological order
      for (const msg of [...history].reverse()) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: text });

    // 6. Call Claude
    const systemPrompt = FISHGOLD_SYSTEM_PROMPT +
      '\n\n## הקשר — ערוץ וואטסאפ:\n' +
      'אתה מדבר דרך וואטסאפ. תשובות קצרות וממוקדות (עד 500 תווים למסר אלא אם מבקשים הגשה מלאה).\n' +
      'אפשר להשתמש ב-*bold* ו-_italic_ של וואטסאפ.\n' +
      'אם צריך לכתוב טיוטה ארוכה — תודיע שהיא ארוכה ותשלח בכמה הודעות.' +
      orgContext + ragContext + matchesContext;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      system: systemPrompt,
      messages,
      max_tokens: 1500,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';

    // 7. Save messages to history
    await supabase.from('whatsapp_messages').insert([
      { phone, role: 'user', content: text, org_id: orgId },
      { phone, role: 'assistant', content: reply, org_id: orgId },
    ]);

    // 8. Send reply via WhatsApp (skip if bridge mode — bridge sends itself)
    const isBridge = request.headers.get('x-bridge-mode') === 'true';
    if (!isBridge) {
      await sendWhatsApp(phone, reply);
    }

    return Response.json({ ok: true, reply });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ===== Onboarding: link user to org =====
async function handleOnboarding(
  supabase: ReturnType<typeof createAdminClient>,
  waUserId: string,
  phone: string,
  text: string,
  senderName: string
): Promise<string | null> {
  // Try to find existing org by name (fuzzy)
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', `%${text.trim().slice(0, 50)}%`)
    .limit(1);

  let orgId: string;

  if (orgs && orgs.length > 0) {
    orgId = orgs[0].id;
  } else {
    // Create new org from the text
    const orgName = text.trim().slice(0, 100);
    // Only create if it looks like an org name (not a question/link)
    if (orgName.length < 2 || orgName.includes('?') || orgName.length > 80) {
      return null;
    }

    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: orgName })
      .select('id')
      .single();

    if (!newOrg) return null;
    orgId = newOrg.id;

    // Create empty org profile
    await supabase.from('org_profiles').insert({
      org_id: orgId,
      data: { name: orgName, source: 'whatsapp' },
    });
  }

  // Link user to org
  await supabase.from('whatsapp_users')
    .update({ org_id: orgId })
    .eq('id', waUserId);

  return orgId;
}

// ===== Handle quick commands =====
async function handleCommand(
  supabase: ReturnType<typeof createAdminClient>,
  phone: string,
  orgId: string,
  command: string
) {
  switch (command) {
    case 'scan': {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

      await sendWhatsApp(phone, `מחפש קולות קוראים מותאמים עבורכם... זה יכול לקחת עד 30 שניות.`);

      try {
        const scanRes = await fetch(`${baseUrl}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: orgId }),
        });
        const scanData = await scanRes.json();

        if (scanData.matches && scanData.matches.length > 0) {
          const lines = scanData.matches.slice(0, 5).map((m: { title: string; score: number; deadline: string | null; funder: string | null; url: string | null }, i: number) => {
            const deadline = m.deadline ? new Date(m.deadline).toLocaleDateString('he-IL') : 'לא צוין';
            return `${i + 1}. *${m.title}*\n   ציון: ${m.score}/10 | דדליין: ${deadline}${m.funder ? ` | ${m.funder}` : ''}${m.url ? `\n   ${m.url}` : ''}`;
          });
          await sendWhatsApp(phone,
            `מצאתי *${scanData.matches.length} התאמות*:\n\n${lines.join('\n\n')}\n\n` +
            `רוצים שאכתוב טיוטה לאחד מהם? שלחו את המספר.`
          );
        } else {
          await sendWhatsApp(phone, scanData.message || 'לא מצאתי התאמות כרגע. ננסה שוב בקרוב.');
        }
      } catch {
        await sendWhatsApp(phone, 'שגיאה בסריקה. נסו שוב בעוד כמה דקות.');
      }
      break;
    }

    case 'matches': {
      const { data: matches } = await supabase
        .from('matches')
        .select('score, reasoning, opportunity_id')
        .eq('org_id', orgId)
        .gte('score', 50)
        .order('score', { ascending: false })
        .limit(5);

      if (!matches || matches.length === 0) {
        await sendWhatsApp(phone, `אין התאמות עדיין. שלחו *סריקה* כדי לחפש קולות קוראים.`);
        break;
      }

      const oppIds = matches.map(m => m.opportunity_id);
      const grantsDb = createGrantsClient();
      const { data: opps } = await grantsDb
        .from('grants')
        .select('id, title, funder, deadline, url')
        .in('id', oppIds);

      const lines = (opps || []).map((o, i) => {
        const match = matches.find(m => m.opportunity_id === o.id);
        const deadline = o.deadline ? new Date(o.deadline).toLocaleDateString('he-IL') : '';
        return `${i + 1}. *${o.title}*\n   ${o.funder || ''} | ציון: ${match?.score}%${deadline ? ` | עד ${deadline}` : ''}${o.url ? `\n   ${o.url}` : ''}`;
      });

      await sendWhatsApp(phone, `ההתאמות הטובות שלכם:\n\n${lines.join('\n\n')}`);
      break;
    }

    case 'submissions': {
      const { data: subs } = await supabase
        .from('submissions')
        .select('title, status, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!subs || subs.length === 0) {
        await sendWhatsApp(phone, `אין הגשות עדיין. מצאתם קול קורא מתאים? שלחו לי ואכתוב טיוטה.`);
        break;
      }

      const statusMap: Record<string, string> = {
        draft: 'טיוטה', review: 'בבדיקה', submitted: 'הוגש', approved: 'אושר!', rejected: 'נדחה'
      };
      const lines = subs.map((s, i) =>
        `${i + 1}. ${s.title}\n   סטטוס: ${statusMap[s.status] || s.status} | ${new Date(s.created_at).toLocaleDateString('he-IL')}`
      );
      await sendWhatsApp(phone, `ההגשות שלכם:\n\n${lines.join('\n\n')}`);
      break;
    }

    case 'status': {
      const [{ count: matchCount }, { count: subCount }, { data: org }] = await Promise.all([
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('score', 50),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('organizations').select('name').eq('id', orgId).single(),
      ]);

      await sendWhatsApp(phone,
        `*${org?.name || 'הארגון שלכם'}*\n\n` +
        `התאמות פעילות: ${matchCount || 0}\n` +
        `הגשות: ${subCount || 0}\n\n` +
        `שלחו *סריקה* לחיפוש חדש.`
      );
      break;
    }

    case 'help': {
      await sendWhatsApp(phone,
        `*Goldfish — תפריט*\n\n` +
        `*סריקה* — חיפוש קולות קוראים מותאמים\n` +
        `*התאמות* — ההתאמות שמצאתי\n` +
        `*הגשות* — סטטוס ההגשות\n` +
        `*סטטוס* — סיכום מהיר\n\n` +
        `או פשוט כתבו לי בחופשיות:\n` +
        `- "חפש לי מענקים לחינוך"\n` +
        `- "כתוב טיוטה להגשה מספר 1"\n` +
        `- "מה הדדליין הקרוב?"\n` +
        `- העתיקו קול קורא ואנתח אותו`
      );
      break;
    }
  }
}

// ===== Send message — supports both Meta Cloud API and Green API =====
async function sendWhatsApp(phone: string, text: string) {
  const chunks = splitMessage(text, 1500);

  for (const chunk of chunks) {
    if (USE_META) {
      await sendViaMeta(phone, chunk);
    } else if (GREEN_API_URL && GREEN_API_INSTANCE && GREEN_API_TOKEN) {
      await sendViaGreenApi(phone, chunk);
    } else {
      console.log('[WhatsApp] No provider configured, skipping send:', { phone, text: chunk.slice(0, 100) });
    }

    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

// Meta Cloud API send
async function sendViaMeta(phone: string, text: string) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Meta API] Send error:', res.status, err);
  }
}

// Green API send (legacy fallback)
async function sendViaGreenApi(phone: string, text: string) {
  await fetch(
    `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message: text,
      }),
    }
  );
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf(' ', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;

    parts.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return parts;
}
