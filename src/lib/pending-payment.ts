/**
 * Marca de "pedido esperando pago online" guardada en el teléfono del cliente.
 *
 * El carrito NO se vacía al mandar al cliente a Stripe / Wompi / Mercado Pago:
 * si abandona el pago o lo rechazan, tiene que encontrar su carrito intacto
 * (antes en Wompi/MP se vaciaba antes de pagar, y con Stripe no se vaciaba
 * nunca). Se vacía cuando la página de seguimiento ve ese mismo pedido pagado.
 */
const KEY = 'menius:pending-pay';

export interface PendingPayment {
  restaurantId: string;
  orderId: string;
}

export function setPendingPayment(p: PendingPayment): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* modo privado / storage bloqueado: el carrito queda como estaba */
  }
}

export function readPendingPayment(): PendingPayment | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<PendingPayment>;
    return typeof v.orderId === 'string' && typeof v.restaurantId === 'string'
      ? { orderId: v.orderId, restaurantId: v.restaurantId }
      : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
