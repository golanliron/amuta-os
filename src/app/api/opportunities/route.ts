import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const [taxRes, oppRes, matchRes] = await Promise.all([
    supabase.from('grant_taxonomy').select('*').order('label_he'),
    supabase
      .from('opportunities')
      .select('*')
      .eq('active', true)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(500),
    orgId
      ? supabase.from('matches').select('opportunity_id, score, reasoning').eq('org_id', orgId).gte('score', 50)
      : Promise.resolve({ data: [] }),
  ]);

  const opportunities = (oppRes.data || []).filter(
    (o: Record<string, unknown>) => !o.deadline || String(o.deadline) >= today
  );

  return NextResponse.json({
    taxonomy: taxRes.data || [],
    opportunities,
    matches: matchRes.data || [],
  });
}
