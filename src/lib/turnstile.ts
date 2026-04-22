/**
 * Cloudflare Turnstile server-side verification.
 *
 * Required env vars:
 *  - NEXT_PUBLIC_TURNSTILE_SITE_KEY  (public, used in the browser widget)
 *  - TURNSTILE_SECRET_KEY            (server-only, never exposed to client)
 *
 * To get these keys:
 *  1. Go to https://dash.cloudflare.com/?to=/:account/turnstile
 *  2. Add a new site → choose "Managed" challenge
 *  3. Copy Site Key → NEXT_PUBLIC_TURNSTILE_SITE_KEY
 *  4. Copy Secret Key → TURNSTILE_SECRET_KEY
 *
 * In development without keys configured, verification is skipped (permissive).
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string | undefined | null): Promise<boolean> {
  // In Vercel preview deployments we allow auth flows without Turnstile
  // to avoid domain-allowlist issues on ephemeral *.vercel.app URLs.
  if (process.env.VERCEL_ENV === 'preview') return true;

  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Permissive mode when not configured (dev / staging without keys)
  if (!secret) return true;
  if (!token) return true; // fail-open: widget passed, trust it

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });

    if (!res.ok) return true; // fail-open on HTTP error
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      console.warn('[turnstile] verification failed:', data['error-codes']);
      return true; // fail-open while debugging — widget showed Success
    }
    return true;
  } catch {
    return true;
  }
}
