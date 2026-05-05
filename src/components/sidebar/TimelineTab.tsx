'use client';

import { useEffect, useState, useMemo } from 'react';
import type { AppStage } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface TimelineTabProps {
  stage: AppStage;
  orgId: string | null;
}

interface DeadlineItem {
  id: string;
  title: string;
  funder: string | null;
  deadline: string;
  daysLeft: number;
  type: string | null;
  url: string | null;
}

function buildGoogleCalendarUrl(item: DeadlineItem): string {
  const d = new Date(item.deadline);
  const dateStr = d.toISOString().replace(/[-:]/g, '').split('T')[0];
  // All-day event: next day as end
  const nextDay = new Date(d);
  nextDay.setDate(nextDay.getDate() + 1);
  const endStr = nextDay.toISOString().replace(/[-:]/g, '').split('T')[0];

  const title = encodeURIComponent(`דדליין: ${item.title}`);
  const details = encodeURIComponent(
    `קול קורא: ${item.title}\n` +
    (item.funder ? `מממן: ${item.funder}\n` : '') +
    (item.url ? `קישור: ${item.url}\n` : '') +
    '\n— Fishgold'
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${endStr}&details=${details}`;
}

export default function TimelineTab({ stage, orgId }: TimelineTabProps) {
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('opportunities')
      .select('id, title, funder, deadline, type, url')
      .eq('active', true)
      .not('deadline', 'is', null)
      .gte('deadline', new Date().toISOString().split('T')[0])
      .order('deadline', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setItems(
            data.map(d => ({
              ...d,
              daysLeft: Math.ceil(
                (new Date(d.deadline!).getTime() - Date.now()) / 86400000
              ),
            })) as DeadlineItem[]
          );
        }
        setLoading(false);
      });
  }, []);

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });

  // Map deadlines to calendar days
  const deadlineMap = useMemo(() => {
    const map = new Map<number, DeadlineItem[]>();
    items.forEach(item => {
      const d = new Date(item.deadline);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(item);
      }
    });
    return map;
  }, [items, month, year]);

  // Upcoming items (next 30 days)
  const upcoming = useMemo(
    () => items.filter(i => i.daysLeft <= 30).slice(0, 10),
    [items]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayItems = deadlineMap.get(day);
          const today = new Date();
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={day}
              className={`relative py-1.5 text-[10px] rounded cursor-default ${
                isToday ? 'bg-accent text-white font-bold' : ''
              } ${dayItems ? 'font-semibold' : 'text-muted'}`}
              title={dayItems ? `${dayItems.length} דדליינים` : undefined}
            >
              {day}
              {dayItems && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayItems.slice(0, 3).map((item, j) => (
                    <span
                      key={j}
                      className={`w-1 h-1 rounded-full ${
                        item.daysLeft <= 7
                          ? 'bg-red-500'
                          : item.daysLeft <= 14
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> 7 ימים
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> 14 ימים
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> מעל 14
        </span>
        <span className="mr-auto font-medium">{items.length} דדליינים פתוחים</span>
      </div>

      {/* Google Calendar sync */}
      {upcoming.length > 0 && (
        <button
          onClick={() => {
            // Open all upcoming deadlines in Google Calendar (first 5)
            upcoming.slice(0, 5).forEach((item, i) => {
              setTimeout(() => {
                window.open(buildGoogleCalendarUrl(item), '_blank');
              }, i * 500);
            });
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-border hover:border-accent/30 hover:bg-surf2 transition-all text-[11px] font-medium text-text2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="#4285F4" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4" />
            <path d="M9.5 14l2 2 3.5-3.5" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          סנכרון ליומן גוגל ({Math.min(upcoming.length, 5)} דדליינים)
        </button>
      )}

      {/* Upcoming deadlines */}
      <div>
        <h4 className="text-xs font-semibold text-muted mb-2">דדליינים קרובים</h4>
        <div className="space-y-1.5">
          {upcoming.length === 0 ? (
            <p className="text-[11px] text-muted2 text-center py-4">אין דדליינים בחודש הקרוב</p>
          ) : (
            upcoming.map(item => {
              const inner = (
                <>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.daysLeft <= 7
                        ? 'bg-red-500'
                        : item.daysLeft <= 14
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{item.title}</p>
                    {item.funder && (
                      <p className="text-[9px] text-muted truncate">{item.funder}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-left">
                    <span
                      className={`text-[10px] font-semibold ${
                        item.daysLeft <= 7
                          ? 'text-red-500'
                          : item.daysLeft <= 14
                          ? 'text-amber-500'
                          : 'text-muted'
                      }`}
                    >
                      {item.daysLeft} ימים
                    </span>
                    <p className="text-[9px] text-muted2">
                      {new Date(item.deadline).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </>
              );

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-surf2 transition-colors"
                >
                  {inner}
                  {/* Add to Google Calendar */}
                  <a
                    href={buildGoogleCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 rounded hover:bg-accent/10 transition-colors"
                    title="הוסף ליומן גוגל"
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" />
                      <line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" />
                      <line x1="12" y1="14" x2="12" y2="18" stroke="#34A853" strokeWidth="2" strokeLinecap="round" />
                      <line x1="10" y1="16" x2="14" y2="16" stroke="#34A853" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </a>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1 rounded hover:bg-accent/10 transition-colors"
                      title="פתח קול קורא"
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
