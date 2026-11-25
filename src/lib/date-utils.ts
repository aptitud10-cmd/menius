/**
 * Returns the UTC timestamp that corresponds to midnight in the given timezone
 * for the current day (or daysAgo days before), so DB queries filter correctly.
 *
 * En Vercel el runtime corre en UTC. Usar `new Date().setHours(0,0,0,0)` da
 * medianoche UTC, no la del restaurante — desfasa el corte de "hoy" varias horas.
 * Esta función computa el inicio de día real según la timezone del negocio.
 */
export function getStartOfDayUTC(timezone: string, daysAgo = 0): Date {
  const now = new Date();
  // Get the local date string (YYYY-MM-DD) in the target timezone
  const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const [year, month, day] = localDateStr.split('-').map(Number);

  // Build the target date (going back daysAgo days)
  const targetDate = new Date(Date.UTC(year, month - 1, day - daysAgo));
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  // Find the UTC offset at noon UTC on that day (noon avoids DST edge cases at midnight)
  const noonUTC = new Date(`${targetDateStr}T12:00:00Z`);
  const hourAtNoon = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(noonUTC),
    10,
  );
  const normalizedHour = hourAtNoon === 24 ? 0 : hourAtNoon;
  const offsetHours = normalizedHour - 12; // positive = east (UTC+), negative = west (UTC-)

  // Midnight in the target timezone = midnight UTC minus the offset
  const midnightUTC = new Date(`${targetDateStr}T00:00:00Z`);
  return new Date(midnightUTC.getTime() - offsetHours * 3600 * 1000);
}

/**
 * Converts a wall-clock date+time stored in the restaurant's local timezone
 * (columns typed `date` + `time without time zone`, e.g. reservations) into a
 * real UTC instant.
 *
 * `new Date("2026-08-07T19:00")` on a UTC server reads that as 19:00 UTC, which
 * for a UTC-4 restaurant is 3pm local — four hours off. That made the
 * reservation auto-cancel cron fire hours BEFORE the guest was due.
 *
 * Returns null when the inputs are unusable, so callers can skip the row
 * instead of acting on a bogus instant.
 */
export function localDateTimeToUTC(
  dateStr: string,
  timeStr: string,
  timezone: string,
): Date | null {
  if (!dateStr || !timeStr) return null;

  // Tolerate "19:00", "19:00:00" and "19:00:00.000"
  const hms = timeStr.trim().split(':');
  const hour = Number(hms[0]);
  const minute = Number(hms[1] ?? 0);
  const second = Number.parseInt(hms[2] ?? '0', 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return null;

  // Offset measured at noon UTC on that date — noon dodges the DST edge cases
  // that midnight lands on. Same approach as getStartOfDayUTC above.
  const noonUTC = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(noonUTC.getTime())) return null;

  let hourAtNoon: number;
  try {
    hourAtNoon = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(noonUTC),
      10,
    );
  } catch {
    return null; // invalid IANA timezone
  }
  if (!Number.isFinite(hourAtNoon)) return null;

  const offsetHours = (hourAtNoon === 24 ? 0 : hourAtNoon) - 12;

  const asIfUTC = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(asIfUTC.getTime())) return null;

  return new Date(
    asIfUTC.getTime()
      + (hour * 3600 + minute * 60 + second) * 1000
      - offsetHours * 3600 * 1000,
  );
}

// ---------------------------------------------------------------------------
// Calendar days in the restaurant's timezone (sales reports and dashboards).
// A "day" is 00:00 to 24:00 local time; ranges are half-open [start, end).
// ---------------------------------------------------------------------------

/** Fallback used when a restaurant has no (or an invalid) timezone. Matches the DB default. */
export const DEFAULT_RESTAURANT_TIMEZONE = 'America/Mexico_City';

/** True if `timezone` is a valid IANA zone for Intl. */
export function isValidTimezone(timezone: string | null | undefined): timezone is string {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Restaurant timezone, or the DB default when missing/invalid. */
export function resolveTimezone(timezone: string | null | undefined): string {
  return isValidTimezone(timezone) ? timezone : DEFAULT_RESTAURANT_TIMEZONE;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDateString(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/** Calendar arithmetic on YYYY-MM-DD strings (no timezone involved). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function zonedParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset of `timezone` from UTC at `instant`, in ms (east positive). */
function zoneOffsetMs(instant: Date, timezone: string): number {
  const p = zonedParts(instant, timezone);
  const wallAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/** YYYY-MM-DD of `instant` as seen in `timezone`. */
export function localDateString(instant: Date, timezone: string): string {
  const p = zonedParts(instant, timezone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * First instant (UTC) of the local calendar day `dateStr` in `timezone`.
 * Uses the offset at the candidate instant itself, so DST-change days are
 * exact (unlike measuring the offset at noon).
 */
export function localDayStartUTC(dateStr: string, timezone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d);
  const first = wall - zoneOffsetMs(new Date(wall), timezone);
  const second = wall - zoneOffsetMs(new Date(first), timezone);
  // Zones whose DST jump skips midnight: keep the earliest candidate that is
  // still on the requested local date.
  const candidates = [first, second].filter((t) => localDateString(new Date(t), timezone) === dateStr);
  return new Date(candidates.length > 0 ? Math.min(...candidates) : second);
}

export interface LocalDayRange {
  /** First local day, YYYY-MM-DD (inclusive). */
  startDate: string;
  /** Last local day, YYYY-MM-DD (inclusive). */
  endDate: string;
  /** Number of calendar days covered. */
  days: number;
  /** UTC instant of local 00:00 on startDate (inclusive). */
  start: Date;
  /** UTC instant of local 00:00 on the day after endDate (exclusive). */
  end: Date;
}

/** Local calendar days startDate..endDate (inclusive) as a UTC [start, end) range. */
export function localDayRange(startDate: string, endDate: string, timezone: string): LocalDayRange | null {
  if (!isDateString(startDate) || !isDateString(endDate) || startDate > endDate) return null;
  const days = Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000,
  ) + 1;
  return {
    startDate,
    endDate,
    days,
    start: localDayStartUTC(startDate, timezone),
    end: localDayStartUTC(addDaysToDateString(endDate, 1), timezone),
  };
}

/** The last `days` local calendar days, today included. */
export function lastLocalDaysRange(days: number, timezone: string, now: Date = new Date()): LocalDayRange {
  const n = Math.max(1, Math.floor(days));
  const endDate = localDateString(now, timezone);
  return localDayRange(addDaysToDateString(endDate, -(n - 1)), endDate, timezone)!;
}

/** Same number of days immediately before `range` (for period-over-period comparison). */
export function previousLocalDayRange(range: LocalDayRange, timezone: string): LocalDayRange {
  return localDayRange(
    addDaysToDateString(range.startDate, -range.days),
    addDaysToDateString(range.startDate, -1),
    timezone,
  )!;
}
