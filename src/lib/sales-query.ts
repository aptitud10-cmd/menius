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
