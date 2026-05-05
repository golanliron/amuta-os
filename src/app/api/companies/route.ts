import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Keyword-based relevance scoring for companies
function scoreCompany(
  company: { description: string | null; interests: string[] | null; company_type: string },
  orgKeywords: string[],
  orgMission: string
): number {
  if (!orgKeywords.length) return 0;

  const companyText = [
    ...(company.interests || []),
    company.description || '',
  ].join(' ').toLowerCase();

  let score = 0;

  // Keyword overlap with org focus areas
  for (const kw of orgKeywords) {
    if (companyText.includes(kw)) score += 15;
  }

  // Israel-specific keywords boost
  const israelKeywords = ['ישראל', 'israel', 'חינוך', 'נוער', 'צעירים', 'רווחה', 'קהילה', 'פריפריה', 'סיכון', 'נשירה'];
  for (const kw of israelKeywords) {
    if (companyText.includes(kw)) score += 5;
  }

  // Mission overlap
  if (orgMission) {
    const missionWords = orgMission.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const w of missionWords) {
      if (companyText.includes(w)) score += 3;
    }
  }

  // Fund type bonus (more likely to give grants)
  if (company.company_type === 'fund') score += 10;

  // Penalize if no description and no interests (we know nothing about them)
  if (!company.description && (!company.interests || company.interests.length === 0)) {
    score = Math.max(0, score - 20);
  }

  return Math.min(100, score);
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const search = req.nextUrl.searchParams.get('search') || '';
  const type = req.nextUrl.searchParams.get('type') || '';
  const matchedOnly = req.nextUrl.searchParams.get('matched') === 'true';
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

  // Load more when we need to score & filter
  const { data: companies, error } = await query.limit(matchedOnly ? 954 : 200);

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

  // If org_id provided, score and sort by relevance
  let scored = companies || [];
  let matchedCount = 0;

  if (orgId) {
    const { data: profile } = await supabase
      .from('org_profiles')
      .select('data')
      .eq('org_id', orgId)
      .single();

    const profileData = (profile?.data as Record<string, unknown>) || {};
    const focusAreas = (profileData.focus_areas as string[]) || [];
    const mission = (profileData.mission as string) || '';
    const regions = (profileData.regions as string[]) || [];
    const orgKeywords = [...focusAreas, ...regions]
      .map(s => s.toLowerCase())
      .filter(s => s.length > 2);

    if (orgKeywords.length > 0) {
      const withScores = scored.map(c => ({
        ...c,
        relevance_score: scoreCompany(c, orgKeywords, mission),
      }));

      // Sort by relevance
      withScores.sort((a, b) => b.relevance_score - a.relevance_score);
      matchedCount = withScores.filter(c => c.relevance_score >= 20).length;

      if (matchedOnly) {
        scored = withScores.filter(c => c.relevance_score >= 20).slice(0, 200);
      } else {
        scored = withScores.slice(0, 200);
      }
    }
  }

  return NextResponse.json({
    companies: scored,
    total: (stats || []).length,
    typeCounts,
    matchedCount,
  });
}
