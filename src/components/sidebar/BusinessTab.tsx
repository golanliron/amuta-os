'use client';

import { useEffect, useState, useMemo } from 'react';

interface Company {
  id: string;
  name: string;
  company_type: string;
  description: string | null;
  interests: string[] | null;
  donation_amount: number | null;
  market_cap: number | null;
  csr_rank: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  website: string | null;
  active: boolean;
  relevance_score?: number;
}

const TYPE_LABELS: Record<string, string> = {
  fund: 'קרן',
  public: 'ציבורית',
  private: 'פרטית',
  business: 'עסק',
};

const TYPE_COLORS: Record<string, string> = {
  fund: 'bg-emerald-100 text-emerald-700',
  public: 'bg-blue-100 text-blue-700',
  private: 'bg-purple-100 text-purple-700',
  business: 'bg-amber-100 text-amber-700',
};

const TYPE_ICONS: Record<string, string> = {
  fund: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  public: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  private: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  business: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
};

interface BusinessTabProps {
  stage?: number;
  orgId?: string | null;
}

export default function BusinessTab({ orgId }: BusinessTabProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [matchedOnly, setMatchedOnly] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, [selectedType, matchedOnly, orgId]);

  const loadCompanies = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedType) params.set('type', selectedType);
    if (search) params.set('search', search);
    if (orgId) params.set('org_id', orgId);
    if (matchedOnly && orgId) params.set('matched', 'true');

    try {
      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
      setMatchedCount(data.matchedCount || 0);
      setTypeCounts(data.typeCounts || {});
    } catch {
      // ignore
    }
    setLoading(false);
  };

  // Client-side search filtering (for instant feedback)
  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.interests?.some((i) => i.toLowerCase().includes(q))
    );
  }, [companies, search]);

  const handleAskFishgold = (company: Company) => {
    const typeLabel = TYPE_LABELS[company.company_type] || company.company_type;
    const parts = [
      `[חברה מהמאגר שלך — השתמש במידע הזה!]`,
      `שם: ${company.name}`,
      `סוג: ${typeLabel}`,
    ];
    if (company.description) parts.push(`תיאור: ${company.description}`);
    if (company.interests?.length) parts.push(`תחומי עניין: ${company.interests.join(', ')}`);
    if (company.contact_name) parts.push(`איש קשר: ${company.contact_name}${company.contact_role ? ` (${company.contact_role})` : ''}`);
    if (company.contact_email) parts.push(`מייל: ${company.contact_email}`);
    if (company.contact_phone) parts.push(`טלפון: ${company.contact_phone}`);
    if (company.website) parts.push(`אתר: ${company.website}`);
    if (company.donation_amount) parts.push(`סכום תרומות: ${formatAmount(company.donation_amount)} ש"ח`);
    if (company.csr_rank) parts.push(`דירוג CSR: #${company.csr_rank}`);
    parts.push(`\nנתח את החברה הזאת. למי הם תורמים? למה שווה לפנות אליהם? מה החיבור לארגון שלנו? תציע דרך פנייה.`);
    window.dispatchEvent(new CustomEvent('fishgold:send', { detail: parts.join('\n') }));
    window.dispatchEvent(new CustomEvent('fishgold:closeSidebar'));
  };

  const handleDraftEmail = (company: Company) => {
    const prompt = `תנסח מייל פנייה מקצועי ומשכנע ל${company.name}${company.contact_name ? ` (${company.contact_name}${company.contact_role ? `, ${company.contact_role}` : ''})` : ''}. המייל צריך להיות בסגנון Fishgold — חד, מקצועי, עם נתונים. תציע שותפות/תרומה על בסיס תחומי העניין שלהם${company.interests?.length ? `: ${company.interests.join(', ')}` : ''}.`;
    window.dispatchEvent(new CustomEvent('fishgold:send', { detail: prompt }));
    window.dispatchEvent(new CustomEvent('fishgold:closeSidebar'));
  };

  const activeFilters = [selectedType].filter(Boolean).length;

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        {/* Stats banner */}
        <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-[12px] font-bold text-text">
                {total} חברות וארגונים
              </span>
            </div>
            {matchedCount > 0 && (
              <span className="text-[10px] text-accent font-medium">
                {matchedCount} מותאמים
              </span>
            )}
          </div>
          {/* Matched / All toggle */}
          {orgId && (
            <div className="flex rounded-lg border border-border overflow-hidden mb-1.5">
              <button
                onClick={() => setMatchedOnly(true)}
                className={`flex-1 text-[10px] py-1 font-medium transition-colors ${
                  matchedOnly ? 'bg-accent text-white' : 'bg-surf text-muted hover:text-text'
                }`}
              >
                מותאמים לארגון ({matchedCount})
              </button>
              <button
                onClick={() => setMatchedOnly(false)}
                className={`flex-1 text-[10px] py-1 font-medium transition-colors ${
                  !matchedOnly ? 'bg-accent text-white' : 'bg-surf text-muted hover:text-text'
                }`}
              >
                כל החברות ({total})
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? '' : type)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-accent text-white'
                    : 'bg-surf2 text-muted hover:text-text'
                }`}
              >
                {TYPE_LABELS[type] || type} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="חיפוש חברה, קרן, איש קשר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs bg-surf2 border border-border rounded-lg focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">
            {filtered.length} מתוך {total}
          </span>
          {selectedType && (
            <button
              onClick={() => setSelectedType('')}
              className="text-[10px] text-accent hover:underline"
            >
              נקה סינון
            </button>
          )}
        </div>
      </div>

      {/* Companies list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted">לא נמצאו תוצאות</p>
            <p className="text-xs text-muted2 mt-1">נסו לשנות את החיפוש</p>
          </div>
        ) : (
          filtered.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onAskFishgold={handleAskFishgold}
              onDraftEmail={handleDraftEmail}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  onAskFishgold,
  onDraftEmail,
}: {
  company: Company;
  onAskFishgold: (c: Company) => void;
  onDraftEmail: (c: Company) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = TYPE_COLORS[company.company_type] || 'bg-gray-100 text-gray-600';
  const typeLabel = TYPE_LABELS[company.company_type] || company.company_type;

  return (
    <div
      className="bg-surf rounded-xl border border-border p-3 hover:border-accent/30 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-[13px] font-semibold leading-snug flex-1 min-w-0 line-clamp-2">
          {company.name}
        </h4>
        <span
          className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${typeColor}`}
        >
          {typeLabel}
        </span>
      </div>

      {/* Contact name + role */}
      {company.contact_name && (
        <p className="text-[11px] text-muted mb-1">
          {company.contact_name}
          {company.contact_role ? ` · ${company.contact_role}` : ''}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[10px] mb-1.5">
        {company.donation_amount && company.donation_amount > 0 && (
          <span className="text-green-600 font-medium">
            {formatAmount(company.donation_amount)} ש&quot;ח תרומות
          </span>
        )}
        {company.csr_rank && company.csr_rank > 0 && (
          <span className="text-accent font-medium">CSR #{company.csr_rank}</span>
        )}
      </div>

      {/* Interests tags */}
      {company.interests && company.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {company.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="text-[9px] px-1.5 py-0.5 bg-surf2 text-muted rounded-md"
            >
              {interest}
            </span>
          ))}
          {company.interests.length > 3 && (
            <span className="text-[9px] text-muted">
              +{company.interests.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-border space-y-2 text-[11px]">
          {company.description && (
            <p className="text-text2 leading-relaxed">{company.description}</p>
          )}

          {/* Contact info */}
          <div className="space-y-1">
            {company.contact_email && (
              <div className="flex items-center gap-1.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted flex-shrink-0"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a
                  href={`mailto:${company.contact_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:underline truncate"
                  dir="ltr"
                >
                  {company.contact_email}
                </a>
              </div>
            )}
            {company.contact_phone && (
              <div className="flex items-center gap-1.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted flex-shrink-0"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                <a
                  href={`tel:${company.contact_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:underline"
                  dir="ltr"
                >
                  {company.contact_phone}
                </a>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-1.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:underline truncate"
                  dir="ltr"
                >
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* All interests when expanded */}
          {company.interests && company.interests.length > 3 && (
            <div className="flex flex-wrap gap-1">
              <span className="font-medium text-text ml-1">תחומי עניין:</span>
              {company.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-md"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAskFishgold(company);
              }}
              className="flex-1 py-1.5 text-[10px] font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              שאל את Fishgold
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDraftEmail(company);
              }}
              className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded-lg hover:bg-surf2 transition-colors flex items-center justify-center gap-1"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              נסח מייל
            </button>
          </div>

          {/* Direct contact buttons */}
          {(company.contact_email || company.contact_phone) && (
            <div className="flex gap-1.5">
              {company.contact_email && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDraftEmail(company);
                  }}
                  className="flex-1 py-1.5 text-[10px] font-medium text-center border border-border rounded-lg hover:bg-surf2 transition-colors flex items-center justify-center gap-1"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  שלח מייל
                </button>
              )}
              {company.contact_phone && /^0?5\d/.test(company.contact_phone.replace(/[^0-9]/g, '')) && (
                <a
                  href={`https://wa.me/${company.contact_phone.replace(/[^0-9+]/g, '').replace(/^0/, '972')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-1.5 text-[10px] font-medium text-center border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  </svg>
                  וואטסאפ
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('he-IL');
}
