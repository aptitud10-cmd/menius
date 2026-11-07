/**
 * Resolve a user-supplied "next" path to a same-origin path, or null.
 *
 * Same approach as /auth/callback: resolve against a fixed origin and compare
 * origins instead of pattern-matching the string — "/\evil.com" passes a naive
 * startsWith('/') check but the URL parser turns it into https://evil.com/.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  const base = 'https://menius.invalid';
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** True for requests coming from the MENIUS Counter Android app's WebView. */
export function isCounterAppUserAgent(ua: string | null | undefined): boolean {
  return typeof ua === 'string' && ua.includes('MeniusCounterApp');
}
