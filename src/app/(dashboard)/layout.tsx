'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import FishLogo from '@/components/chat/FishLogo';
import Link from 'next/link';
import SidebarPanel from '@/components/sidebar/SidebarPanel';
import type { AppStage, SidebarTab } from '@/types';

// Dev mode - skip auth entirely
const DEV_ORG_ID = 'd5f860e8-4958-408c-a00f-679a93f1d470';
const DEV_USER_ID = 'dev-user';

const MOBILE_TABS: { id: 'chat' | SidebarTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'צ\'אט', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { id: 'opportunities', label: 'קולות קוראים', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'org', label: 'העמותה', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'timeline', label: 'לו"ז', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'history', label: 'היסטוריה', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<AppStage>(0);
  const [mobileTab, setMobileTab] = useState<'chat' | SidebarTab>('chat');

  // Broadcast active tab so ChatPanel can update placeholder
  const switchTab = (tab: 'chat' | SidebarTab) => {
    setMobileTab(tab);
    window.dispatchEvent(new CustomEvent('fishgold:activeTab', { detail: tab }));
  };

  useEffect(() => {
    const saved = localStorage.getItem('fishgold_stage');
    if (saved) setStage(Number(saved) as AppStage);

    const closeSidebar = () => switchTab('chat');
    window.addEventListener('fishgold:closeSidebar', closeSidebar);
    return () => window.removeEventListener('fishgold:closeSidebar', closeSidebar);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="h-screen flex flex-col fade-in">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg2 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <FishLogo size={28} />
          <span className="font-semibold text-sm">Fishgold</span>
          <span className="text-xs text-muted hidden sm:inline">| דג זהב עתיק שדג מענקים מהמים</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
            ל
          </div>
        </div>
      </header>

      {/* Desktop: Sidebar + Chat side by side */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Sidebar - right side (RTL) */}
        <aside className="w-[370px] flex-shrink-0 border-l border-border overflow-hidden bg-bg2">
          <SidebarPanel stage={stage} orgId={DEV_ORG_ID} />
        </aside>
        {/* Chat */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Mobile: Full screen tabs */}
      <div className="flex-1 md:hidden overflow-hidden flex flex-col">
        {/* Tab content area */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'chat' ? (
            <main className="h-full overflow-hidden">
              {children}
            </main>
          ) : (
            <div className="h-full overflow-y-auto bg-bg2">
              <SidebarPanel stage={stage} orgId={DEV_ORG_ID} initialTab={mobileTab as SidebarTab} />
            </div>
          )}
        </div>

        {/* Bottom tab bar - app style */}
        <nav className="flex-shrink-0 bg-bg2 border-t border-border safe-area-bottom">
          <div className="flex">
            {MOBILE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative
                  ${mobileTab === tab.id ? 'text-accent' : 'text-muted'}
                `}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                </svg>
                <span className="text-[9px] font-medium">{tab.label}</span>
                {mobileTab === tab.id && (
                  <span className="absolute top-0 inset-x-3 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
