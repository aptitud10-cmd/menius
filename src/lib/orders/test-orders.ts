/**
 * Borrar pedidos de prueba (solo admin, /admin/restaurant → "Pedidos de prueba").
 *
 * Por qué existe (2026-11-24): Buccaneer juntó 306 pedidos de prueba en 9 meses
 * ($14.255 que nunca existieron). Inflaban estadísticas y el ranking "Popular"
 * (recalc-popularity cuenta pedidos). El Counter no tiene "borrar" a propósito:
 * un pedido real se cancela; borrar ventas esconde plata.
 */

/** Tope por operación: la consulta de respaldo y el borrado van en tandas. */
export const MAX_TEST_ORDERS_PER_DELETE = 300;

/** Tablas que cuelgan de orders.order_id (FK en cascada, o SET NULL en reviews). */
export const ORDER_CHILD_TABLES = [
  'order_items', 'order_status_history', 'order_notification_log',
  'order_location_latest', 'push_subscriptions', 'reviews', 'print_jobs',
] as const;

export interface DeletableCheck {
  payment_status: string | null;
  payment_intent_id: string | null;
}

/**
 * Un pedido con plata real de por medio (cobrado, o con un cobro de Stripe
 * iniciado) NO se borra: se cancela/reembolsa por el camino normal, y Stripe
 * guarda el registro igual — borrarlo acá dejaría un cobro sin pedido.
 */
export function canDeleteAsTest(o: DeletableCheck): boolean {
  if (o.payment_status === 'paid' || o.payment_status === 'refunded' || o.payment_status === 'partially_refunded') return false;
  return !(o.payment_intent_id && o.payment_intent_id.trim() !== '');
}
