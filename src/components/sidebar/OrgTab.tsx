'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppStage, OrgProfileData, Document as FgDoc } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface OrgTabProps {
  stage: AppStage;
  orgId: string | null;
}

// ===== Document Knowledge Categories =====
// Each category tells Fishgold what kind of knowledge it has about the org

interface DocCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  examples: string;
  whyNeeded: string;
}

const DOC_CATEGORIES: DocCategory[] = [
  {
    key: 'identity',
    label: 'היכרות עמותה',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    examples: 'תקנון, מצגת היכרות, חזון ומשימה',
    whyNeeded: 'Fishgold צריך להכיר את העמותה כדי לכתוב על מי אתם',
  },
  {
    key: 'programs',
    label: 'תוכניות עמותה',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    examples: 'תיאורי תוכניות, מודל הפעלה, קהלי יעד',
    whyNeeded: 'בלי זה Fishgold לא יודע מה העמותה עושה בפועל',
  },
  {
    key: 'budget',
    label: 'תקציב עמותה',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    examples: 'דוח כספי שנתי, מאזן, תקציב מאושר',
    whyNeeded: 'קרנות דורשות נתונים כספיים — בלי זה אין הגשה',
  },
  {
    key: 'project_budget',
    label: 'תקציב פרויקט',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    examples: 'פירוט תקציבי לפרויקט, הצעת מחיר, עלויות',
    whyNeeded: 'כל הגשה צריכה טבלת תקציב מפורטת',
  },
  {
    key: 'impact',
    label: 'אימפקט ארגון',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    examples: 'דוח אימפקט, סקרים, מדדי הצלחה, עדויות',
    whyNeeded: 'הנתונים שמראים שמה שאתם עושים — עובד',
  },
  {
    key: 'submission',
    label: 'הגשות קודמות',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    examples: 'בקשות מענק שהגשתם, מכתבי בקשה, דוחות לקרנות',
    whyNeeded: 'Fishgold לומד מהסגנון שלכם וכותב בהתאם',
  },
];

