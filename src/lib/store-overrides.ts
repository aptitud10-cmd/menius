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

  /**
   * Defines the layout mode for the store's public menu page.
   * - "default": The standard grid layout for multiple products (Uber Eats style).
   * - "high_conversion": Optimized for single, high-ticket, emotional buying products.
   *                      Removes grids, focuses on large visuals and direct CTAs.
   */
  layout_mode?: "default" | "high_conversion";

  /**
   * For 'high_conversion' mode: Specifies the ID of the product to feature prominently
   * in the hero and featured product sections.
   */
  heroProductId?: string;

  /**
   * For 'high_conversion' mode: Specifies a list of product IDs to be displayed
   * as selectable pack options.
   */
  packProductIds?: string[];
}

const OVERRIDES: Record<string, StoreOverrides> = {
  buccaneer: {
    optimizeImages: true,
    /** Long menu: show “back to top” in the mobile category bar when scrolled. */
    showScrollTop: true,
  },
  // Configuración para el nuevo modo de alta conversión (ejemplo)
  // ¡Recuerda reemplazar los IDs de producto con IDs reales de tu base de datos!
  'demo-lechona-store': {
    layout_mode: 'high_conversion',
    heroProductId: '00000000-0000-0000-0000-000000000001', // ID de un producto principal de tu BD
    packProductIds: [
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
    ], // IDs de los productos que serán opciones de paquetes
  },
};

export function getStoreOverrides(slug: string): StoreOverrides {
  return OVERRIDES[slug] ?? {};
}
