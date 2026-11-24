/**
 * Carga desde la base lo que necesitan los emails de marketing por
 * comportamiento (lib/marketing/emails) y los arma por cliente.
 *
 * Columnas verificadas en supabase/schema.sql (regla 11 de CLAUDE.md).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { MarketingDish, LifecycleEmailInput } from './emails';
import type { LifecycleKind } from './lifecycle';

type Db = ReturnType<typeof createAdminClient>;

export const MARKETING_RESTAURANT_SELECT =
  'id, name, slug, address, phone, email, logo_url, brand_color, currency, timezone, locale, tags, is_active, notifications_enabled';

export interface MarketingRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  brand_color: string | null;
  currency: string | null;
  timezone: string | null;
  locale: string | null;
  tags: unknown;
  is_active: boolean | null;
  notifications_enabled: boolean | null;
}

// Un reply-to inválido hace que Resend rechace el email entero (422).
const EMAIL_RE = /^[^\s@,;/<>"]+@[^\s@,;/<>"]+\.[a-z]{2,}$/i;
export const validEmail = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && EMAIL_RE.test(s) ? s : null;
};

export function restaurantForEmail(r: MarketingRestaurant): LifecycleEmailInput['restaurant'] {
  return {
    name: r.name,
    address: r.address?.trim() || null,
    phone: r.phone?.trim() || null,
    logoUrl: r.logo_url || null,
    timezone: r.timezone || null,
    brandColor: r.brand_color || null,
    currency: r.currency || 'USD',
    canReply: !!validEmail(r.email),
  };
}

interface ProductRow {
  id: string;
  name: string;
  price: number | string | null;
  image_url: string | null;
  hide_image: boolean | null;
  created_at: string | null;
}

export interface PickPool {
  popular: ProductRow[];
  newest: ProductRow[];
}

const hasPhoto = (p: { image_url: string | null; hide_image: boolean | null }) => !!p.image_url && !p.hide_image;

/** Candidatos a sugerencia del restaurante (una vez por corrida). */
export async function loadPickPool(db: Db, restaurantId: string): Promise<PickPool> {
  const base = () =>
    db
      .from('products')
      .select('id, name, price, image_url, hide_image, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .neq('in_stock', false)
      .eq('hide_image', false)
      .neq('image_url', '')
      .is('daily_kind', null);
  const [{ data: popular }, { data: newest }] = await Promise.all([
    base().not('popularity_rank', 'is', null).order('popularity_rank', { ascending: true }).limit(24),
    base().order('created_at', { ascending: false }).limit(24),
  ]);
  return {
    popular: ((popular ?? []) as ProductRow[]).filter(hasPhoto),
    newest: ((newest ?? []) as ProductRow[]).filter(hasPhoto),
  };
}

const toDish = (p: ProductRow): MarketingDish => ({
  name: p.name,
  price: p.price != null ? Number(p.price) : null,
  imageUrl: p.image_url || null,
});

/**
 * Hasta 3 sugerencias que el cliente no pidió nunca. En "te extrañamos",
 * si hay al menos 2 platos nuevos desde su último pedido, van esos.
 */
export function choosePicks(
  pool: PickPool,
  kind: LifecycleKind,
  orderedProductIds: Set<string>,
  lastOrderAt: string | null,
): { picks: MarketingDish[]; picksAreNew: boolean } {
  const fresh = (p: ProductRow) => !orderedProductIds.has(p.id);
  if (kind === 'winback' && lastOrderAt) {
    const since = Date.parse(lastOrderAt);
    const news = pool.newest.filter((p) => fresh(p) && p.created_at && Date.parse(p.created_at) > since);
    if (news.length >= 2) return { picks: news.slice(0, 3).map(toDish), picksAreNew: true };
  }
  if (kind === 'usual') return { picks: [], picksAreNew: false };
  return { picks: pool.popular.filter(fresh).slice(0, 3).map(toDish), picksAreNew: false };
}

export interface OrderItemRow {
  order_id: string;
  product_id: string;
  qty: number;
  line_total: number | string | null;
  product_name: string | null;
  products: { name: string; image_url: string | null; hide_image: boolean | null; price: number | string | null } | null;
}

/** Líneas del último pedido + el plato con foto que lo representa. */
export function summarizeOrder(items: OrderItemRow[]): {
  lastItems: { qty: number; name: string }[];
  heroDish: MarketingDish | null;
} {
  // Mismo plato en dos líneas (con distintas opciones) → una línea con la suma.
  const byProduct = new Map<string, { qty: number; name: string; total: number; row: OrderItemRow }>();
  for (const it of items) {
    const name = (it.product_name || it.products?.name || '').trim();
    if (!name) continue;
    const prev = byProduct.get(it.product_id);
    const qty = Number(it.qty) || 1;
    const total = Number(it.line_total) || 0;
    if (prev) {
      prev.qty += qty;
      prev.total += total;
    } else {
      byProduct.set(it.product_id, { qty, name, total, row: it });
    }
  }
  const lines = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  const withPhoto = lines.find((l) => l.row.products && hasPhoto(l.row.products));
  return {
    lastItems: lines.map((l) => ({ qty: l.qty, name: l.name })),
    heroDish: withPhoto?.row.products
      ? { name: withPhoto.name, price: null, imageUrl: withPhoto.row.products.image_url }
      : null,
  };
}
