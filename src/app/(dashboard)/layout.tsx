'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/SplashScreen';
import FishLogo from '@/components/chat/FishLogo';
import SidebarPanel from '@/components/sidebar/SidebarPanel';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import type { AppStage } from '@/types';

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, orgId, loading, signOut } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<AppStage>(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('fishgold_stage');
    if (saved) setStage(Number(saved) as AppStage);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <FishLogo size={48} className="swim opacity-30" />
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="h-screen flex flex-col fade-in">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg2">
        <div className="flex items-center gap-2">
          <FishLogo size={28} />
          <span className="font-semibold text-sm">Fishgold</span>
          <span className="text-xs text-muted hidden sm:inline">| גייס משאבים עתיק</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={signOut}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            התנתקות
          </button>
          <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
            {userInitial}
          </div>
        </div>
      </header>

      {/* Main content: Sidebar (right) + Chat (left) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - right side (RTL) */}
        <aside className="w-[370px] flex-shrink-0 border-l border-border overflow-hidden hidden md:block">
          <SidebarPanel stage={stage} orgId={orgId} />
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
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}
