/**
 * Horario por opción de modificador: Grits solo de 5:30 a 11:00 (Pedro 2026-11-13).
 *
 * Antes la opción se llamaba "Grits (until 11 AM)" y nada lo hacía cumplir: a las
 * 3 PM se podía pedir igual y la cocina tenía que llamar. Ahora:
 *   - la ficha la muestra gris fuera de horario y al tocarla dice cuándo hay,
 *   - /api/orders la rechaza a la hora del pedido (o a la hora programada).
 *
 * Las horas son LOCALES del restaurante ("05:30", "11:00"; Postgres `time` llega
 * como "05:30:00"). Si `from > until` el horario cruza la medianoche.
 */

type Hours = { available_from?: string | null; available_until?: string | null };

function mins(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * Normaliza lo que llega de un formulario a "HH:MM" o null.
 * Vacío / inválido = null ("sin horario"), nunca un string que Postgres rechace.
 */
export function normalizeHour(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** Si la opción tiene horario cargado. */
export function hasHours(opt: Hours): boolean {
  return mins(opt.available_from) != null || mins(opt.available_until) != null;
}

/**
 * ¿Se puede pedir a esta hora local?
 * `local` = fecha cuyos getHours/getMinutes ya están en la zona del restaurante
 * (ver inTimeZone). `graceMin` estira el cierre: el server da unos minutos para
 * que quien eligió a las 10:58 y pagó a las 11:02 no reciba un rechazo.
 */
export function isOptionAvailableAt(opt: Hours, local: Date, graceMin = 0): boolean {
  const from = mins(opt.available_from);
  const until = mins(opt.available_until);
  if (from == null && until == null) return true;
  const now = local.getHours() * 60 + local.getMinutes();
  const f = from ?? 0;
  const u = (until ?? 24 * 60) + graceMin;
  if (f <= (until ?? 24 * 60)) return now >= f && now < u;
  // Cruza la medianoche (22:00–02:00).
  return now >= f || now < u;
}

function fmt(totalMin: number, en: boolean): { text: string; ampm: string } {
  const h24 = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const mm = m ? `:${String(m).padStart(2, '0')}` : '';
  if (!en) return { text: `${h24}${m ? mm : ':00'}`, ampm: '' };
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { text: `${h12}${mm}`, ampm };
}

/**
 * "5:30–11 AM" / "5:30–11:00". El AM/PM se escribe una sola vez cuando las dos
 * horas caen del mismo lado del mediodía. null si la opción no tiene horario.
 */
export function optionHoursLabel(opt: Hours, locale: string | undefined): string | null {
  const from = mins(opt.available_from);
  const until = mins(opt.available_until);
  if (from == null && until == null) return null;
  const en = !(locale ?? 'en').startsWith('es');
  if (from == null) return en ? `Until ${fmtOne(until!, en)}` : `Hasta las ${fmtOne(until!, en)}`;
  if (until == null) return en ? `From ${fmtOne(from, en)}` : `Desde las ${fmtOne(from, en)}`;
  const a = fmt(from, en);
  const b = fmt(until, en);
  if (!en) return `${a.text}–${b.text}`;
  return a.ampm === b.ampm ? `${a.text}–${b.text} ${b.ampm}` : `${a.text} ${a.ampm}–${b.text} ${b.ampm}`;
}

function fmtOne(totalMin: number, en: boolean): string {
  const r = fmt(totalMin, en);
  return r.ampm ? `${r.text} ${r.ampm}` : r.text;
}
