/**
 * Parseo de lo que manda el uploader nativo de Transistorsoft (app del repartidor).
 *
 * Cuerpo: { location: Location | Location[], ...params }. Con batchSync es un
 * array (todo lo que quedó guardado sin señal); sin batchSync, un objeto.
 * Del lote solo importa el punto más nuevo que sea creíble: el mapa del cliente
 * muestra dónde está ahora, no el recorrido.
 */

export interface DriverFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** Hora del GPS (ISO). */
  recordedAt: string;
}

/** Peor que esto no mueve el pin (entre edificios de NYC el GPS rebota). */
export const MAX_ACCURACY_M = 100;
/** Un timestamp más adelantado que esto respecto del servidor es un reloj roto. */
const MAX_CLOCK_SKEW_MS = 2 * 60_000;

function toFix(raw: unknown, nowMs: number): DriverFix | null {
  if (!raw || typeof raw !== 'object') return null;
  const loc = raw as { coords?: unknown; timestamp?: unknown; mock?: unknown; sample?: unknown };
  // mock = ubicación falsa (apps de "fake GPS"); sample = lectura intermedia.
  if (loc.mock === true || loc.sample === true) return null;
  const c = loc.coords as { latitude?: unknown; longitude?: unknown; accuracy?: unknown } | undefined;
  if (!c) return null;
  const { latitude: lat, longitude: lng, accuracy } = c;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const acc = typeof accuracy === 'number' && isFinite(accuracy) && accuracy >= 0 ? accuracy : null;
  if (acc != null && acc > MAX_ACCURACY_M) return null;
  const ts = typeof loc.timestamp === 'number' ? loc.timestamp
    : typeof loc.timestamp === 'string' ? Date.parse(loc.timestamp) : NaN;
  if (!isFinite(ts)) return null;
  // Reloj adelantado: se usa la hora del servidor para no "congelar" puntos futuros.
  const tsMs = ts > nowMs + MAX_CLOCK_SKEW_MS ? nowMs : ts;
  return { lat, lng, accuracy: acc, recordedAt: new Date(tsMs).toISOString() };
}

/** El punto creíble más nuevo del cuerpo, o null si no hay ninguno. */
export function latestFix(location: unknown, nowMs: number = Date.now()): DriverFix | null {
  const list = Array.isArray(location) ? location : [location];
  let best: DriverFix | null = null;
  for (const raw of list) {
    const f = toFix(raw, nowMs);
    if (f && (!best || f.recordedAt > best.recordedAt)) best = f;
  }
  return best;
}
