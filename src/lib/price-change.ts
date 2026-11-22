/**
 * Reglas del cambio de precio desde el Counter (Tanda 3). Las usan la pantalla y
 * /api/counter/price: la misma regla en los dos lados.
 */

/** Alto a propósito: hay tiendas en MXN/COP con precios de 5–6 cifras. */
export const MAX_PRICE = 9_999_999.99;
/** Más allá de esta proporción (±50 %) se pide confirmar dos veces. */
export const BIG_CHANGE = 0.5;

export const toCents = (n: number) => Math.round(n * 100) / 100;

export function isBigChange(oldPrice: number, newPrice: number): boolean {
  if (oldPrice <= 0) return false;
  return Math.abs(newPrice - oldPrice) / oldPrice > BIG_CHANGE;
}

/**
 * Lo que escribe la persona → precio, o null si no es un precio válido.
 * Acepta "13.95", "13,95", "$13.95", "13". Máximo 2 decimales.
 */
export function parsePrice(raw: string): number | null {
  const s = raw.trim().replace(/^\$/, '').replace(',', '.');
  if (!/^\d{1,7}(\.\d{0,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_PRICE) return null;
  return toCents(n);
}
