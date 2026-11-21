/**
 * Modo ocupado del Counter y del KDS (auditoría 2026-11-21, Tanda 2).
 * Suma minutos al tiempo de preparación al aceptar. Vive en restaurants (busy_extra_minutes,
 * busy_until), así lo ven todas las pantallas y no se pierde al recargar, y se apaga solo:
 * nadie se acuerda de sacarlo cuando baja el pico (Uber, Square y Owner hacen lo mismo).
 */

/** Opciones del selector (minutos extra). 0 = normal. */
export const BUSY_CHOICES = [0, 10, 15, 20, 30] as const;

/** Cuánto dura el modo ocupado antes de apagarse solo. */
export const BUSY_DURATION_MIN = 60;

export interface BusyState {
  extra: number;
  /** ms epoch; null = apagado. */
  until: number | null;
}

export const BUSY_OFF: BusyState = { extra: 0, until: null };

/** Minutos extra que valen ahora (0 si está apagado o ya venció). */
export function busyExtraAt(b: BusyState, now: number): number {
  return b.extra > 0 && b.until !== null && b.until > now ? b.extra : 0;
}

/** De las columnas de restaurants al estado del cliente. */
export function busyFromRow(extra: number | null | undefined, until: string | null | undefined): BusyState {
  const ms = until ? new Date(until).getTime() : NaN;
  if (!extra || !Number.isFinite(ms) || ms <= Date.now()) return BUSY_OFF;
  return { extra, until: ms };
}
