'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppStage, OrgProfileData, Document as FgDoc } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface OrgTabProps {
  stage: AppStage;
  orgId: string | null;
}

const categoryLabels: Record<string, string> = {
  identity: 'זהות הארגון',
  budget: 'תקציב ומספרים',
  project: 'פרויקטים פעילים',
  grant: 'מענקים פעילים',
  submission: 'הגשות קודמות',
  other: 'מסמכים כלליים',
};

export default function OrgTab({ stage, orgId }: OrgTabProps) {
  const [profile, setProfile] = useState<OrgProfileData | null>(null);
  const [documents, setDocuments] = useState<FgDoc[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<OrgProfileData>>({});
  const [uploading, setUploading] = useState(false);
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

  // Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !orgId) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('org_id', orgId);

      try {
        await fetch('/api/upload', { method: 'POST', body: formData });
      } catch {
        // ignore upload errors here
      }
    }

    e.target.value = '';
    setUploading(false);
    loadData();
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

  if (stage === 0 && documents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surf2 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-muted mb-1">עדיין לא העלית מסמכים</p>
        <p className="text-xs text-muted2 mb-4">העלי תקנון, דוחות כספיים, תיאורי פרויקטים</p>
        <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.html" onChange={handleUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          העלאת מסמכים
        </button>
      </div>
    );
  }

  // Group documents by category
  const docsByCategory = documents.reduce<Record<string, FgDoc[]>>((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.html" onChange={handleUpload} />

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
                  <label className="text-muted text-[10px]">מחזור שנתי ₪</label>
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

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-xs text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            מעלה...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            העלאת מסמכים
          </>
        )}
      </button>

      {/* Documents by category */}
      {Object.entries(docsByCategory).map(([category, docs]) => (
        <div key={category} className="slide-in-right">
          <h4 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {categoryLabels[category] || category}
            <span className="text-muted2 font-normal">({docs.length})</span>
          </h4>
          <div className="space-y-1">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surf2 transition-colors text-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted flex-shrink-0">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate">{doc.filename}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