export default function OrgTab({ stage, orgId }: OrgTabProps) {
  const [profile, setProfile] = useState<OrgProfileData | null>(null);
  const [documents, setDocuments] = useState<FgDoc[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<OrgProfileData>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [savingText, setSavingText] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [connectingDrive, setConnectingDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    if (!orgId) return;
    const supabase = createClient();

    supabase
      .from('org_profiles')
      .select('data')
      .eq('org_id', orgId)
      .single()
      .then(({ data }) => {
        if (data?.data) setProfile(data.data as OrgProfileData);
      });

    supabase
      .from('documents')
      .select('*')
      .eq('org_id', orgId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data as FgDoc[]);
      });
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  // Upload handler with category
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !orgId) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('org_id', orgId);
      if (uploadCategory) formData.append('category', uploadCategory);

      try {
        await fetch('/api/upload', { method: 'POST', body: formData });
      } catch {
        // ignore upload errors here
      }
    }

    e.target.value = '';
    setUploading(false);
    setUploadCategory(null);
    loadData();
  };

  const triggerUpload = (categoryKey: string) => {
    setUploadCategory(categoryKey);
    fileInputRef.current?.click();
  };

  // Save profile edits
  const saveProfile = async () => {
    if (!orgId) return;
    const supabase = createClient();
    const merged = { ...profile, ...editData };

    await supabase.from('org_profiles').upsert({
      org_id: orgId,
      data: merged,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'org_id' });

    setProfile(merged as OrgProfileData);
    setEditing(false);
  };

  // Group documents by category
  const docsByCategory = documents.reduce<Record<string, FgDoc[]>>((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  // Calculate completeness
  const filledCategories = DOC_CATEGORIES.filter(c => (docsByCategory[c.key]?.length || 0) > 0);
  const completeness = Math.round((filledCategories.length / DOC_CATEGORIES.length) * 100);

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.html,.pptx" onChange={handleUpload} />

      {/* Org identity card */}
      {profile?.name && (
        <div className="bg-surf rounded-xl border border-border p-4 slide-in-right">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm">{editing ? (
              <input
                type="text"
                defaultValue={profile.name}
                onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-border rounded-md bg-surf2 focus:border-accent focus:outline-none"
              />
            ) : profile.name}</h3>
            <button
              onClick={() => {
                if (editing) { saveProfile(); } else { setEditing(true); setEditData({}); }
              }}
              className="text-[10px] text-accent hover:underline flex-shrink-0"
            >
              {editing ? 'שמור' : 'עריכה'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-muted text-[10px]">מטרה</label>
                <textarea
                  defaultValue={profile.mission || ''}
                  onChange={e => setEditData(d => ({ ...d, mission: e.target.value }))}
                  className="w-full px-2 py-1 border border-border rounded-md bg-surf2 focus:border-accent focus:outline-none text-xs resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted text-[10px]">מחזור שנתי</label>
                  <input
                    type="number"
                    defaultValue={profile.annual_budget || ''}
                    onChange={e => setEditData(d => ({ ...d, annual_budget: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border border-border rounded-md bg-surf2 focus:border-accent focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted text-[10px]">מוטבים</label>
                  <input
                    type="number"
                    defaultValue={profile.beneficiaries_count || ''}
                    onChange={e => setEditData(d => ({ ...d, beneficiaries_count: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border border-border rounded-md bg-surf2 focus:border-accent focus:outline-none text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-muted text-[10px]">ע.ר.</label>
                <input
                  type="text"
                  defaultValue={profile.registration_number || ''}
                  onChange={e => setEditData(d => ({ ...d, registration_number: e.target.value }))}
                  className="w-full px-2 py-1 border border-border rounded-md bg-surf2 focus:border-accent focus:outline-none text-xs"
                />
              </div>
              <button
                onClick={() => { setEditing(false); setEditData({}); }}
                className="text-[10px] text-muted hover:text-text"
              >
                ביטול
              </button>
            </div>
          ) : (
            <>
              {profile.registration_number && (
                <p className="text-xs text-muted">ע.ר. {profile.registration_number}</p>
              )}
              {profile.mission && (
                <p className="text-xs text-text2 mt-2 leading-relaxed">{profile.mission}</p>
              )}

              {/* Key numbers */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {profile.annual_budget && (
                  <div className="bg-surf2 rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold text-accent">
                      {(profile.annual_budget / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[10px] text-muted">מחזור שנתי</div>
                  </div>
                )}
                {profile.beneficiaries_count && (
                  <div className="bg-surf2 rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold text-accent">
                      {profile.beneficiaries_count.toLocaleString('he-IL')}
                    </div>
                    <div className="text-[10px] text-muted">מוטבים</div>
                  </div>
                )}
                {profile.employees_count && (
                  <div className="bg-surf2 rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold text-accent">{profile.employees_count}</div>
                    <div className="text-[10px] text-muted">עובדים</div>
                  </div>
                )}
              </div>

              {/* Focus areas */}
              {profile.focus_areas && profile.focus_areas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {profile.focus_areas.map((area, i) => (
                    <span key={i} className="px-2 py-0.5 bg-accent-light text-accent text-[10px] rounded-full font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Knowledge completeness bar */}
      <div className="bg-surf rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold">מה Fishgold יודע עליכם</h4>
          <span className={`text-[11px] font-bold ${
            completeness >= 80 ? 'text-green-600' : completeness >= 40 ? 'text-amber-600' : 'text-red-500'
          }`}>
            {completeness}%
          </span>
        </div>
        <div className="h-1.5 bg-surf2 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completeness}%`,
              background: completeness >= 80 ? '#22C55E' : completeness >= 40 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
        <p className="text-[10px] text-muted2">
          {completeness >= 80
            ? 'מצוין! Fishgold מכיר את הארגון לעומק ויכתוב הגשות מדויקות.'
            : completeness >= 40
            ? 'טוב. ככל שתעלו יותר מסמכים — ההגשות יהיו מדויקות יותר.'
            : 'העלו מסמכים כדי שFishgold יכיר את הארגון ויוכל לכתוב הגשות.'}
        </p>
      </div>

      {/* Quick text description */}
      <div className="rounded-xl border border-border bg-surf p-3">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent flex-shrink-0">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <h4 className="text-xs font-semibold">ספרו על הארגון בטקסט חופשי</h4>
        </div>
        <p className="text-[10px] text-muted2 mb-2">
          הדביקו תיאור, העתיקו מהאתר, או פשוט כתבו — Fishgold ילמד מזה.
        </p>
        <textarea
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          placeholder="לדוגמה: אנחנו עמותה שעוסקת בחינוך לנוער בסיכון בפריפריה, פועלים ב-5 ערים, 200 מוטבים..."
          className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-bg resize-none focus:border-accent focus:outline-none placeholder:text-muted2"
          rows={3}
          dir="rtl"
        />
        {freeText.trim().length > 0 && (
          <button
            onClick={async () => {
              if (!orgId || !freeText.trim()) return;
              setSavingText(true);
              try {
                await fetch('/api/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    org_id: orgId,
                    text: freeText.trim(),
                    category: 'identity',
                    filename: 'תיאור חופשי.txt',
                  }),
                });
                setFreeText('');
                loadData();
              } catch {}
              setSavingText(false);
            }}
            disabled={savingText}
            className="mt-2 w-full py-1.5 text-[11px] font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {savingText ? 'שומר...' : 'שמור — Fishgold ילמד את זה'}
          </button>
        )}
      </div>

      {/* Google Drive link */}
      <div className="rounded-xl border border-dashed border-border bg-bg p-3">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M7.71 3.5L1.15 15l3.43 6h6.56" stroke="#4285F4" strokeWidth="1.5" />
            <path d="M16.29 3.5H7.71l5.15 9h8.57" stroke="#0F9D58" strokeWidth="1.5" />
            <path d="M21.43 12.5l-3.43 6H5.14l3.43-6" stroke="#F4B400" strokeWidth="1.5" />
          </svg>
          <h4 className="text-xs font-semibold">חיבור Google Drive</h4>
        </div>
        <p className="text-[10px] text-muted2 mb-2">
          הדביקו קישור לתיקיית Drive משותפת — Fishgold יקרא את המסמכים משם.
        </p>
        <div className="flex gap-1.5">
          <input
            type="url"
            value={driveUrl}
            onChange={e => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="flex-1 px-2.5 py-1.5 text-[11px] border border-border rounded-lg bg-surf focus:border-accent focus:outline-none"
            dir="ltr"
          />
          <button
            onClick={async () => {
              if (!orgId || !driveUrl.trim()) return;
              setConnectingDrive(true);
              try {
                await fetch('/api/drive/connect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ org_id: orgId, drive_url: driveUrl.trim() }),
                });
                setDriveUrl('');
                loadData();
              } catch {}
              setConnectingDrive(false);
            }}
            disabled={connectingDrive || !driveUrl.trim()}
            className="px-3 py-1.5 text-[11px] font-medium bg-surf2 border border-border rounded-lg hover:border-accent/30 transition-colors disabled:opacity-50"
          >
            {connectingDrive ? '...' : 'חבר'}
          </button>
        </div>
      </div>

      {/* Document categories */}
      {DOC_CATEGORIES.map(cat => {
        const docs = docsByCategory[cat.key] || [];
        const isEmpty = docs.length === 0;

        return (
          <div
            key={cat.key}
            className={`rounded-xl border p-3 transition-colors ${
              isEmpty ? 'border-dashed border-border bg-bg' : 'border-border bg-surf'
            }`}
          >
            {/* Category header */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex-shrink-0 ${isEmpty ? 'text-muted2' : 'text-accent'}`}>
                {cat.icon}
              </div>
              <h4 className={`text-xs font-semibold flex-1 ${isEmpty ? 'text-muted' : 'text-text'}`}>
                {cat.label}
              </h4>
              {!isEmpty && (
                <span className="text-[10px] text-muted2 bg-surf2 px-1.5 py-0.5 rounded-md">
                  {docs.length}
                </span>
              )}
              <button
                onClick={() => triggerUpload(cat.key)}
                disabled={uploading}
                className="text-[10px] text-accent hover:underline flex-shrink-0 disabled:opacity-50"
              >
                {uploading && uploadCategory === cat.key ? (
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
            </div>

            {isEmpty ? (
              /* Empty state - show what's needed */
              <div className="mr-6">
                <p className="text-[10px] text-muted2 mb-1">{cat.whyNeeded}</p>
                <p className="text-[10px] text-muted2 italic">לדוגמה: {cat.examples}</p>
              </div>
            ) : (
              /* Document list */
              <div className="mr-6 space-y-0.5">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-surf2 transition-colors text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted2 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="truncate text-[11px]">{doc.filename}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Other/uncategorized documents */}
      {docsByCategory['other'] && docsByCategory['other'].length > 0 && (
        <div className="rounded-xl border border-border bg-surf p-3">
          <h4 className="text-xs font-semibold text-muted mb-1.5 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            מסמכים כלליים
            <span className="text-[10px] text-muted2 bg-surf2 px-1.5 py-0.5 rounded-md font-normal">
              {docsByCategory['other'].length}
            </span>
          </h4>
          <div className="mr-6 space-y-0.5">
            {docsByCategory['other'].map(doc => (
              <div key={doc.id} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-surf2 transition-colors text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted2 flex-shrink-0">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate text-[11px]">{doc.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
