/** Lo del PIN del panel que también usa el navegador (sin node:crypto). */

/** Minutos que el panel queda abierto en la tablet sin que nadie la toque. */
export const PANEL_UNLOCK_MINUTES = 10;
export const PIN_MAX_ATTEMPTS = 5;

/** 4 a 6 dígitos, nada más. */
export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

/** Hasta cuándo queda abierto el panel si se desbloquea o se renueva ahora. */
export function panelUnlockUntil(now = Date.now()): string {
  return new Date(now + PANEL_UNLOCK_MINUTES * 60_000).toISOString();
}
