/**
 * Canonical slug for the Buccaneer Diner showcase / large-catalog stress-test tenant.
 * Use this instead of hardcoding 'buccaneer' across TS/TSX so renames stay one place.
 */
export const BUCCANEER_SLUG = 'buccaneer' as const;

export function isBuccaneerSlug(slug: string): boolean {
  return slug === BUCCANEER_SLUG;
}
