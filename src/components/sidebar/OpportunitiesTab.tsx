'use client';

import { useEffect, useState } from 'react';
import type { AppStage, Match } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface OpportunitiesTabProps {
  stage: AppStage;
  orgId: string | null;
}

export default function OpportunitiesTab({ stage, orgId }: OpportunitiesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!orgId || stage < 2) return;
    const supabase = createClient();

    supabase
      .from('matches')
      .select('*, opportunity:opportunities(*)')
      .eq('org_id', orgId)
      .order('score', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setMatches(data as unknown as Match[]);
      });
  }, [orgId, stage]);

  if (stage < 2) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surf2 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="text-sm text-muted mb-1">קולות קוראים עדיין נעולים</p>
        <p className="text-xs text-muted2">
          {stage === 0
            ? 'העלי מסמכים קודם כדי שאדע מה מתאים לך'
            : 'סורק קולות קוראים... זה ייקח רגע'}
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">לא נמצאו קולות קוראים מתאימים כרגע</p>
        <p className="text-xs text-muted2 mt-1">נמשיך לסרוק ונעדכן אותך</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const opp = match.opportunity;
        if (!opp) return null;

        const daysLeft = opp.deadline
          ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
          : null;

        const urgency = daysLeft !== null && daysLeft <= 7 ? 'urgent' :
                       daysLeft !== null && daysLeft <= 14 ? 'soon' : 'normal';

        return (
          <div key={match.id} className="bg-surf rounded-xl border border-border p-3 slide-in-right hover:border-accent/30 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">{opp.title}</h4>
                <p className="text-[10px] text-muted">{opp.source}</p>
              </div>
              {/* Match score */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                match.score >= 80 ? 'bg-green' :
                match.score >= 60 ? 'bg-accent' : 'bg-muted'
              }`}>
                {match.score}%
              </div>
            </div>

            {/* Details */}
            <div className="flex items-center gap-3 text-[10px] text-muted mb-2">
              {opp.amount_max && (
                <span className="flex items-center gap-1">
                  <span className="text-green font-semibold">
                    {opp.amount_max >= 1000000
                      ? `${(opp.amount_max / 1000000).toFixed(1)}M`
                      : `${(opp.amount_max / 1000).toFixed(0)}K`}
                  </span>
                  ש&quot;ח
                </span>
              )}
              {daysLeft !== null && (
                <span className={`flex items-center gap-1 ${
                  urgency === 'urgent' ? 'text-red font-semibold' :
                  urgency === 'soon' ? 'text-amber font-semibold' : ''
                }`}>
                  {daysLeft <= 0 ? 'פג תוקף' : `${daysLeft} ימים`}
                </span>
              )}
            </div>

            {/* Reasoning */}
            {match.reasoning && (
              <p className="text-[10px] text-text2 leading-relaxed mb-2 line-clamp-2">
                {match.reasoning}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-1.5">
              <button className="flex-1 py-1.5 text-[10px] font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                כתוב הגשה
              </button>
              <button className="px-2 py-1.5 text-[10px] text-muted border border-border rounded-lg hover:bg-surf2 transition-colors" title="שלח למייל">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </button>
              <button className="px-2 py-1.5 text-[10px] text-muted border border-border rounded-lg hover:bg-surf2 transition-colors" title="שלח לוואטסאפ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
