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
    const out = url.pathname + url.search + url.hash;
    // Dot-segments survive the origin check: "/.//evil.com" normalizes to the path
    // "//evil.com", which a browser then resolves as a protocol-relative URL to
    // another host. A real in-app path never starts with two slashes.
    if (out.startsWith('//') || out.startsWith('/\\')) return null;
    return out;
  } catch {
    return null;
  }
}

/** True for requests coming from the MENIUS Counter Android app's WebView. */
export function isCounterAppUserAgent(ua: string | null | undefined): boolean {
  return typeof ua === 'string' && ua.includes('MeniusCounterApp');
}
