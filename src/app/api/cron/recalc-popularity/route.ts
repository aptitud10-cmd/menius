export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('recalc-popularity');

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all active restaurants
  const { data: restaurants, error: restErr } = await db
    .from('restaurants')
    .select('id')
    .eq('is_active', true);

  if (restErr || !restaurants) {
    logger.error('Failed to fetch restaurants', { error: restErr?.message });
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }

  let updatedRestaurants = 0;
  let updatedProducts = 0;
  const errors: string[] = [];

  for (const restaurant of restaurants) {
    try {
      // Count order_items per product in last 7 days for this restaurant
      const { data: rows, error: countErr } = await db
        .from('order_items')
        .select('product_id, qty, orders!inner(restaurant_id, created_at, status)')
        .eq('orders.restaurant_id', restaurant.id)
        .gte('orders.created_at', since)
        .not('orders.status', 'eq', 'cancelled');

      if (countErr || !rows) continue;

      // Aggregate quantities by product
      const totals = new Map<string, number>();
      for (const row of rows as Array<{ product_id: string; qty: number }>) {
        if (!row.product_id) continue;
        totals.set(row.product_id, (totals.get(row.product_id) ?? 0) + (row.qty ?? 1));
      }

      if (totals.size === 0) continue;

      // Sort by total descending, assign rank to top 10
      const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

      // First reset all ranks for this restaurant
      await db
        .from('products')
        .update({ popularity_rank: null, orders_last_7d: 0 })
        .eq('restaurant_id', restaurant.id);

      // Then set the ranked ones
      for (let i = 0; i < sorted.length; i++) {
        const [productId, count] = sorted[i];
        const { error: updateErr } = await db
          .from('products')
          .update({ popularity_rank: i + 1, orders_last_7d: count })
          .eq('id', productId)
          .eq('restaurant_id', restaurant.id);

        if (updateErr) {
          errors.push(`${restaurant.id}/${productId}: ${updateErr.message}`);
        } else {
          updatedProducts++;
        }
      }

      updatedRestaurants++;
    } catch (err) {
      errors.push(`${restaurant.id}: ${String(err)}`);
    }
  }

  logger.info('recalc-popularity complete', { updatedRestaurants, updatedProducts, errors: errors.length });

  return NextResponse.json({ updatedRestaurants, updatedProducts, errors });
}
