/**
 * Horario de atención: ¿está abierto en este momento (hora local del restaurante)?
 *
 * operating_hours = { monday: { open: "18:00", close: "02:00", closed?: false }, ... }
 * Un horario que cruza la medianoche (cierra antes de abrir, ej. 18:00–02:00)
 * sigue abierto la madrugada siguiente: el sábado 01:00 cae en el horario del
 * viernes. Antes se rechazaban esos pedidos (now >= open && now < close nunca
 * se cumple cuando close < open).
 */

export type DayHours = { open?: string | null; close?: string | null; closed?: boolean | null; fullDay?: boolean | null } | null | undefined;
export type OperatingHours = Record<string, DayHours>;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function mins(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/** `local` = fecha cuyos getDay/getHours ya están en la zona del restaurante. */
export function isOpenAt(hours: OperatingHours, local: Date): boolean {
  const dow = local.getDay();
  const now = local.getHours() * 60 + local.getMinutes();
  const today = hours[DAYS[dow]];
  const yesterday = hours[DAYS[(dow + 6) % 7]];

  // Madrugada de un horario de ayer que cruza la medianoche.
  if (yesterday && !yesterday.closed && yesterday.open && yesterday.close) {
    const o = mins(yesterday.open), c = mins(yesterday.close);
    if (o != null && c != null && c < o && now < c) return true;
  }

  if (!today || today.closed) return false;
  if (today.fullDay) return true; // "todo el día" (el panel guarda 00:00–23:59)
  if (!today.open || !today.close) return true; // día abierto sin horas cargadas
  const o = mins(today.open), c = mins(today.close);
  if (o == null || c == null) return true;
  if (c > o) return now >= o && now < c;
  if (c === o) return true; // 24 h
  return now >= o; // cruza la medianoche: la parte de después de las 00:00 la cubre "ayer"
}

// toLocaleString({ timeZone }) arma un formateador nuevo en cada llamada, y el
// menú llama a inTimeZone muchas veces al cargar: uno por zona, reutilizado.
const tzFormats = new Map<string, Intl.DateTimeFormat>();

/** Fecha "local" (getters en la zona del restaurante) de un instante. */
export function inTimeZone(instant: Date, tz: string): Date {
  let f = tzFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    tzFormats.set(tz, f);
  }
  if (!Number.isFinite(instant.getTime())) return new Date(NaN);
  const n: Record<string, number> = {};
  for (const part of f.formatToParts(instant)) if (part.type !== 'literal') n[part.type] = Number(part.value);
  // Mismo resultado que new Date(instant.toLocaleString('en-US', { timeZone })): sin milisegundos.
  const d = new Date(n.year, n.month - 1, n.day, n.hour, n.minute, n.second);
  if (n.year < 100) d.setFullYear(n.year);
  return d;
}

/** scheduled_for válido: fecha real y al menos 5 min en el futuro (misma regla al guardar). */
export function validScheduledFor(raw: unknown, nowMs = Date.now()): Date | null {
  if (typeof raw !== 'string' || !raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) && d.getTime() > nowMs + 5 * 60_000 ? d : null;
}

/**
 * When the restaurant next opens, from `local` (getters in the restaurant's
 * zone): daysAhead 0 = later today. null when no day of the next week opens
 * (or the hours say nothing). The menu shows "Closed now · Opens at 7 AM".
 */
export function nextOpening(hours: OperatingHours, local: Date): { daysAhead: number; minutes: number } | null {
  const now = local.getHours() * 60 + local.getMinutes();
  for (let d = 0; d <= 7; d++) {
    const day = hours[DAYS[(local.getDay() + d) % 7]];
    if (!day || day.closed) continue;
    const o = day.fullDay || !day.open ? 0 : mins(day.open);
    if (o == null) continue;
    if (d === 0 && o <= now) continue;
    return { daysAhead: d, minutes: o };
  }
  return null;
}

/** Closing earlier than opening (e.g. 18:00–02:00) means the day ends after midnight. */
export function crossesMidnight(open: string, close: string): boolean {
  const o = mins(open), c = mins(close);
  return o != null && c != null && c < o;
}

/**
 * Settings validation for one day's hours (isOpenAt supports overnight hours).
 * Only the same open and close time is rejected: the owner should use "24 h".
 */
export function dayHoursError(open: string, close: string): 'same_time' | null {
  return mins(open) != null && mins(open) === mins(close) ? 'same_time' : null;
}
