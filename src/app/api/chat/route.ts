import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { FISHGOLD_SYSTEM_PROMPT, buildContext, buildOrgContext } from '@/lib/ai/fishgold';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_id, org_id, user_id } = await request.json();

    if (!message || !org_id || !user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch org profile for context
    const { data: profile } = await supabase
      .from('org_profiles')
      .select('data')
      .eq('org_id', org_id)
      .single();

    // RAG: text search for relevant chunks (no embeddings needed)
    let ragContext = '';
    try {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .eq('org_id', org_id)
        .textSearch('content', message.split(' ').slice(0, 5).join(' & '), { type: 'plain' })
        .limit(8);

      if (chunks?.length) {
        ragContext = buildContext(chunks);
      }
    } catch {
      // RAG is optional - continue without it
    }

    const orgContext = buildOrgContext(profile?.data ?? null);
    const systemPrompt = FISHGOLD_SYSTEM_PROMPT + orgContext + ragContext;

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
        chatMessages = (conv.messages as { role: string; content: string }[])
          .slice(-20)
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
      }
    }

    chatMessages.push({ role: 'user', content: message });

    // Stream response with Claude
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: chatMessages,
      max_tokens: 2000,
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

          const updatedMessages = [...(existing?.messages as unknown[] || []), userMsg, assistantMsg];

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
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
