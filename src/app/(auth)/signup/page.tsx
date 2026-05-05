'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FishLogo from '@/components/chat/FishLogo';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { org_name: orgName },
      },
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'שגיאה ביצירת חשבון');
      setLoading(false);
      return;
    }

    // 2. Create organization + user record via API
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authData.user.id,
        email,
        org_name: orgName,
      }),
    });

    if (!res.ok) {
      setError('שגיאה ביצירת ארגון');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <FishLogo size={64} className="mx-auto swim mb-3" />
          <h1 className="text-2xl font-bold">הצטרפי ל-Fishgold</h1>
          <p className="text-sm text-muted mt-1">חשבון חינמי. בלי כרטיס אשראי.</p>
        </div>

        <div className="bg-bg2 rounded-2xl border border-border p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">שם הארגון/עמותה</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surf text-sm focus:outline-none focus:border-accent"
                placeholder="שם העמותה שלך"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">מייל</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surf text-sm focus:outline-none focus:border-accent"
                placeholder="your@email.com"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surf text-sm focus:outline-none focus:border-accent"
                placeholder="6 תווים לפחות"
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            {error && <p className="text-xs text-red">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'יוצר חשבון...' : 'צור חשבון חינם'}
            </button>
          </form>

          <p className="text-center text-[10px] text-muted2 mt-4">
            כבר יש לך חשבון?{' '}
            <a href="/login" className="text-accent hover:underline">התחברות</a>
          </p>
        </div>
      </div>
    </div>
  );
}
