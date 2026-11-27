import type { Product } from '@/types';

/**
 * Formato compacto de los platos que la tienda manda al navegador.
 *
 * La página pasa ~400 platos a MenuShell (Buccaneer) y React los serializa en
 * el payload RSC: eran ~390 KB que el celular tiene que decodificar antes de
 * poder responder a un toque (con React 19, todo en una sola tarea larga).
 * La mayoría eran valores vacíos repetidos (null, false, []) y la misma URL de
 * Supabase 412 veces.
 *
 * compactMenuProducts (servidor) quita lo que vale el default y acorta la URL
 * de la foto; expandMenuProducts (MenuShell, primera línea) lo rearma. El resto
 * del código ve exactamente el mismo objeto que antes.
 */

// Valor que tiene el campo cuando no viaja. Solo se omite si es IGUAL a esto,
// así que rearmar es exacto (salvo los 3 campos que la tienda no usa, abajo).
const DEFAULTS = {
  compare_at_price: null,
  is_active: true,
  in_stock: true,
  is_featured: false,
  is_new: false,
  dine_in_only: false,
  hide_image: false,
  available_from: null,
  available_until: null,
  translations: null,
  popularity_rank: null,
  orders_last_7d: 0,
  has_modifiers: false,
  daily_kind: null,
  daily_label: null,
  daily_always: false,
} as const satisfies Partial<Record<keyof Product, unknown>>;

type DefaultKey = keyof typeof DEFAULTS;
const DEFAULT_KEYS = Object.keys(DEFAULTS) as DefaultKey[];

/** Campos que ningún componente de la tienda lee: no viajan. */
type DroppedKey = 'restaurant_id' | 'created_at' | 'prep_time_minutes';

/** Lo que viaja: sin defaults, sin los campos no usados y sin los arrays vacíos del slim pattern. */
export type CompactMenuProduct = Omit<Product, DefaultKey | DroppedKey | 'variants' | 'extras' | 'modifier_groups' | 'dietary_tags'> &
  Partial<Pick<Product, DefaultKey | 'dietary_tags'>>;

const IMG_MARK = 'sb:';
const RESTAURANT_MARK = '@';

function storagePrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, '')}/storage/v1/object/public/product-images/` : null;
}

function compactImage(url: string, restaurantId: string, prefix: string | null): string {
  if (!url || !prefix || !url.startsWith(prefix) || url.startsWith(IMG_MARK)) return url;
  return IMG_MARK + url.slice(prefix.length).split(restaurantId).join(RESTAURANT_MARK);
}

function expandImage(url: string, restaurantId: string, prefix: string | null): string {
  if (!url || !prefix || !url.startsWith(IMG_MARK)) return url;
  return prefix + url.slice(IMG_MARK.length).split(RESTAURANT_MARK).join(restaurantId);
}

export function compactMenuProducts(products: Product[], restaurantId: string): CompactMenuProduct[] {
  const prefix = storagePrefix();
  // Con '@' en el nombre del archivo no se podría rearmar: esa foto viaja entera.
  return products.map((p) => {
    const {
      restaurant_id: _r, created_at: _c, prep_time_minutes: _t,
      variants: _v, extras: _e, modifier_groups: _m,
      ...rest
    } = p;
    const out: Record<string, unknown> = { ...rest };
    for (const k of DEFAULT_KEYS) {
      if (out[k] === DEFAULTS[k] || (DEFAULTS[k] === null && out[k] === undefined)) delete out[k];
    }
    if (Array.isArray(out.dietary_tags) && out.dietary_tags.length === 0) delete out.dietary_tags;
    const img = typeof p.image_url === 'string' ? p.image_url : '';
    if (!img.includes(RESTAURANT_MARK)) out.image_url = compactImage(img, restaurantId, prefix);
    return out as CompactMenuProduct;
  });
}

export function expandMenuProducts(products: ReadonlyArray<CompactMenuProduct | Product>, restaurantId: string): Product[] {
  const prefix = storagePrefix();
  return products.map((c) => {
    const p = c as Partial<Product> & CompactMenuProduct;
    const out = { ...p } as Record<string, unknown>;
    for (const k of DEFAULT_KEYS) if (!(k in out)) out[k] = DEFAULTS[k];
    if (!('dietary_tags' in out)) out.dietary_tags = [];
    if (!('variants' in out)) out.variants = [];
    if (!('extras' in out)) out.extras = [];
    if (!('modifier_groups' in out)) out.modifier_groups = [];
    if (!('restaurant_id' in out)) out.restaurant_id = restaurantId;
    if (!('created_at' in out)) out.created_at = '';
    if (!('prep_time_minutes' in out)) out.prep_time_minutes = null;
    out.image_url = expandImage(p.image_url, restaurantId, prefix);
    return out as unknown as Product;
  });
}
