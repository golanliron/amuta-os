'use client';

import ChatPanel from '@/components/chat/ChatPanel';

const DEV_ORG_ID = 'd5f860e8-4958-408c-a00f-679a93f1d470';
const DEV_USER_ID = 'dev-user';

export default function DashboardPage() {
  return (
    <ChatPanel
      orgId={DEV_ORG_ID}
      userId={DEV_USER_ID}
      onStageChange={(stage) => {
        localStorage.setItem('fishgold_stage', String(stage));
      }}
    />
  );
}
