import { createClient } from '@supabase/supabase-js';

let warned = false;

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key && !warned) {
    warned = true;
    console.error('[ADMIN] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
