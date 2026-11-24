/**
 * Emails de marketing por comportamiento (Pedro 2026-11-24: "sin spam, premium").
 *
 * Tres momentos, todos a partir de lo que el cliente pidió de verdad:
 *  - second_visit: tuvo UN pedido hace 7–21 días → "¿repetimos?" con su plato.
 *  - usual:        ya repite y se atrasó respecto a SU ritmo → "¿lo de siempre?".
 *  - winback:      45–75 días sin pedir → "te extrañamos", una sola vez.
 * Pasados 75 días no se le escribe más (sunset): insistir a quien no vuelve
 * es lo que manda a los dominios a spam.
 *
 * Reglas que valen para los tres:
 *  - Solo con consentimiento (tag marketing_opt_in, sin unsubscribed).
 *  - Cada uno UNA vez por "último pedido": si vuelve a pedir, todo se reinicia.
 *  - Máximo 1 email de marketing por persona cada 7 días, y nunca a menos de
 *    3 días de un pedido de reseña.
 *  - Llega a la hora a la que esa persona suele pedir (1 h antes), en la hora
 *    del restaurante, entre 10:00 y 19:59.
 *
 * Funciones puras: el cron (api/cron/marketing-emails) carga los datos.
 */

export type LifecycleKind = 'second_visit' | 'usual' | 'winback';
export const LIFECYCLE_KINDS: LifecycleKind[] = ['second_visit', 'usual', 'winback'];

/** Evento en order_notification_log (atado al último pedido del cliente). */
export const lifecycleEvent = (kind: LifecycleKind) => `mkt_${kind}`;
export const MARKETING_EVENTS = LIFECYCLE_KINDS.map(lifecycleEvent);
export const REVIEW_EVENT = 'review_request_email';

/** Tag del restaurante que prende cada automatización (restaurants.tags). */
export const lifecycleTag = (kind: LifecycleKind) => `mkt:${kind}`;

export const OPT_IN_TAG = 'marketing_opt_in';
export const UNSUBSCRIBED_TAG = 'unsubscribed';

const DAY = 24 * 3600_000;

export const SECOND_VISIT_DAYS = { from: 7, to: 21 } as const;
export const USUAL_MIN_DAYS = 10;
export const USUAL_CADENCE_FACTOR = 1.5;
export const WINBACK_DAYS = { from: 45, to: 75 } as const;
export const MARKETING_GAP_DAYS = 7;
export const AFTER_REVIEW_GAP_DAYS = 3;
export const SEND_HOURS = { from: 10, to: 19 } as const;
export const DEFAULT_SEND_HOUR = 11;

export interface LifecycleOrder {
  id: string;
  createdAt: string;
}

export interface LogEntry {
  orderId: string;
  event: string;
  createdAt: string;
}

export function canReceiveMarketing(tags: readonly string[] | null | undefined): boolean {
  const t = tags ?? [];
  return t.includes(OPT_IN_TAG) && !t.includes(UNSUBSCRIBED_TAG);
}

/**
 * Promedio de días entre pedidos, con los últimos 6 pedidos como mucho
 * (el ritmo de hace un año no dice nada de hoy). null con menos de 2.
 */
export function cadenceDays(ordersNewestFirst: LifecycleOrder[]): number | null {
  const recent = ordersNewestFirst.slice(0, 6).map((o) => Date.parse(o.createdAt)).filter(Number.isFinite);
  if (recent.length < 2) return null;
  const span = recent[0] - recent[recent.length - 1];
  return span / (recent.length - 1) / DAY;
}

/** Días después del último pedido en que "lo de siempre" se vuelve oportuno. */
export function usualDueDays(cadence: number | null): number {
  if (cadence == null) return USUAL_MIN_DAYS;
  return Math.max(USUAL_MIN_DAYS, Math.round(cadence * USUAL_CADENCE_FACTOR));
}

/**
 * Qué email le toca hoy a este cliente (o ninguno), sin mirar topes ni hora.
 * `ordersNewestFirst`: sus pedidos no cancelados, del más nuevo al más viejo.
 */
export function pickLifecycle(
  ordersNewestFirst: LifecycleOrder[],
  nowMs: number,
): { kind: LifecycleKind; anchorOrderId: string } | null {
  const last = ordersNewestFirst[0];
  if (!last) return null;
  const days = (nowMs - Date.parse(last.createdAt)) / DAY;
  if (!Number.isFinite(days)) return null;

  if (days >= WINBACK_DAYS.from && days < WINBACK_DAYS.to) {
    return { kind: 'winback', anchorOrderId: last.id };
  }
  if (ordersNewestFirst.length === 1) {
    return days >= SECOND_VISIT_DAYS.from && days < SECOND_VISIT_DAYS.to
      ? { kind: 'second_visit', anchorOrderId: last.id }
      : null;
  }
  const due = usualDueDays(cadenceDays(ordersNewestFirst));
  return days >= due && days < WINBACK_DAYS.from ? { kind: 'usual', anchorOrderId: last.id } : null;
}

/**
 * ¿Se le puede escribir ahora? `logs`: avisos de TODOS sus pedidos.
 * - Ese email ya salió para ese último pedido → no (ni aunque haya fallado:
 *   ante la duda, no se repite).
 * - Otro email de marketing en los últimos 7 días → no.
 * - Pedido de reseña en los últimos 3 días → no.
 */
export function allowedByHistory(
  pick: { kind: LifecycleKind; anchorOrderId: string },
  logs: LogEntry[],
  nowMs: number,
): boolean {
  const event = lifecycleEvent(pick.kind);
  for (const l of logs) {
    const age = (nowMs - Date.parse(l.createdAt)) / DAY;
    if (l.event === event && l.orderId === pick.anchorOrderId) return false;
    if (MARKETING_EVENTS.includes(l.event) && age < MARKETING_GAP_DAYS) return false;
    if (l.event === REVIEW_EVENT && age < AFTER_REVIEW_GAP_DAYS) return false;
  }
  return true;
}

/** Hora local (0–23) de un instante en la zona del restaurante. */
export function localHour(ms: number, timeZone: string): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(ms));
    const n = Number.parseInt(h, 10);
    return Number.isFinite(n) ? n % 24 : new Date(ms).getUTCHours();
  } catch {
    return new Date(ms).getUTCHours();
  }
}

/**
 * Hora a la que conviene escribirle: una hora antes de la que más suele pedir
 * (si pide a la 1 de la tarde, le llega a las 12), dentro de 10:00–18:00.
 * Sin historia suficiente, 11:00 (antes del almuerzo).
 */
export function preferredSendHour(orderHours: number[]): number {
  if (orderHours.length === 0) return DEFAULT_SEND_HOUR;
  const counts = new Map<number, number>();
  for (const h of orderHours) counts.set(h, (counts.get(h) ?? 0) + 1);
  // La más frecuente; en empate, la más reciente (la primera de la lista).
  let best = orderHours[0];
  for (const h of orderHours) if ((counts.get(h) ?? 0) > (counts.get(best) ?? 0)) best = h;
  return Math.min(SEND_HOURS.to - 1, Math.max(SEND_HOURS.from, best - 1));
}

/** Ya es su hora (y no es tarde para escribir). */
export function isSendTime(nowLocalHour: number, preferred: number): boolean {
  return nowLocalHour >= preferred && nowLocalHour <= SEND_HOURS.to;
}

/** restaurants.tags (jsonb) → automatizaciones prendidas. */
export function enabledKinds(tags: unknown): LifecycleKind[] {
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
  return LIFECYCLE_KINDS.filter((k) => list.includes(lifecycleTag(k)));
}
