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
 *    también cobra necesita un poco más. Solo efectivo/sin cobrar: un pedido
 *    ya pagado necesita reembolso (lo hará la Fase C), y los pagos online sin
 *    cobrar los cierra monitor-orders a las 25 h (el restaurante ni los ve).
 * 2. ACEPTADO Y OLVIDADO → se CIERRA en silencio (cancellation_reason
 *    'auto_closed'), sin avisar al cliente: casi siempre la comida salió y
 *    solo faltó tocar el botón. Sigue contando como venta.
 *
 * Funciones puras: el cron (api/cron/order-timeouts) solo las aplica.
 */

export const NOT_ACCEPTED_MINS = 15;
/** Un pendiente más viejo que esto ya no es "tu pedido de recién": se cancela
 *  sin email (backlog de antes de esta regla, o un cron que no corrió). */
export const NOTIFY_MAX_AGE_MINS = 120;
export const READY_PICKUP_MINS = 120;
export const STALE_KITCHEN_MINS = 240;
export const OUT_FOR_DELIVERY_MINS = 180;
export const SERVED_MINS = 180;

/** Pickup listo sin recoger: recordatorio al cliente (push + email), una vez. */
export const PICKUP_REMINDER_MINS = 20;
export const PICKUP_REMINDER_EVENT = 'pickup_reminder';

export const NOT_ACCEPTED_REASON = 'not_accepted';
export const AUTO_CLOSED_REASON = 'auto_closed';

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
}

export type TimeoutAction =
  | { kind: 'cancel_not_accepted'; notify: boolean }
  | { kind: 'auto_close'; to: 'delivered' | 'completed' };

const t = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const latest = (...xs: number[]) => Math.max(...xs.filter(Number.isFinite));

/** Cierre final según el tipo: la mesa termina en 'completed', el resto en 'delivered' (igual que el Counter). */
function closedStatus(o: TimeoutOrder): 'delivered' | 'completed' {
  return o.order_type === 'dine_in' ? 'completed' : 'delivered';
}

/**
 * ¿Toca recordarle al cliente que su pickup lo espera? Entre los 20 min y el
 * cierre automático (2 h), y no si ya avisó "Ya llegué". El "una sola vez" lo
 * controla el cron con order_notification_log.
 */
export function needsPickupReminder(o: TimeoutOrder, now: number): boolean {
  if (o.status !== 'ready' || o.order_type !== 'pickup' || o.customer_arrived_at) return false;
  const mins = (now - latest(t(o.created_at), t(o.updated_at), t(o.prepared_at))) / 60_000;
  return mins >= PICKUP_REMINDER_MINS && mins < READY_PICKUP_MINS;
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
      if (o.payment_method === 'online' || o.payment_method === 'wallet') return null;
      if (o.payment_status === 'paid') return null;
      // Mismo reloj que el Counter ("esperando N min"): max(creado, tocado).
      const waiting = (now - latest(created, t(o.updated_at))) / 60_000;
      if (waiting < NOT_ACCEPTED_MINS) return null;
      return { kind: 'cancel_not_accepted', notify: (now - created) / 60_000 < NOTIFY_MAX_AGE_MINS };
    }
    case 'confirmed':
    case 'preparing':
    case 'almost_ready':
      return mins >= STALE_KITCHEN_MINS ? { kind: 'auto_close', to: closedStatus(o) } : null;
    case 'ready': {
      const limit = o.order_type === 'pickup' ? READY_PICKUP_MINS
        : o.order_type === 'dine_in' ? SERVED_MINS
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
