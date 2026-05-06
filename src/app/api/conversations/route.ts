import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/conversations?org_id=xxx&user_id=xxx
// Returns the most recent conversation so Goldfish "remembers" the user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  const userId = searchParams.get('user_id');

  if (!orgId || !userId) {
    return Response.json({ error: 'Missing org_id or user_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the most recent conversation for this org+user
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, title, messages, updated_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!conv) {
    return Response.json({ conversation: null });
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
