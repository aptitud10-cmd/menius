/**
 * Tiempos límite de un pedido abierto (decidido con Pedro 2026-11-17).
 *
 * Antes solo existía "pickup en Listo → cerrar a las 2 h", y en producción no
 * cerró ninguno (0 en su historia; pickups de 464 y 1074 min en Listo). Los
 * demás estados no tenían nada: pedidos sin aceptar 268 min, deliveries "en
 * camino" 92 días, mesas servidas desde abril. Todo eso se acumulaba en el
 * Counter.
 *
 * Dos reglas distintas:
 * 1. SIN ACEPTAR (pending) → se CANCELA a los 15 min y se le avisa al cliente.
 *    Uber Eats cancela a los ~10–11,5 min; un diner donde el del mostrador
 *    también cobra necesita un poco más. Los pagos online sin cobrar los
 *    cierra monitor-orders a las 25 h (el restaurante ni los ve).
 *    Ya PAGADO con Stripe → se cancela y se reembolsa el total (Fase C,
 *    2026-11-18): la política de reembolsos lo promete. Pagado con Wompi o
 *    Mercado Pago no tiene reembolso automático: queda para el mostrador.
 * 2. ACEPTADO Y OLVIDADO → se CIERRA en silencio (cancellation_reason
 *    'auto_closed'), sin avisar al cliente: casi siempre la comida salió y
 *    solo faltó tocar el botón. Sigue contando como venta.
 * 3. PICKUP EN LISTO → a los 30 min se da por retirado ('pickup_done', 2026-11-24).
 *    En Buccaneer nunca marcan "recogido" en ninguna de las 4 apps que usan
 *    (ChowNow, Uber, Grubhub, Menufy): el pickup termina en "Listo". Antes eso
 *    dejaba el pedido 2 h en la columna, le mandaba al cliente "tu pedido te
 *    espera" a los 20 min aunque ya estuviera comiendo, y hacía sonar la alarma
 *    a los 60. Sin aviso en el momento (no sabemos si ya lo retiró), pero a
 *    diferencia de 'auto_closed' SÍ entra en el email de reseña.
 *
 * Funciones puras: el cron (api/cron/order-timeouts) solo las aplica.
 */

import { isStripePaymentIntent } from '@/lib/payments/stripe-ids';

export const NOT_ACCEPTED_MINS = 15;
/** Un pendiente más viejo que esto ya no es "tu pedido de recién": se cancela
 *  sin email (backlog de antes de esta regla, o un cron que no corrió). */
export const NOTIFY_MAX_AGE_MINS = 120;
/** Pickup en Listo: a partir de acá se da por retirado (regla 3). */
export const READY_PICKUP_MINS = 30;
export const STALE_KITCHEN_MINS = 240;
export const OUT_FOR_DELIVERY_MINS = 180;
export const SERVED_MINS = 180;

export const NOT_ACCEPTED_REASON = 'not_accepted';
export const AUTO_CLOSED_REASON = 'auto_closed';
/** Pickup dado por retirado tras READY_PICKUP_MINS en Listo (regla 3). */
export const PICKUP_DONE_REASON = 'pickup_done';

export interface TimeoutOrder {
  status: string;
  order_type: string | null;
  payment_method: string | null;
  payment_status: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string | null;
  prepared_at: string | null;
  customer_arrived_at?: string | null;
  payment_intent_id?: string | null;
}

export type TimeoutAction =
  | { kind: 'cancel_not_accepted'; notify: boolean }
  | { kind: 'refund_not_accepted'; notify: boolean }
  | { kind: 'auto_close'; to: 'delivered' | 'completed' }
  | { kind: 'pickup_done' };

const t = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const latest = (...xs: number[]) => Math.max(...xs.filter(Number.isFinite));

/** Cierre final según el tipo: la mesa termina en 'completed', el resto en 'delivered' (igual que el Counter). */
function closedStatus(o: TimeoutOrder): 'delivered' | 'completed' {
  return o.order_type === 'dine_in' ? 'completed' : 'delivered';
}

/**
 * Cancelado por no aceptado pero con el reembolso sin hacer (Stripe lo rechazó
 * o se cayó a mitad): el cron lo reintenta en cada vuelta hasta que salga.
 */
export function needsRefundRetry(o: {
  status: string; payment_status: string | null; cancellation_reason: string | null; payment_intent_id: string | null;
}): boolean {
  return o.status === 'cancelled'
    && o.payment_status === 'paid'
    && o.cancellation_reason === NOT_ACCEPTED_REASON
    && isStripePaymentIntent(o.payment_intent_id);
}

export function classifyTimeout(o: TimeoutOrder, now: number): TimeoutAction | null {
  const created = t(o.created_at);
  // Hora del último cambio de estado: updateOrderStatus fija updated_at en cada
  // cambio; prepared_at cubre filas viejas donde updated_at quedó = created_at.
  const since = latest(created, t(o.updated_at), t(o.prepared_at));
  const mins = (now - since) / 60_000;

  switch (o.status) {
    case 'pending': {
      // Programado todavía no activado: activate-scheduled le borra
      // scheduled_for (y fija updated_at) cuando llega la hora.
      if (o.scheduled_for) return null;
      // Mismo reloj que el Counter ("esperando N min"): max(creado, tocado).
      // El webhook fija updated_at al confirmar el pago, así que un pedido
      // pagado cuenta desde que llegó al Counter, no desde que se armó el carrito.
      const waiting = (now - latest(created, t(o.updated_at))) / 60_000;
      const notify = (now - created) / 60_000 < NOTIFY_MAX_AGE_MINS;
      if (o.payment_status === 'paid') {
        if (!isStripePaymentIntent(o.payment_intent_id)) return null;
        return waiting >= NOT_ACCEPTED_MINS ? { kind: 'refund_not_accepted', notify } : null;
      }
      if (o.payment_method === 'online' || o.payment_method === 'wallet') return null;
      if (waiting < NOT_ACCEPTED_MINS) return null;
      return { kind: 'cancel_not_accepted', notify };
    }
    case 'confirmed':
    case 'preparing':
    case 'almost_ready':
      return mins >= STALE_KITCHEN_MINS ? { kind: 'auto_close', to: closedStatus(o) } : null;
    case 'ready': {
      if (o.order_type === 'pickup') return mins >= READY_PICKUP_MINS ? { kind: 'pickup_done' } : null;
      const limit = o.order_type === 'dine_in' ? SERVED_MINS
        : STALE_KITCHEN_MINS; // delivery listo esperando repartidor
      return mins >= limit ? { kind: 'auto_close', to: closedStatus(o) } : null;
    }
    case 'out_for_delivery':
      return mins >= OUT_FOR_DELIVERY_MINS ? { kind: 'auto_close', to: 'delivered' } : null;
    case 'served':
      return mins >= SERVED_MINS ? { kind: 'auto_close', to: 'completed' } : null;
    default:
      return null;
  }
}
