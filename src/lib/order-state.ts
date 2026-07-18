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
  confirmed:        ['preparing', 'almost_ready', 'ready', 'cancelled'],
  preparing:        ['almost_ready', 'served', 'ready', 'delivered', 'cancelled'],
  almost_ready:     ['served', 'ready', 'cancelled'],
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
