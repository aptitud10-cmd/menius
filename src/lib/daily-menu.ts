/**
 * Sopas y especiales del día (pestaña "Hoy" del Counter).
 *
 * "Puesto hoy" = products.is_active. El día de trabajo arranca a restaurants.day_cutoff
 * (hora local de restaurants.timezone): Buccaneer es 24 h y cambia la sopa a las 5:00,
 * no a medianoche. A las 4:59 del 21 todavía es el día de trabajo del 20.
 */

export type DailyKind = 'soup' | 'special';

/** Partes de fecha/hora locales de `instant` en `timeZone`. */
function localParts(instant: Date, timeZone: string): { y: number; m: number; d: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** "05:00" / "05:00:00" → minutos desde medianoche. Inválido → 5:00. */
export function cutoffMinutes(cutoff: string | null | undefined): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(cutoff ?? '');
  if (!m) return 5 * 60;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return 5 * 60;
  return h * 60 + min;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Suma `days` a una fecha 'YYYY-MM-DD' (calendario puro, sin zona). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Día de trabajo ('YYYY-MM-DD') de `instant` para un restaurante. */
export function businessDay(instant: Date, timeZone: string | null | undefined, cutoff: string | null | undefined): string {
  let tz = timeZone || 'America/New_York';
  let p: ReturnType<typeof localParts>;
  try {
    p = localParts(instant, tz);
  } catch {
    tz = 'America/New_York';
    p = localParts(instant, tz);
  }
  const today = iso(p.y, p.m, p.d);
  return p.minutes < cutoffMinutes(cutoff) ? addDays(today, -1) : today;
}

/** Hora del corte para mostrar: "5:00 a. m." / "5:00 AM". */
export function cutoffLabel(cutoff: string | null | undefined, en: boolean): string {
  const total = cutoffMinutes(cutoff);
  const h24 = Math.floor(total / 60);
  const min = String(total % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const am = h24 < 12;
  return en ? `${h12}:${min} ${am ? 'AM' : 'PM'}` : `${h12}:${min} ${am ? 'a. m.' : 'p. m.'}`;
}

/** Máximos por día (lo que entra en el tablero de la tablet). */
export const DAILY_LIMITS: Record<DailyKind, number> = { special: 5, soup: 4 };
