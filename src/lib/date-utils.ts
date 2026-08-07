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
