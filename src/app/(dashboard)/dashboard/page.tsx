'use client';

import ChatPanel from '@/components/chat/ChatPanel';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { orgId, userId, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ChatPanel
      orgId={orgId || ''}
      userId={userId || ''}
      onStageChange={(stage) => {
        localStorage.setItem('fishgold_stage', String(stage));
      }}
    />
  );
}
