import { createClient } from '@supabase/supabase-js';

// Admin client for API routes - uses anon key with permissive RLS policies
// Note: sb_secret_ format keys don't work with supabase-js (requires JWT format)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
