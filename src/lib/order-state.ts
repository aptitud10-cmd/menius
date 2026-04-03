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
  | 'ready'
  | 'delivered'
  | 'cancelled';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready', 'delivered', 'cancelled'],
  ready:     ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
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
