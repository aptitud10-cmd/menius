/**
 * Ruta del repartidor: varios pedidos en un mismo viaje.
 *
 * La ruta es solo una agrupación (orders.batch_id + batch_seq), nunca una
 * credencial: para ver o tocar un pedido hay que presentar SU token (el QR de
 * su ticket). El cliente recibe como mucho cuántas paradas hay antes de la suya.
 */

export const MAX_ROUTE_ORDERS = 4;

export type RouteRejectReason =
  | 'not_found'
  | 'not_delivery'
  | 'closed'
  | 'expired'
  | 'other_restaurant'
  | 'too_many';

export type RouteOrderRow = {
  id: string;
  restaurant_id: string;
  order_type: string | null;
  status: string;
  driver_tracking_token: string | null;
  driver_token_expires_at: string | null;
  batch_id: string | null;
};

const CLOSED = new Set(['delivered', 'completed', 'cancelled']);

/** Normaliza la lista de tokens del body: strings únicos, no vacíos, ≤200 chars. */
export function parseRouteTokens(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== 'string') return null;
    const s = t.trim();
    if (!s || s.length > 200) return null;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * Valida que los pedidos puedan ir juntos. Devuelve el primer problema con el
 * token que lo causa, o null si la ruta es válida.
 */
export function validateRoute(
  tokens: string[],
  rows: RouteOrderRow[],
  now = Date.now(),
): { reason: RouteRejectReason; token?: string } | null {
  if (tokens.length === 0) return { reason: 'not_found' };
  if (tokens.length > MAX_ROUTE_ORDERS) return { reason: 'too_many' };
  const byToken = new Map(rows.map((r) => [r.driver_tracking_token, r]));
  let restaurantId: string | null = null;
  for (const token of tokens) {
    const r = byToken.get(token);
    if (!r) return { reason: 'not_found', token };
    if (r.order_type !== 'delivery') return { reason: 'not_delivery', token };
    if (CLOSED.has(r.status)) return { reason: 'closed', token };
    if (r.driver_token_expires_at && Date.parse(r.driver_token_expires_at) < now) return { reason: 'expired', token };
    if (restaurantId && r.restaurant_id !== restaurantId) return { reason: 'other_restaurant', token };
    restaurantId = r.restaurant_id;
  }
  return null;
}

/** Reusa el batch_id si todos ya lo comparten (reordenar); si no, uno nuevo. */
export function chooseBatchId(rows: RouteOrderRow[], makeId: () => string): string {
  const first = rows[0]?.batch_id ?? null;
  return first && rows.every((r) => r.batch_id === first) ? first : makeId();
}

export type BatchMate = { id: string; batch_seq: number | null; status: string; driver_at_door_at?: string | null; delivery_failed_at?: string | null };

/**
 * Paradas pendientes antes de la de este pedido: compañeros de ruta con
 * batch_seq menor que todavía no se entregaron, cancelaron ni fallaron.
 */
export function stopsAhead(mySeq: number | null, mates: BatchMate[]): number {
  if (mySeq == null) return 0;
  // Solo los que van en camino con el repartidor: un compañero de un viaje
  // abandonado que sigue en el local no es una parada antes de la tuya.
  return mates.filter((m) =>
    m.batch_seq != null && m.batch_seq < mySeq && m.status === 'out_for_delivery' && !m.delivery_failed_at,
  ).length;
}

/**
 * Al salir ("Ya tengo el pedido" / "Salir con N pedidos"): quien escaneó es
 * quien lo lleva. Nombre al cliente y al Counter; teléfono solo si viene del
 * equipo del restaurante; si era otro el asignado, su teléfono se borra.
 */
export function pickupDriverFields(input: {
  name: string;
  prevName: string | null | undefined;
  pool: { id: string; phone: string | null } | null;
  now: string;
}): Record<string, unknown> {
  const name = input.name.trim().slice(0, 60);
  if (!name) return {};
  const out: Record<string, unknown> = { driver_name: name, driver_assigned_at: input.now };
  const prev = (input.prevName ?? '').trim();
  // Lo lleva otro que el asignado: ni su teléfono ni su cuenta (la app nativa
  // lista por driver_id) siguen valiendo.
  if (prev && prev.toLowerCase() !== name.toLowerCase()) { out.driver_phone = null; out.driver_id = null; }
  if (input.pool) {
    out.driver_id = input.pool.id;
    const phone = (input.pool.phone ?? '').trim();
    if (phone) out.driver_phone = phone;
  }
  return out;
}

/** Minutos extra por cada parada antes de la tuya: ~3 en la puerta + ~6 de tramo. */
export const MINUTES_PER_STOP_AHEAD = 9;

type MatesQuery = {
  from: (t: 'orders') => {
    select: (cols: string) => {
      eq: (c: string, v: string) => {
        neq: (c: string, v: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

/**
 * Para el seguimiento del cliente (servidor, admin client): cuántas paradas
 * hay antes de la suya. Solo cuenta mientras el pedido va en camino y el
 * repartidor no llegó a su puerta. Nunca devuelve ids ni datos de otros pedidos.
 */
export async function fetchStopsAhead(
  db: unknown,
  order: { id: string; status: string; batch_id?: string | null; batch_seq?: number | null; driver_at_door_at?: string | null },
): Promise<number> {
  if (!order.batch_id || order.status !== 'out_for_delivery' || order.driver_at_door_at) return 0;
  try {
    const { data, error } = await (db as MatesQuery)
      .from('orders')
      .select('id, batch_seq, status, delivery_failed_at')
      .eq('batch_id', order.batch_id)
      .neq('id', order.id);
    if (error || !data) return 0;
    return stopsAhead(order.batch_seq ?? null, data as BatchMate[]);
  } catch {
    return 0;
  }
}
