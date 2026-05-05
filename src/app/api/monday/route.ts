import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Monday.com API proxy - uses the authenticated user's stored OAuth token
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's Monday token from DB
  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from('monday_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow?.access_token) {
    return Response.json(
      { error: 'Monday.com not connected', code: 'MONDAY_NOT_CONNECTED' },
      { status: 403 }
    );
  }

  // Forward the GraphQL query to Monday.com
  const body = await request.json();
  const { query, variables } = body;

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  const mondayRes = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': tokenRow.access_token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await mondayRes.json();

  if (data.errors) {
    return Response.json({ errors: data.errors }, { status: 400 });
  }

  return Response.json(data);
}

// GET: Check if Monday is connected + get connection info
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from('monday_tokens')
    .select('monday_user_name, monday_account_id, connected_at')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow) {
    return Response.json({ connected: false });
  }

  return Response.json({
    connected: true,
    monday_user_name: tokenRow.monday_user_name,
    monday_account_id: tokenRow.monday_account_id,
    connected_at: tokenRow.connected_at,
  });
}

// DELETE: Disconnect Monday.com
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin.from('monday_tokens').delete().eq('user_id', user.id);

  return Response.json({ disconnected: true });
}
