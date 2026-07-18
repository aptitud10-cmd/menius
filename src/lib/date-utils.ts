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
