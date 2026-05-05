import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Redirects user to Monday.com OAuth consent screen
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.MONDAY_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'Monday OAuth not configured' }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/monday/callback`;
  const state = user.id; // Pass user_id as state for verification

  const mondayAuthUrl = new URL('https://auth.monday.com/oauth2/authorize');
  mondayAuthUrl.searchParams.set('client_id', clientId);
  mondayAuthUrl.searchParams.set('redirect_uri', redirectUri);
  mondayAuthUrl.searchParams.set('state', state);

  return Response.redirect(mondayAuthUrl.toString());
}
