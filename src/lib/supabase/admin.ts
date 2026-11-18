import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Next 14 caches every fetch() that doesn't say otherwise ("auto cache",
 * revalidate = forever) unless it can tell the route is dynamic, and it can't
 * tell through supabase-js. `dynamic = 'force-dynamic'` did not stop it: the
 * order tracker kept showing the restaurant's address and logo from the first
 * time it was read (Buccaneer's old "BD" logo weeks after the change), and
 * /api routes cached loyalty and order reads the same way.
 *
 * So reads are fresh by default (`cache: 'no-store'`). Only pages that WANT the
 * cache pass `{ isr: true }`: the menu (revalidate = 300 + revalidatePath on
 * every edit), legal pages, the sitemap and the buccaneer-v2 landing. A no-store
 * fetch inside one of those would turn the ISR page into a dynamic one.
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

export function createAdminClient(opts?: { isr?: boolean }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("[FATAL] NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!key) {
    throw new Error(
      "[FATAL] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "The admin client requires the service-role key to bypass RLS. " +
        "Set this environment variable before deploying.",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(opts?.isr ? {} : { global: { fetch: noStoreFetch } }),
  });
}
