'use client';

import { useEffect, useState } from 'react';
import type { AppStage, Match } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface TimelineTabProps {
  stage: AppStage;
  orgId: string | null;
}

interface TimelineEvent {
  id: string;
  title: string;
  source: string;
  deadline: string;
  daysLeft: number;
  score: number;
  status: string;
}

export default function TimelineTab({ stage, orgId }: TimelineTabProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!orgId || stage < 2) return;
    const supabase = createClient();

    supabase
      .from('matches')
      .select('*, opportunity:opportunities(*)')
      .eq('org_id', orgId)
      .not('opportunity.deadline', 'is', null)
      .order('score', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const mapped = (data as unknown as Match[])
          .filter(m => m.opportunity?.deadline)
          .map(m => ({
            id: m.id,
            title: m.opportunity!.title,
            source: m.opportunity!.source,
            deadline: m.opportunity!.deadline!,
            daysLeft: Math.ceil((new Date(m.opportunity!.deadline!).getTime() - Date.now()) / 86400000),
            score: m.score,
            status: m.status,
          }))
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setEvents(mapped);
      });
  }, [orgId, stage]);

  if (stage < 2) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surf2 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className="text-sm text-muted mb-1">לוח זמנים עדיין נעול</p>
        <p className="text-xs text-muted2">יפתח אחרי סריקת קולות קוראים</p>
      </div>
    );
  }

  // Generate calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  // Map deadlines to days
  const deadlineMap = new Map<number, TimelineEvent[]>();
  events.forEach(ev => {
    const d = new Date(ev.deadline);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!deadlineMap.has(day)) deadlineMap.set(day, []);
      deadlineMap.get(day)!.push(ev);
    }
  });

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(new Date(year, month - 1))}
          className="p-1 rounded hover:bg-surf2 text-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold">{monthName}</span>
        <button
          onClick={() => setCurrentMonth(new Date(year, month + 1))}
          className="p-1 rounded hover:bg-surf2 text-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
          <div key={d} className="text-[10px] text-muted2 py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = deadlineMap.get(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div
              key={day}
              className={`relative py-1.5 text-[10px] rounded ${
                isToday ? 'bg-accent text-white font-bold' : ''
              } ${dayEvents ? 'font-semibold' : 'text-muted'}`}
            >
              {day}
              {dayEvents && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className={`w-1 h-1 rounded-full ${
                        ev.daysLeft <= 7 ? 'bg-red' : ev.daysLeft <= 14 ? 'bg-amber' : 'bg-green'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming deadlines list */}
      <div>
        <h4 className="text-xs font-semibold text-muted mb-2">דדליינים קרובים</h4>
        <div className="space-y-2">
          {events
            .filter(ev => ev.daysLeft > 0)
            .slice(0, 8)
            .map(ev => (
              <div key={ev.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surf2 transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  ev.daysLeft <= 7 ? 'bg-red' : ev.daysLeft <= 14 ? 'bg-amber' : 'bg-green'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{ev.title}</p>
                  <p className="text-[9px] text-muted">{ev.source}</p>
                </div>
                <span className={`text-[10px] font-semibold flex-shrink-0 ${
                  ev.daysLeft <= 7 ? 'text-red' : ev.daysLeft <= 14 ? 'text-amber' : 'text-muted'
                }`}>
                  {ev.daysLeft}d
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Google Calendar sync */}
      <button className="w-full py-2 text-[11px] text-muted border border-dashed border-border rounded-lg hover:bg-surf2 transition-colors flex items-center justify-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        סנכרן ל-Google Calendar
      </button>
    </div>
  );
}
