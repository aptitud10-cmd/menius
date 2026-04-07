/**
 * Per-store UI overrides.
 *
 * Add a slug entry here to activate specific optimizations or behaviour
 * for one store without affecting any other. Changes take effect after deploy.
 *
 * To add a new override for a store:
 *   1. Add its slug key below.
 *   2. Set the relevant flags.
 *   3. Deploy — no DB migration required.
 */

export interface StoreOverrides {
  /**
   * Enable Next.js image optimization for Supabase storage images.
   * Requires *.supabase.co in next.config.js remotePatterns (already configured).
   * Recommended for stores with large catalogs (50+ products with images).
   */
  optimizeImages?: boolean;

  /**
   * Show a "Volver arriba" button in the mobile pills bar.
   * Useful for very long menus.
   */
  showScrollTop?: boolean;
}

const OVERRIDES: Record<string, StoreOverrides> = {
  buccaneer: {
    optimizeImages: true,
  },
};

export function getStoreOverrides(slug: string): StoreOverrides {
  return OVERRIDES[slug] ?? {};
}
