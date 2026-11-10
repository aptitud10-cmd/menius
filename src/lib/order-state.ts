/**
 * Authoritative order status state machine.
 * All code paths that change order.status must go through `canTransition`.
 *
 * 'confirmed' is kept for backward-compat with existing DB rows
 * (older orders and the WhatsApp agent use it).
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'almost_ready'
  | 'ready'
  | 'out_for_delivery'
  | 'served'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:          ['confirmed', 'preparing', 'cancelled'],
  // confirmed → served: una mesa aceptada desde el panel web (queda en
  // 'confirmed') también se puede marcar servida desde el Counter.
  confirmed:        ['preparing', 'almost_ready', 'ready', 'served', 'cancelled'],
  preparing:        ['almost_ready', 'served', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
  almost_ready:     ['served', 'ready', 'out_for_delivery', 'cancelled'],
  ready:            ['out_for_delivery', 'served', 'delivered', 'completed', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  served:           ['delivered', 'completed'],
  delivered:        [],
  completed:        [],
  cancelled:        [],
};

/**
 * Returns true if transitioning from `from` to `to` is allowed.
 * Returns false for unknown statuses.
 */
export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as OrderStatus];
  if (!allowed) return false;
  return allowed.includes(to as OrderStatus);
}

export const ALL_STATUSES: OrderStatus[] = Object.keys(VALID_TRANSITIONS) as OrderStatus[];

/**
 * Estados que cuentan como REVENUE REALIZADO (dinero efectivamente cobrado).
 * 'ready' NO cuenta: comida lista pero aún no entregada/pagada.
 * 'pending' tampoco: recién entrado, sin cobro confirmado.
 * 'served' SÍ cuenta: en dine-in el staff deja la orden en "Servida" como
 * estado final de reposo (no avanza a 'completed'). Excluirlo escondía ventas
 * de mesa del revenue en home/analytics/business overview.
 *
 * Definición ÚNICA compartida por todas las superficies (home, analytics,
 * business overview) para que el mismo restaurante no muestre cifras distintas.
 */
export const REVENUE_STATUSES: OrderStatus[] = ['completed', 'delivered', 'served'];

/** True si el status representa una orden cuyo importe ya es venta cobrada. */
export function isRevenueStatus(status: string): boolean {
  return REVENUE_STATUSES.includes(status as OrderStatus);
}

/**
 * Pedido online (tarjeta, Wompi, MercadoPago, Apple/Google Pay) que todavía no
 * se cobró. Nace al tocar "Pagar", ANTES de que el cliente pase por la pasarela:
 * Counter, KDS y Pedidos no lo muestran, no suenan ni imprimen hasta que el
 * webhook marca payment_status='paid' — entonces aparece como pedido nuevo.
 * Si nunca se paga, la cocina nunca se entera.
 *
 * Solo aplica mientras sigue 'pending': si el personal ya lo movió (pedidos
 * viejos de antes de esta regla), se sigue viendo.
 */
export function isAwaitingOnlinePayment(order: {
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
}): boolean {
  return (
    (order.payment_method === 'online' || order.payment_method === 'wallet') &&
    order.payment_status !== 'paid' &&
    order.status === 'pending'
  );
}

/** Estados de un pedido todavía en curso (no cerrado ni cancelado). */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'almost_ready', 'ready', 'out_for_delivery', 'served',
];

/**
 * Filtro PostgREST `or()` para la segunda consulta del Counter: pedidos ABIERTOS
 * creados antes de la ventana de 6 h que igual tienen que verse. Programados
 * (aceptados o no) cuya hora cae desde `sinceIso` en adelante, o creados en las
 * últimas 48 h (p. ej. un programado de ayer ya activado — el cron le borra
 * scheduled_for — o un pedido que quedó abierto). Sin esto, un programado hecho
 * ayer para hoy desaparecía del tablero apenas se aceptaba y se recargaba.
 */
export function olderOpenOrdersFilter(sinceIso: string, now = Date.now()): string {
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  return `scheduled_for.gte.${sinceIso},created_at.gte.${twoDaysAgo}`;
}
