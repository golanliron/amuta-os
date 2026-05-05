import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Monday.com OAuth callback - exchanges code for token and stores it
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return Response.redirect(`${request.nextUrl.origin}/dashboard?monday_error=missing_params`);
  }

  // Verify user is logged in and state matches
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return Response.redirect(`${request.nextUrl.origin}/dashboard?monday_error=unauthorized`);
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://auth.monday.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MONDAY_CLIENT_ID,
      client_secret: process.env.MONDAY_CLIENT_SECRET,
      code,
      redirect_uri: `${request.nextUrl.origin}/api/monday/callback`,
    }),
  });

  if (!tokenRes.ok) {
    console.error('Monday token exchange failed:', await tokenRes.text());
    return Response.redirect(`${request.nextUrl.origin}/dashboard?monday_error=token_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.redirect(`${request.nextUrl.origin}/dashboard?monday_error=no_token`);
  }

  // Fetch Monday.com user info to store alongside token
  const meRes = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': accessToken,
    },
    body: JSON.stringify({ query: '{ me { id name email account { id name } } }' }),
  });

  const meData = await meRes.json();
  const mondayUser = meData?.data?.me;

  // Store token in Supabase (upsert by user_id)
  const admin = createAdminClient();

  // Get user's org_id
  const { data: userData } = await admin
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  await admin.from('monday_tokens').upsert(
    {
      user_id: user.id,
      org_id: userData?.org_id,
      access_token: accessToken,
      monday_user_id: mondayUser?.id?.toString() ?? null,
      monday_account_id: mondayUser?.account?.id?.toString() ?? null,
      monday_user_name: mondayUser?.name ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  return Response.redirect(`${request.nextUrl.origin}/dashboard?monday_connected=true`);
}
