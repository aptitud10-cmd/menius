import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifies that the currently authenticated user is a MENIUS super-admin.
 * Admin emails are configured via ADMIN_EMAIL env var (comma-separated for multiple admins).
 *
 * @returns `{ supabase, user }` if the user is an admin, or `null` otherwise.
 */
export async function verifyAdmin(): Promise<{ supabase: SupabaseClient; user: { id: string; email?: string } } | null> {
  const adminEmailEnv = process.env.ADMIN_EMAIL;
  if (!adminEmailEnv) return null;

  const adminEmails = adminEmailEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0) return null;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  if (!adminEmails.includes(user.email.toLowerCase())) return null;

  return { supabase, user };
}
