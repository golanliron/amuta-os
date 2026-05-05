'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import FishLogo from '@/components/chat/FishLogo';
import Link from 'next/link';
import SidebarPanel from '@/components/sidebar/SidebarPanel';
import type { AppStage } from '@/types';

// Dev mode - skip auth entirely
const DEV_ORG_ID = 'd5f860e8-4958-408c-a00f-679a93f1d470';
const DEV_USER_ID = 'dev-user';

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<AppStage>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fishgold_stage');
    if (saved) setStage(Number(saved) as AppStage);

    // Listen for sidebar close events (from "כתוב הגשה" button)
    const closeSidebar = () => setSidebarOpen(false);
    window.addEventListener('fishgold:closeSidebar', closeSidebar);
    return () => window.removeEventListener('fishgold:closeSidebar', closeSidebar);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="h-screen flex flex-col fade-in">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg2">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <FishLogo size={28} />
          <span className="font-semibold text-sm">Fishgold</span>
          <span className="text-xs text-muted hidden sm:inline">| גייס משאבים עתיק</span>
        </Link>
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-surf2 text-muted transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
            ל
          </div>
        </div>
      </header>

      {/* Main content: Sidebar (right) + Chat (left) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - right side (RTL) */}
        <aside
          className={`
            w-[370px] flex-shrink-0 border-l border-border overflow-hidden bg-bg2
            md:block
            ${sidebarOpen
              ? 'fixed inset-y-0 right-0 z-50 top-[49px] shadow-xl'
              : 'hidden'
            }
          `}
        >
          <SidebarPanel stage={stage} orgId={DEV_ORG_ID} />
        </aside>

        {/* Chat - fills remaining space */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
