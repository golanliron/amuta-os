'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] max-w-lg mx-auto animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-surf border border-border rounded-2xl p-4 shadow-xl backdrop-blur-lg">
        <div className="flex items-start gap-3">
          <div className="text-xl flex-shrink-0 mt-0.5">🍪</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">האתר משתמש בעוגיות</p>
            <p className="text-xs text-muted leading-relaxed">
              אנחנו משתמשים בעוגיות כדי לשפר את חוויית השימוש באתר.
              המשך השימוש באתר מהווה הסכמה לתנאי{' '}
              <Link href="/privacy" className="text-accent hover:underline">מדיניות הפרטיות</Link>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 mr-8">
          <button
            onClick={accept}
            className="px-5 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-hover transition-all active:scale-95"
          >
            מסכים/ה
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-xs text-muted hover:text-text2 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
