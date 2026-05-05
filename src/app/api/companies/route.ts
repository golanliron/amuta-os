import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const search = req.nextUrl.searchParams.get('search') || '';
  const type = req.nextUrl.searchParams.get('type') || '';
  const supabase = createAdminClient();

  let query = supabase
    .from('companies')
    .select('id, name, company_type, description, interests, donation_amount, market_cap, csr_rank, contact_name, contact_email, contact_phone, contact_role, website, active')
    .eq('active', true)
    .order('name');

  if (type) {
    query = query.eq('company_type', type);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,contact_name.ilike.%${search}%`);
  }

  const { data: companies, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get company type stats
  const { data: stats } = await supabase
    .from('companies')
    .select('company_type')
    .eq('active', true);

  const typeCounts: Record<string, number> = {};
  for (const row of stats || []) {
    const t = (row as { company_type: string }).company_type || 'other';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return NextResponse.json({
    companies: companies || [],
    total: (stats || []).length,
    typeCounts,
  });
}
