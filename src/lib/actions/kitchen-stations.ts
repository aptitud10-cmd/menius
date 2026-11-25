'use server';

import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { allStationsDone, type KitchenRawItem } from '@/lib/kitchen';
import { createLogger } from '@/lib/logger';

const logger = createLogger('kds-stations');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StationDoneResult =
  | { error: string }
  | { stationsDone: string[]; allDone: boolean }
  /** La migración 20261127 todavía no está: el KDS cierra el pedido entero, como antes. */
  | { unsupported: true };

/**
 * KDS con filtro de estación: "LISTO" anota que ESTA estación terminó sus
 * platos (done=false lo deshace). Devuelve si ya terminaron todas: entonces el
 * KDS pasa el pedido a 'ready' por el camino de siempre (updateOrderStatus).
 */
export async function setKitchenStationDone(orderId: string, stationId: string, done = true): Promise<StationDoneResult> {
  if (!UUID.test(orderId) || !UUID.test(stationId)) return { error: 'Datos inválidos' };
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return { error: 'No autenticado' };

  const supabase = await createClient();
  const { data: order, error: readErr } = await supabase
    .from('orders')
    .select('id, order_items ( qty, product:products ( station_id, category:categories ( send_to_kitchen ) ) )')
    .eq('id', orderId)
    .eq('restaurant_id', tenant.restaurantId)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!order) return { error: 'Orden no encontrada' };

  const { data, error } = await supabase.rpc('kds_set_station_done', {
    p_order_id: orderId,
    p_station_id: stationId,
    p_done: done,
  });
  if (error) {
    // 42883 / PGRST202: la función no existe (migración sin aplicar).
    if (error.code === '42883' || error.code === 'PGRST202') return { unsupported: true };
    logger.error('kds_set_station_done failed', { orderId, code: error.code, message: error.message });
    return { error: error.message };
  }
  const stationsDone = (Array.isArray(data) ? data : []) as string[];
  const items = (order as { order_items?: unknown }).order_items as KitchenRawItem[] | undefined;
  return { stationsDone, allDone: done && allStationsDone(items, stationsDone) };
}
