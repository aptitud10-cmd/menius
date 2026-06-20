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

  // Fail-CLOSED: the front always attaches a token. Its absence means the
  // request bypassed the widget (e.g. a script hitting the server action
  // directly) — reject it.
  if (!token) {
    console.warn('[turnstile] missing token — rejecting');
    return false;
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });

    // Fail-OPEN only on Cloudflare being unreachable / erroring — so a CF
    // outage never locks out legitimate users. A definitive "this is a bot"
    // verdict (success:false) is fail-CLOSED below.
    if (!res.ok) {
      console.warn('[turnstile] CF returned HTTP', res.status, '— allowing (fail-open on outage)');
      return true;
    }
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      console.warn('[turnstile] verification failed:', data['error-codes']);
      return false; // fail-CLOSED: CF says this is not a human → block
    }
    return true;
  } catch (err) {
    // Network/parse failure → treat as CF outage, fail-open.
    console.warn('[turnstile] verify threw — allowing (fail-open on outage):', err);
    return true;
  }
}
