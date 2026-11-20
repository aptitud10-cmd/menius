import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { businessDay } from '@/lib/daily-menu';
import { createLogger } from '@/lib/logger';

const logger = createLogger('daily-reset');

export interface ResetRestaurant {
  id: string;
  timezone: string | null;
  day_cutoff: string | null;
  daily_reset_on: string | null;
}

/**
 * Corte diario de sopas y especiales. Lo llama el cron cada 10 min Y la pestaña "Hoy" antes de
 * cada acción: así un especial puesto a las 5:02 no lo apaga un cron que corre a las 5:08.
 * "Reclama" el día con un update condicional (solo uno reinicia aunque corran a la vez).
 * La primera vez (daily_reset_on null) solo anota el día: no apaga nada a media jornada.
 * Devuelve true si reinició.
 */
export async function runDailyReset(supabase: SupabaseClient, r: ResetRestaurant): Promise<boolean> {
  const day = businessDay(new Date(), r.timezone, r.day_cutoff);
  if (r.daily_reset_on === day) return false;

  if (!r.daily_reset_on) {
    await supabase.from('restaurants').update({ daily_reset_on: day }).eq('id', r.id).is('daily_reset_on', null);
    return false;
  }

  const { data: claimed, error: claimErr } = await supabase
    .from('restaurants')
    .update({ daily_reset_on: day })
    .eq('id', r.id)
    .lt('daily_reset_on', day)
    .select('id');
  if (claimErr) {
    logger.error('Claim failed', { restaurant: r.id, error: claimErr.message });
    return false;
  }
  if (!claimed || claimed.length === 0) return false; // otro ya reinició

  // Apaga lo del día anterior que no es fijo (lo puesto ya en el día nuevo no se toca).
  const off = await supabase
    .from('products')
    .update({ is_active: false, in_stock: true })
    .eq('restaurant_id', r.id)
    .not('daily_kind', 'is', null)
    .eq('daily_always', false)
    .eq('is_active', true)
    .or(`daily_last_on.is.null,daily_last_on.lt.${day}`);
  // Lo fijo agotado vuelve a estar disponible.
  const back = await supabase
    .from('products')
    .update({ in_stock: true })
    .eq('restaurant_id', r.id)
    .eq('daily_always', true)
    .eq('in_stock', false);
  // Lo que quedó apagado no puede seguir "agotado" para mañana.
  const offBack = await supabase
    .from('products')
    .update({ in_stock: true })
    .eq('restaurant_id', r.id)
    .not('daily_kind', 'is', null)
    .eq('is_active', false)
    .eq('in_stock', false);
  const err = off.error ?? back.error ?? offBack.error;
  if (err) logger.error('Reset failed', { restaurant: r.id, error: err.message });

  await syncSpecialCategories(supabase, r.id);
  return true;
}

/** Categorías que solo tienen especiales: visibles si hay alguno puesto (si no, el menú mostraría una sección vacía). */
export async function syncSpecialCategories(supabase: SupabaseClient, restaurantId: string): Promise<void> {
  const { data: specials } = await supabase
    .from('products')
    .select('category_id')
    .eq('restaurant_id', restaurantId)
    .eq('daily_kind', 'special');
  const cats = Array.from(new Set((specials ?? []).map((p) => p.category_id as string)));
  for (const cat of cats) {
    const { data: inCat } = await supabase
      .from('products')
      .select('is_active, daily_kind')
      .eq('restaurant_id', restaurantId)
      .eq('category_id', cat);
    const list = inCat ?? [];
    if (list.some((p) => p.daily_kind !== 'special')) continue; // categoría mixta: no se toca
    const { error } = await supabase
      .from('categories')
      .update({ is_active: list.some((p) => p.is_active === true) })
      .eq('id', cat)
      .eq('restaurant_id', restaurantId);
    if (error) logger.error('Category sync failed', { restaurant: restaurantId, category: cat, error: error.message });
  }
}
