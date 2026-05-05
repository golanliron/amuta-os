import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/conversations/[id]?org_id=xxx
// Returns a specific conversation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = request.nextUrl.searchParams.get('org_id');

  if (!orgId) {
    return Response.json({ error: 'Missing org_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id, title, messages, updated_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !conv) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return Response.json({
    conversation: {
      id: conv.id,
      title: conv.title,
      messages: conv.messages,
      updated_at: conv.updated_at,
    },
  });
}
