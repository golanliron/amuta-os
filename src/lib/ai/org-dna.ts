// Org DNA — Smart classification of any organization based on profile + documents
// Used for matching against grants, companies, and opportunities

export interface OrgDNA {
  // Who the org serves (specific populations)
  populations: string[];
  // What domain/field they work in
  domains: string[];
  // Geographic focus
  geography: string[];
  // Age groups served
  ageGroups: string[];
  // Organization type/size
  orgType: 'small' | 'medium' | 'large';
  // Key themes (extracted from mission + docs)
  themes: string[];
  // Anti-match: populations/domains the org does NOT serve
  excludePopulations: string[];
  excludeDomains: string[];
}

// ===== Population Detection =====

const POPULATION_PATTERNS: { key: string; label: string; patterns: RegExp }[] = [
  { key: 'youth_at_risk', label: 'נוער בסיכון', patterns: /נוער.{0,5}סיכון|צעירים.{0,5}סיכון|נשירה|נושרים|מנותקים/ },
  { key: 'youth', label: 'נוער', patterns: /נוער|בני נוער|נערים|נערות|תיכון/ },
  { key: 'young_adults', label: 'צעירים', patterns: /צעירים|בוגרים צעירים|גיל 18|גיל 26|צעירי|דור צעיר/ },
  { key: 'children', label: 'ילדים', patterns: /ילדים|ילדות|גן|יסודי|גיל הרך/ },
  { key: 'disabilities', label: 'אנשים עם מוגבלות', patterns: /מוגבלות|מוגבלויות|נכות|נכים|שיקום|אוטיזם|אוטיסט|התפתחותי|מיוחד/ },
  { key: 'elderly', label: 'קשישים', patterns: /קשישים|זקנים|גיל הזהב|גיל שלישי|סיעודי/ },
  { key: 'immigrants', label: 'עולים', patterns: /עולים|עלייה|קליטה|יוצאי אתיופיה|אתיופים/ },
  { key: 'arab', label: 'חברה ערבית', patterns: /ערבי|ערבים|בדואי|בדואים|דרוזי|מגזר ערבי|חברה ערבית/ },
  { key: 'haredi', label: 'חרדים', patterns: /חרדי|חרדים|חרדית|אולטרא.?אורתודוקס/ },
  { key: 'women', label: 'נשים', patterns: /נשים|בנות|מגדר|פמיניז|אלמנות|חד הורי/ },
  { key: 'soldiers', label: 'חיילים/משוחררים', patterns: /חיילים|משוחררים|צבא|צה"ל|שירות.{0,5}(לאומי|צבאי)|גיוס/ },
  { key: 'homeless', label: 'חסרי בית', patterns: /חסרי בית|דרי רחוב|מחוסרי דיור/ },
  { key: 'addiction', label: 'התמכרויות', patterns: /התמכרות|סמים|אלכוהול|גמילה/ },
  { key: 'lgbtq', label: 'להט"ב', patterns: /להט"?ב|גאווה|טרנס|הומו|לסבי/ },
  { key: 'refugees', label: 'פליטים/מבקשי מקלט', patterns: /פליטים|מבקשי מקלט|מהגרים/ },
  { key: 'prisoners', label: 'אסירים/משוחררים', patterns: /אסירים|כלואים|משוחררי כלא|שב"ס/ },
  { key: 'general', label: 'אוכלוסייה כללית', patterns: /אוכלוסייה כללית|כלל הציבור|חברה ישראלית/ },
];

// ===== Domain Detection =====

const DOMAIN_PATTERNS: { key: string; label: string; patterns: RegExp }[] = [
  { key: 'education', label: 'חינוך', patterns: /חינוך|לימוד|הוראה|בית ספר|אקדמי|השכלה|מלגות|בגרות/ },
  { key: 'dropout_prevention', label: 'מניעת נשירה', patterns: /נשירה|מניעת נשירה|נושרים|מנותקים|שימור/ },
  { key: 'welfare', label: 'רווחה', patterns: /רווחה|סיוע|ליווי|העצמה|חוסן|שיקום חברתי/ },
  { key: 'employment', label: 'תעסוקה', patterns: /תעסוקה|עבודה|הכשרה מקצועית|קריירה|יזמות|הכנסה/ },
  { key: 'health', label: 'בריאות', patterns: /בריאות|רפואה|נפשי|טיפול|פסיכולוג|רפואי|קליני/ },
  { key: 'mental_health', label: 'בריאות הנפש', patterns: /בריאות הנפש|נפשי|פסיכולוג|חרדה|דיכאון|טראומה/ },
  { key: 'culture', label: 'תרבות ואמנות', patterns: /תרבות|אמנות|מוזיקה|תיאטרון|קולנוע|ספרות|יצירה/ },
  { key: 'environment', label: 'סביבה', patterns: /סביבה|אקולוגי|ירוק|קיימות|מיחזור|אקלים/ },
  { key: 'technology', label: 'טכנולוגיה', patterns: /טכנולוגי|דיגיטל|הייטק|תוכנה|מחשב|סייבר|AI/ },
  { key: 'agriculture', label: 'חקלאות', patterns: /חקלאות|חקלאי|גידול|משק|יער/ },
  { key: 'coexistence', label: 'דו-קיום', patterns: /דו.?קיום|שותפות|ערבים.{0,5}יהודים|חברה משותפת/ },
  { key: 'housing', label: 'דיור', patterns: /דיור|שכירות|מגורים|בינוי|נדל"ן|שיכון/ },
  { key: 'sport', label: 'ספורט', patterns: /ספורט|כדורגל|כדורסל|פעילות גופנית|אתלטיקה/ },
  { key: 'community', label: 'קהילה', patterns: /קהילה|קהילתי|שכונה|מתנ"ס|מרכז קהילתי/ },
  { key: 'legal', label: 'משפטי', patterns: /משפטי|זכויות|ייצוג|פרקליט|סיוע משפטי/ },
  { key: 'science', label: 'מדע ומחקר', patterns: /מדע|מחקר|אקדמי|מעבדה|פטנט/ },
  { key: 'religion', label: 'דת', patterns: /דת|דתי|יהדות|תורה|בית כנסת|רבנות/ },
  { key: 'infrastructure', label: 'תשתיות', patterns: /תשתית|בינוי|שיפוץ|הקמה|מבנה/ },
];

// ===== Geography Detection =====

const GEO_PATTERNS: { key: string; label: string; patterns: RegExp }[] = [
  { key: 'negev', label: 'נגב', patterns: /נגב|באר שבע|ערד|דימונה|רהט|ירוחם|מצפה רמון|שגב.?שלום/ },
  { key: 'galilee', label: 'גליל', patterns: /גליל|צפת|כרמיאל|עכו|נהריה|מעלות|קריית שמונה/ },
  { key: 'periphery', label: 'פריפריה', patterns: /פריפריה|שולי|מרוחק|עוטף|קו עימות|גבול/ },
  { key: 'center', label: 'מרכז', patterns: /מרכז|תל אביב|גוש דן|רמת גן|פתח תקווה|חולון|בת ים/ },
  { key: 'jerusalem', label: 'ירושלים', patterns: /ירושלים/ },
  { key: 'haifa', label: 'חיפה', patterns: /חיפה|קריות/ },
  { key: 'national', label: 'ארצי', patterns: /ארצי|ברחבי הארץ|כלל ארצי|פריסה ארצית/ },
  { key: 'international', label: 'בינלאומי', patterns: /בינלאומי|חו"ל|אירופ|אמריק|גלובל/ },
];

// ===== Age Group Detection =====

const AGE_PATTERNS: { key: string; label: string; patterns: RegExp }[] = [
  { key: '0-6', label: 'גיל הרך (0-6)', patterns: /גיל הרך|גן|פעוט|תינוק|0.?6/ },
  { key: '6-12', label: 'ילדים (6-12)', patterns: /יסודי|ילדים|6.?12/ },
  { key: '12-18', label: 'נוער (12-18)', patterns: /נוער|תיכון|12.?18|14.?18|בני נוער/ },
  { key: '18-26', label: 'צעירים (18-26)', patterns: /צעירים|18.?26|בוגרים צעירים|סטודנט/ },
  { key: '26-65', label: 'מבוגרים (26-65)', patterns: /מבוגרים|בוגרים|26.?65/ },
  { key: '65+', label: 'גיל שלישי (65+)', patterns: /קשישים|זקנים|65\+|גיל שלישי/ },
];

// ===== Main DNA Extraction =====

export function extractOrgDNA(
  profile: Record<string, unknown> | null,
  docTexts?: string[]
): OrgDNA {
  // Combine all text sources
  const textParts: string[] = [];

  if (profile) {
    if (profile.mission) textParts.push(String(profile.mission));
    if (profile.name) textParts.push(String(profile.name));
    if (Array.isArray(profile.focus_areas)) textParts.push((profile.focus_areas as string[]).join(' '));
    if (Array.isArray(profile.regions)) textParts.push((profile.regions as string[]).join(' '));
    if (Array.isArray(profile.active_projects)) {
      for (const proj of profile.active_projects as { name?: string; description?: string }[]) {
        if (proj?.name) textParts.push(proj.name);
        if (proj?.description) textParts.push(proj.description);
      }
    }
    if (Array.isArray(profile.key_achievements)) textParts.push((profile.key_achievements as string[]).join(' '));
    if (profile.summary) textParts.push(String(profile.summary));
  }

  if (docTexts) {
    textParts.push(...docTexts);
  }

  const fullText = textParts.join(' ').toLowerCase();

  // Extract populations
  const populations = POPULATION_PATTERNS
    .filter(p => p.patterns.test(fullText))
    .map(p => p.key);

  // Extract domains
  const domains = DOMAIN_PATTERNS
    .filter(d => d.patterns.test(fullText))
    .map(d => d.key);

  // Extract geography
  const geography = GEO_PATTERNS
    .filter(g => g.patterns.test(fullText))
    .map(g => g.key);

  // Extract age groups
  const ageGroups = AGE_PATTERNS
    .filter(a => a.patterns.test(fullText))
    .map(a => a.key);

  // Org size
  const budget = Number(profile?.annual_budget) || 0;
  const employees = Number(profile?.employees_count) || 0;
  const orgType: OrgDNA['orgType'] =
    budget > 5_000_000 || employees > 50 ? 'large' :
    budget > 500_000 || employees > 10 ? 'medium' : 'small';

  // Build themes (more specific than domains)
  const themes: string[] = [];
  if (/מניעת נשירה|מנותק|נושר/.test(fullText)) themes.push('dropout_prevention');
  if (/מלגות|מלגה/.test(fullText)) themes.push('scholarships');
  if (/רדאר|זיהוי מוקדם|איתור/.test(fullText)) themes.push('early_detection');
  if (/ליווי אישי|מנטור|חונכ/.test(fullText)) themes.push('mentoring');
  if (/טכנולוגי|דיגיטל|אפליקצי/.test(fullText)) themes.push('tech_enabled');
  if (/פנימיי/.test(fullText)) themes.push('residential');
  if (/קרקס|אומנ|מוזיקה|תיאטרון/.test(fullText)) themes.push('arts_therapy');
  if (/ספורט|כדורגל/.test(fullText)) themes.push('sports');
  if (/יזמות|סטארט/.test(fullText)) themes.push('entrepreneurship');
  if (/שפה|אנגלית|עברית/.test(fullText)) themes.push('language');
  if (/הורים|משפחה/.test(fullText)) themes.push('family');

  // Build exclude lists — populations the org clearly doesn't serve
  const allPopKeys = POPULATION_PATTERNS.map(p => p.key);
  const excludePopulations = allPopKeys.filter(pk => {
    // Only exclude if the org has clear populations AND this one is not among them
    if (populations.length < 2) return false; // Not enough info to exclude
    return !populations.includes(pk);
  });

  // Only exclude domains we're confident about
  const excludeDomains: string[] = [];
  if (domains.length >= 2) {
    // If org clearly does education + welfare, exclude unrelated domains
    const unrelatedDomains = ['agriculture', 'environment', 'science', 'infrastructure', 'housing'];
    for (const d of unrelatedDomains) {
      if (!domains.includes(d)) excludeDomains.push(d);
    }
  }

  return {
    populations,
    domains,
    geography,
    ageGroups,
    orgType,
    themes,
    excludePopulations,
    excludeDomains,
  };
}

// ===== Matching Score =====

export function scoreDNAMatch(
  orgDna: OrgDNA,
  oppCategories: string[],
  oppPopulations: string[],
  oppTitle: string,
  oppDescription?: string
): { score: number; reasoning: string; isNegativeMatch: boolean } {
  const oppText = `${oppTitle} ${oppDescription || ''}`.toLowerCase();

  let score = 0;
  const reasons: string[] = [];
  let isNegativeMatch = false;

  // 1. NEGATIVE MATCH CHECK — critical, do first
  // Check if the opportunity targets a population the org doesn't serve
  for (const pop of POPULATION_PATTERNS) {
    if (pop.patterns.test(oppText) && orgDna.excludePopulations.includes(pop.key) && !orgDna.populations.includes(pop.key)) {
      // The opportunity is for a population the org doesn't serve
      isNegativeMatch = true;
      reasons.push(`לא מתאים: מיועד ל${pop.label} והארגון לא עובד עם אוכלוסייה זו`);
      return { score: Math.min(score, 15), reasoning: reasons.join('. '), isNegativeMatch: true };
    }
  }

  // 2. Population match (30 points max)
  const oppDetectedPops = POPULATION_PATTERNS.filter(p => p.patterns.test(oppText)).map(p => p.key);
  const popOverlap = oppDetectedPops.filter(p => orgDna.populations.includes(p));
  if (popOverlap.length > 0) {
    score += Math.min(30, popOverlap.length * 15);
    const popLabels = popOverlap.map(k => POPULATION_PATTERNS.find(p => p.key === k)?.label || k);
    reasons.push(`אוכלוסייה: ${popLabels.join(', ')}`);
  } else if (oppDetectedPops.length > 0 && orgDna.populations.length > 0) {
    // Opportunity targets specific populations that don't match org
    score -= 10;
  }

  // 3. Domain match (30 points max)
  const oppDetectedDomains = DOMAIN_PATTERNS.filter(d => d.patterns.test(oppText)).map(d => d.key);
  const catOverlap = [
    ...oppCategories.filter(c => orgDna.domains.includes(c)),
    ...oppDetectedDomains.filter(d => orgDna.domains.includes(d)),
  ];
  const uniqueCatOverlap = [...new Set(catOverlap)];
  if (uniqueCatOverlap.length > 0) {
    score += Math.min(30, uniqueCatOverlap.length * 12);
    const domainLabels = uniqueCatOverlap.map(k => DOMAIN_PATTERNS.find(d => d.key === k)?.label || k);
    reasons.push(`תחום: ${domainLabels.join(', ')}`);
  }

  // 4. Geography match (20 points max)
  const oppDetectedGeo = GEO_PATTERNS.filter(g => g.patterns.test(oppText)).map(g => g.key);
  const geoOverlap = oppDetectedGeo.filter(g => orgDna.geography.includes(g));
  if (geoOverlap.length > 0) {
    score += Math.min(20, geoOverlap.length * 10);
    const geoLabels = geoOverlap.map(k => GEO_PATTERNS.find(g => g.key === k)?.label || k);
    reasons.push(`אזור: ${geoLabels.join(', ')}`);
  } else if (orgDna.geography.includes('national')) {
    score += 5; // National orgs get small geo bonus
  }

  // 5. Age group match (10 points)
  const oppDetectedAges = AGE_PATTERNS.filter(a => a.patterns.test(oppText)).map(a => a.key);
  const ageOverlap = oppDetectedAges.filter(a => orgDna.ageGroups.includes(a));
  if (ageOverlap.length > 0) {
    score += 10;
  } else if (oppDetectedAges.length > 0 && orgDna.ageGroups.length > 0) {
    // Age mismatch
    score -= 5;
    reasons.push(`גיל: לא תואם (${oppDetectedAges.join(', ')} vs ${orgDna.ageGroups.join(', ')})`);
  }

  // 6. Theme match bonus (10 points)
  for (const theme of orgDna.themes) {
    if (oppText.includes(theme.replace(/_/g, ' ')) || oppText.includes(theme)) {
      score += 5;
    }
  }

  // Clamp to 0-100
  const finalScore = Math.max(0, Math.min(100, score));
  const reasoning = reasons.length > 0 ? reasons.join('. ') : 'אין חפיפה ברורה';

  return { score: finalScore, reasoning, isNegativeMatch };
}

// ===== Helper: Format DNA for display =====

export function formatDNAForPrompt(dna: OrgDNA): string {
  const parts: string[] = ['[DNA ארגוני]'];

  if (dna.populations.length > 0) {
    const labels = dna.populations.map(k => POPULATION_PATTERNS.find(p => p.key === k)?.label || k);
    parts.push(`אוכלוסיות: ${labels.join(', ')}`);
  }
  if (dna.domains.length > 0) {
    const labels = dna.domains.map(k => DOMAIN_PATTERNS.find(d => d.key === k)?.label || k);
    parts.push(`תחומים: ${labels.join(', ')}`);
  }
  if (dna.geography.length > 0) {
    const labels = dna.geography.map(k => GEO_PATTERNS.find(g => g.key === k)?.label || k);
    parts.push(`גיאוגרפיה: ${labels.join(', ')}`);
  }
  if (dna.ageGroups.length > 0) {
    const labels = dna.ageGroups.map(k => AGE_PATTERNS.find(a => a.key === k)?.label || k);
    parts.push(`קבוצות גיל: ${labels.join(', ')}`);
  }
  parts.push(`גודל ארגון: ${dna.orgType}`);
  if (dna.themes.length > 0) {
    parts.push(`נושאי ליבה: ${dna.themes.join(', ')}`);
  }
  if (dna.excludePopulations.length > 0) {
    const labels = dna.excludePopulations.slice(0, 5).map(k => POPULATION_PATTERNS.find(p => p.key === k)?.label || k);
    parts.push(`לא עובד עם: ${labels.join(', ')}`);
  }

  return parts.join('\n');
}
