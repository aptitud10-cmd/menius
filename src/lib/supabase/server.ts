import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { noStoreFetch } from "./admin";

/**
 * Cliente autenticado con un JWT Bearer (app nativa / Authorization header).
 * Las queries respetan las RLS policies del usuario dueño del token.
 */
export function createClientFromToken(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Fresh reads: Next would otherwise cache them forever (see admin.ts).
      global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: noStoreFetch },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server component: no puede escribir cookies; el middleware renueva la sesión.
          }
        },
      },
    },
  );
}
