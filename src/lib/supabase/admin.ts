import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('[FATAL] NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!key) {
    throw new Error(
      '[FATAL] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'The admin client requires the service-role key to bypass RLS. ' +
      'Set this environment variable before deploying.'
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
