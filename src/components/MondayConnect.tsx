'use client';

import { useState, useEffect } from 'react';
import { getMondayStatus, disconnectMonday, type MondayConnectionStatus } from '@/lib/monday';

export default function MondayConnect() {
  const [status, setStatus] = useState<MondayConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMondayStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async () => {
    await disconnectMonday();
    setStatus({ connected: false });
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-surf animate-pulse">
        <div className="h-5 w-32 bg-border rounded" />
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Monday.com מחובר</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-muted hover:text-red transition-colors"
          >
            נתק
          </button>
        </div>
        {status.monday_user_name && (
          <p className="text-xs text-muted mt-1">{status.monday_user_name}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-surf">
      <p className="text-sm text-muted mb-3">חבר את חשבון Monday.com שלך כדי לסנכרן בורדים</p>
      <a
        href="/api/monday/authorize"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6161FF] text-white text-sm font-medium hover:bg-[#4e4ecc] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="18" r="3" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        התחבר ל-Monday.com
      </a>
    </div>
  );
}
