'use client';

import { useState } from 'react';
import type { SidebarTab, AppStage } from '@/types';
import OrgTab from './OrgTab';
import OpportunitiesTab from './OpportunitiesTab';
import TimelineTab from './TimelineTab';

interface SidebarPanelProps {
  stage: AppStage;
  orgId: string | null;
}

const tabs: { id: SidebarTab; label: string; icon: string }[] = [
  { id: 'org', label: 'העמותה', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'opportunities', label: 'קולות קוראים', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'timeline', label: 'לוח זמנים', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

export default function SidebarPanel({ stage, orgId }: SidebarPanelProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('org');

  return (
    <div className="flex flex-col h-full bg-bg2 border-r border-border">
      {/* Tab buttons */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const isLocked = tab.id === 'opportunities' && stage < 2 ||
                          tab.id === 'timeline' && stage < 2;

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative
                ${activeTab === tab.id ? 'text-accent' : 'text-muted hover:text-text'}
                ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
              {isLocked && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="absolute top-1 left-1">
                  <path d="M12 17a2 2 0 002-2v-2a2 2 0 00-4 0v2a2 2 0 002 2zm6-6V9A6 6 0 006 9v2a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2zM8 9a4 4 0 018 0v2H8V9z" />
                </svg>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'org' && <OrgTab stage={stage} orgId={orgId} />}
        {activeTab === 'opportunities' && <OpportunitiesTab stage={stage} orgId={orgId} />}
        {activeTab === 'timeline' && <TimelineTab stage={stage} orgId={orgId} />}
      </div>
    </div>
  );
}
