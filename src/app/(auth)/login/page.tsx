'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FishLogo from '@/components/chat/FishLogo';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('מייל או סיסמה שגויים');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <FishLogo size={64} className="mx-auto swim mb-3" />
          <h1 className="text-2xl font-bold">Goldfish</h1>
          <p className="text-sm text-muted mt-1">גייס משאבים עתיק ששוחה במים</p>
        </div>

        {/* Login form */}
        <div className="bg-bg2 rounded-2xl border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="********"
                required
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-xs text-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>

          <p className="text-center text-[10px] text-muted2 mt-4">
            אין לך חשבון?{' '}
            <a href="/signup" className="text-accent hover:underline">הרשמה</a>
          </p>
        </div>
      </div>
    </div>
  );
}
