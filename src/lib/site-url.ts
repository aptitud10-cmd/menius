/**
 * Canonical base URL for MENIUS.
 *
 * NEXT_PUBLIC_APP_URL has historically been set in Vercel with a trailing
 * slash, which produced double-slash URLs (https://menius.app//blog) across
 * the sitemap, robots.txt and og:image. Those URLs answer 308 instead of 200,
 * so Google spends crawl budget on redirects rather than on the pages.
 *
 * Import SITE_URL / url() instead of reading the env var directly so the
 * normalization can't be forgotten at a new call site.
 */

/** Base origin, never with a trailing slash. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://menius.app"
)
  .trim()
  .replace(/\/+$/, "");

/**
 * Absolute URL for a path, collapsing any duplicate slashes at the join.
 * url() → origin, url('/blog') → origin + '/blog'.
 */
export function url(path = ""): string {
  const clean = path.trim().replace(/^\/+/, "");
  return clean ? `${SITE_URL}/${clean}` : SITE_URL;
}
