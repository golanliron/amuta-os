import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Quick keyword-based relevance scoring (no AI needed)
function scoreOpportunity(
  opp: Record<string, unknown>,
  orgKeywords: string[],
  orgMission: string
): { score: number; reasoning: string } {
  if (!orgKeywords.length) return { score: 0, reasoning: '' };

  const oppText = [
    String(opp.title || ''),
    String(opp.description || ''),
    String(opp.source_name || ''),
    ...(Array.isArray(opp.categories) ? opp.categories : []),
    ...(Array.isArray(opp.populations) ? opp.populations : []),
  ].join(' ').toLowerCase();

  let score = 0;
  const matchedKeywords: string[] = [];

  // Keyword overlap with org focus areas
  for (const kw of orgKeywords) {
    if (oppText.includes(kw)) {
      score += 15;
      matchedKeywords.push(kw);
    }
  }

  // Mission word overlap
  if (orgMission) {
    const missionWords = orgMission.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const w of missionWords) {
      if (oppText.includes(w)) score += 3;
    }
  }

  // Bonus for high-relevance terms
  const highRelevance = ['נוער', 'צעירים', 'חינוך', 'נשירה', 'סיכון', 'פריפריה', 'רווחה', 'העצמה', 'מלגות', 'ליווי'];
  for (const term of highRelevance) {
    if (orgKeywords.some(k => k.includes(term)) && oppText.includes(term)) {
      score += 5;
    }
  }

  const finalScore = Math.min(100, score);
  const reasoning = matchedKeywords.length > 0
    ? `התאמה בתחומים: ${matchedKeywords.slice(0, 4).join(', ')}`
    : '';

  return { score: finalScore, reasoning };
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const [taxRes, oppRes, matchRes, profileRes] = await Promise.all([
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
    orgId
      ? supabase.from('org_profiles').select('data').eq('org_id', orgId).single()
      : Promise.resolve({ data: null }),
  ]);

  const opportunities = (oppRes.data || []).filter(
    (o: Record<string, unknown>) => !o.deadline || String(o.deadline) >= today
  );

  let matches = matchRes.data || [];

  // If no saved matches but we have a profile, do quick keyword matching
  if (matches.length === 0 && profileRes.data && orgId) {
    const profileData = (profileRes.data as { data: Record<string, unknown> }).data || {};
    const focusAreas = (profileData.focus_areas as string[]) || [];
    const mission = (profileData.mission as string) || '';
    const regions = (profileData.regions as string[]) || [];
    const orgKeywords = [...focusAreas, ...regions]
      .map(s => String(s).toLowerCase())
      .filter(s => s.length > 2);

    if (orgKeywords.length > 0) {
      const scored = opportunities
        .map(opp => {
          const { score, reasoning } = scoreOpportunity(opp, orgKeywords, mission);
          return { opportunity_id: String(opp.id), score, reasoning };
        })
        .filter(m => m.score >= 20)
        .sort((a, b) => b.score - a.score);

      matches = scored;
    }
  }

  return NextResponse.json({
    taxonomy: taxRes.data || [],
    opportunities,
    matches,
  });
}
