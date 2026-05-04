'use client';

import ChatPanel from '@/components/chat/ChatPanel';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { orgId, userId } = useAuth();

  return (
    <ChatPanel
      orgId={orgId}
      userId={userId}
      onStageChange={(stage) => {
        localStorage.setItem('fishgold_stage', String(stage));
      }}
    />
  );
}
