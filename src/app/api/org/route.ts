import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  if (!orgId) return NextResponse.json({ error: 'missing org_id' }, { status: 400 });

  const debug = req.nextUrl.searchParams.get('debug') === '1';
  const supabase = createAdminClient();

  const [profileRes, docsRes] = await Promise.all([
    supabase.from('org_profiles').select('data').eq('org_id', orgId).single(),
    supabase.from('documents').select('*').eq('org_id', orgId).order('uploaded_at', { ascending: false }),
  ]);

  if (debug) {
    return NextResponse.json({
      env_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      env_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      profile_error: profileRes.error,
      docs_error: docsRes.error,
      docs_count: docsRes.data?.length ?? 0,
      profile: profileRes.data?.data || null,
      documents: (docsRes.data || []).slice(0, 3),
    });
  }

  return NextResponse.json({
    profile: profileRes.data?.data || null,
    documents: docsRes.data || [],
  });
}

export async function POST(req: NextRequest) {
  const { org_id, data } = await req.json();
  if (!org_id) return NextResponse.json({ error: 'missing org_id' }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.from('org_profiles').upsert({
    org_id,
    data,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'org_id' });

  return NextResponse.json({ ok: true });
}
