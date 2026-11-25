import type { SupabaseClient } from '@supabase/supabase-js';
import { isSale, SALE_FIELDS } from '@/lib/sales';
import { fetchAllRows } from '@/lib/supabase/fetch-all';

export interface SaleRow {
  total: number | string | null;
  restaurant_id: string;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
}

/**
 * Every order since `since` that counts as a sale (lib/sales.ts), across all
 * restaurants or one. Reads page by page, so a busy month is not cut at the
 * 1000-row response cap.
 */
export async function fetchSalesSince(
  db: SupabaseClient,
  since: string,
  restaurantId?: string,
): Promise<{ rows: SaleRow[]; error: string | null }> {
  const { rows, error } = await fetchAllRows<SaleRow>((from, to) => {
    let q = db
      .from('orders')
      .select(`total, restaurant_id, ${SALE_FIELDS}`)
      .not('status', 'in', '(pending,cancelled)')
      .gte('created_at', since);
    if (restaurantId) q = q.eq('restaurant_id', restaurantId);
    return q.order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to);
  });
  return { rows: rows.filter(isSale), error };
}

export interface ProductSales {
  name: string | null;
  /** Units sold (sum of order_items.qty). */
  qty: number;
  /** Sum of order_items.line_total. */
  revenue: number;
}

type OrderSaleFields = Pick<SaleRow, 'status' | 'payment_method' | 'payment_status'>;

interface ProductSaleItemRow {
  id: string;
  product_id: string | null;
  qty: number | null;
  line_total: number | string | null;
  products: { name: string | null } | { name: string | null }[] | null;
  order: OrderSaleFields | OrderSaleFields[] | null;
}

/**
 * Units and revenue per product for one restaurant, counting only orders that
 * are a sale (lib/sales.ts). Joins orders instead of sending a list of order
 * ids (that list overflowed the URL on a busy month) and reads every page.
 */
export async function fetchProductSales(
  db: SupabaseClient,
  restaurantId: string,
  since: string,
  until?: string,
): Promise<{ byProduct: Map<string, ProductSales>; error: string | null }> {
  const { rows, error } = await fetchAllRows<ProductSaleItemRow>((from, to) => {
    let q = db
      .from('order_items')
      .select('id, product_id, qty, line_total, products(name), order:orders!inner(restaurant_id, created_at, status, payment_method, payment_status)')
      .eq('order.restaurant_id', restaurantId)
      .not('order.status', 'in', '(pending,cancelled)')
      .gte('order.created_at', since);
    if (until) q = q.lt('order.created_at', until);
    return q.order('id', { ascending: true }).range(from, to);
  });

  const byProduct = new Map<string, ProductSales>();
  for (const row of rows) {
    const ord = Array.isArray(row.order) ? row.order[0] : row.order;
    if (!row.product_id || !ord || !isSale(ord)) continue;
    const prod = Array.isArray(row.products) ? row.products[0] : row.products;
    const cur = byProduct.get(row.product_id) ?? { name: prod?.name ?? null, qty: 0, revenue: 0 };
    cur.qty += Number(row.qty ?? 1) || 0;
    cur.revenue += Number(row.line_total ?? 0) || 0;
    byProduct.set(row.product_id, cur);
  }
  return { byProduct, error };
}
