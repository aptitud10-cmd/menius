import type { NoteChipRule } from './note-chips';

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
   * Enable natural-language menu search ("algo sin gluten y picante").
   * Falls back to the lexical engine when the query is a plain dish name, so
   * turning this off only removes the intent layer — normal search keeps working.
   * Rollout: enabled per store first, then globally once validated in the field.
   */
  naturalSearch?: boolean;

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

  /**
   * Keep the store out of search engines: noindex,nofollow on the menu page
   * and excluded from sitemap.xml. For stores used as private demos/tests
   * that carry a real business's name (we don't want them showing up when
   * someone searches for that business).
   */
  noindex?: boolean;

  /**
   * Cabecera de los emails al cliente (pedido y marketing): imagen 2x/3x de
   * 440 px de ancho con el letrero del restaurante YA sobre su fondo. Si no
   * hay, el email usa el logo redondo + nombre.
   */
  emailHeaderImageUrl?: string;

  /** Botoncitos bajo "Special instructions": un toque escribe el pedido en la
   *  nota. Para lo ocasional; lo que se pide seguido va como opción. */
  noteChips?: NoteChipRule[];
}

const BURGERS = ['c1000001-0000-0000-0000-000000000014', 'c1000001-0000-0000-0000-000000000015'];
const SANDWICHES = [
  'c1000001-0000-0000-0000-000000000016', // Carving Board
  'c1000001-0000-0000-0000-000000000017', // Classic Fish
  'c1000001-0000-0000-0000-000000000018', // Classic Egg
  'c1000001-0000-0000-0000-000000000019', // Triple Decker Clubs
  'c1000001-0000-0000-0000-000000000022', // Chicken Breast
  'c1000001-0000-0000-0000-000000000023', // Classic Meat
  'c1000001-0000-0000-0000-000000000024', // Classic Cheese
  'c1000001-0000-0000-0000-000000000025', // Signature
];
const EGGS = [
  'c1000001-0000-0000-0000-000000000003', // Farm Fresh Eggs
  'c1000001-0000-0000-0000-000000000004', // Egg Omelettes
  'c1000001-0000-0000-0000-000000000005', // 3 Egg Specialty Omelettes
];
const SALADS = ['c1000001-0000-0000-0000-000000000021'];

const BUCCANEER_NOTE_CHIPS: NoteChipRule[] = [
  // Café y té (no la categoría entera: ahí también están las sodas).
  {
    whenGroup: 'Sugar in it?',
    chips: [
      { en: '1 sugar', es: '1 de azúcar' },
      { en: '3 sugars', es: '3 de azúcar' },
      { en: 'Extra hot', es: 'Bien caliente', hideIfGroups: ['Iced coffee or iced tea'] },
      { en: 'Light milk', es: 'Poca leche' },
    ],
  },
  {
    categoryIds: BURGERS,
    chips: [
      { en: 'Cut in half', es: 'Cortada a la mitad' },
      { en: 'Bun well toasted', es: 'Pan bien tostado' },
      { en: 'Extra pickles', es: 'Pepinillos extra' },
    ],
  },
  {
    categoryIds: SANDWICHES,
    chips: [
      { en: 'Cut in half', es: 'Cortado a la mitad' },
      { en: 'Well toasted', es: 'Bien tostado' },
      { en: 'Extra pickles', es: 'Pepinillos extra' },
    ],
  },
  {
    categoryIds: EGGS,
    chips: [
      { en: 'Extra crispy home fries', es: 'Home fries bien doradas' },
      { en: 'Well done', es: 'Bien cocido' },
    ],
  },
  {
    categoryIds: SALADS,
    chips: [
      { en: 'Chopped', es: 'Picada' },
      // La Caesar ya lo pregunta; BBQ Ranch y Buffalo vienen mezcladas.
      { en: 'Dressing in the salad', es: 'Aderezo mezclado', hideIfGroups: ['in the salad or on the side', 'dressing on the side'] },
    ],
  },
];

const OVERRIDES: Record<string, StoreOverrides> = {
  buccaneer: {
    optimizeImages: true,
    /** Long menu: show “back to top” in the mobile category bar when scrolled. */
    showScrollTop: true,
    /** 408 productos en 47 categorías: el buscador léxico se queda corto ante
     *  pedidos por propiedad ("algo liviano") en vez de por nombre de plato. */
    naturalSearch: true,
    /** Demo privada con el nombre de un negocio real que NO es cliente:
     *  no debe aparecer cuando alguien busca "Buccaneer Diner" en Google. */
    noindex: true,
    /** El letrero del techo de noche (wordmark del sitio, buccaneer-v2). */
    emailHeaderImageUrl: 'https://menius.app/email/buccaneer-header-v1.png',
    noteChips: BUCCANEER_NOTE_CHIPS,
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
