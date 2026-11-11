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

/** Fecha "local" (getters en la zona del restaurante) de un instante. */
export function inTimeZone(instant: Date, tz: string): Date {
  return new Date(instant.toLocaleString('en-US', { timeZone: tz }));
}

/** scheduled_for válido: fecha real y al menos 5 min en el futuro (misma regla al guardar). */
export function validScheduledFor(raw: unknown, nowMs = Date.now()): Date | null {
  if (typeof raw !== 'string' || !raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) && d.getTime() > nowMs + 5 * 60_000 ? d : null;
}
