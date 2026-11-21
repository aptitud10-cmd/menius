/**
 * Cron: corte diario de sopas y especiales (pestaña "Hoy" del Counter). Cada 10 min.
 * Para cada restaurante con platos del día, cuando cambia su día de trabajo
 * (restaurants.day_cutoff en su timezone; Buccaneer 05:00 America/New_York) corre runDailyReset
 * y revalida el menú público. La pestaña "Hoy" también lo corre antes de cada acción;
 * el "reclamo" del día en runDailyReset evita reiniciar dos veces.
 *
 * Además (cualquier restaurante): vuelve a poner lo agotado "hasta mañana" desde la pestaña Menú
 * (products.in_stock_until ya pasado). Corre cada 10 min, así que vuelve entre las 5:00 y las 5:10.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { runDailyReset } from '@/lib/daily-reset';
import { revalidatePublicMenu } from '@/lib/revalidate-public-menu';

const logger = createLogger('daily-reset-cron', { report: true });
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const restocked = await restockExpired(supabase);

  const { data: dailyRows, error } = await supabase
    .from('products')
    .select('restaurant_id')
    .not('daily_kind', 'is', null);
  if (error) {
    logger.error('Failed to list daily products', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const restaurantIds = Array.from(new Set((dailyRows ?? []).map((r) => r.restaurant_id as string)));
  if (restaurantIds.length === 0) return NextResponse.json({ ok: true, reset: [], restocked });

  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, slug, timezone, day_cutoff, daily_reset_on')
    .in('id', restaurantIds);
  if (rErr) {
    logger.error('Failed to load restaurants', { error: rErr.message });
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const reset: string[] = [];
  for (const r of restaurants ?? []) {
    try {
      if (await runDailyReset(supabase, r)) {
        revalidatePublicMenu(r.slug);
        reset.push(r.slug);
      }
    } catch (err: unknown) {
      logger.error('Reset threw', { restaurant: r.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (reset.length) logger.info('Daily reset', { reset });
  return NextResponse.json({ ok: true, reset, restocked });
}

/** Lo agotado "hasta mañana" cuyo momento ya pasó vuelve a la venta (el trigger borra in_stock_until). */
async function restockExpired(supabase: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .update({ in_stock: true })
    .eq('in_stock', false)
    .not('in_stock_until', 'is', null)
    .lte('in_stock_until', new Date().toISOString())
    .select('restaurant_id');
  if (error) {
    logger.error('Restock failed', { error: error.message });
    return 0;
  }
  const ids = Array.from(new Set((data ?? []).map((r) => r.restaurant_id as string)));
  if (ids.length) {
    const { data: rs } = await supabase.from('restaurants').select('slug').in('id', ids);
    for (const r of rs ?? []) revalidatePublicMenu(r.slug as string);
    logger.info('Restocked', { count: data?.length ?? 0, restaurants: ids.length });
  }
  return data?.length ?? 0;
}
