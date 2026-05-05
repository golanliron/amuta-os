import { createClient } from '@supabase/supabase-js';

// Client for the shared grants database (vhmwijzcrqjjquxomccq)
// This is the big grants pool updated daily by the scanner
export function createGrantsClient() {
  return createClient(
    process.env.GRANTS_DB_URL || 'https://vhmwijzcrqjjquxomccq.supabase.co',
    process.env.GRANTS_DB_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobXdpanpjcnFqanF1eG9tY2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Nzk0MDgsImV4cCI6MjA4OTE1NTQwOH0.rMnAcdMiPddUAoap63tMiqeQQanJoF-HDmzra7P-5Cc',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
