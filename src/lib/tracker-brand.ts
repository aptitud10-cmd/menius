// Color del restaurante en el seguimiento del pedido.
//
// Regla de diseño: el color del restaurante marca el ESTADO del pedido (check,
// pasos, ruta del mapa, código del mostrador, logo sin imagen). Lo que se toca
// (botones, enlaces) sigue en el verde de MENIUS, igual que el checkout.
//
// El dueño elige cualquier color; si no se lee sobre blanco (WCAG 1.4.11 pide
// 3:1 para marcas gráficas) o no hay color, se usa tinta neutra. Nunca el verde
// de los botones: sobre blanco no llega a 2:1 y mezclaría estado con acción.
import { contrast, isHex, mix } from './color-contrast';

export const TRACKER_NEUTRAL = '#1D1D1F';
const WHITE = '#FFFFFF';
const DARK_INK = '#111114';

export interface TrackerBrand {
  /** Color de estado (puntos, ruta, código del mostrador). */
  brand: string;
  /** Texto e íconos SOBRE el color de estado. */
  ink: string;
  /** Fondo suave derivado (íconos de filas, avisos buenos). */
  soft: string;
  /** true si se usó el respaldo neutro. */
  fallback: boolean;
}

/** Normaliza lo que guarda el panel: "#b8336a" → "#B8336A"; cualquier otra cosa → null. */
export function normalizeBrandColor(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return isHex(v) ? v.toUpperCase() : null;
}

export function trackerBrand(raw?: string | null): TrackerBrand {
  const hex = normalizeBrandColor(raw);
  const usable = hex != null && contrast(hex, WHITE) >= 3;
  const brand = usable ? hex : TRACKER_NEUTRAL;
  // El texto sobre el color va en el que más contraste dé (blanco casi siempre).
  const ink = contrast(brand, WHITE) >= contrast(brand, DARK_INK) ? WHITE : DARK_INK;
  return { brand, ink, soft: mix(brand, WHITE, 0.9), fallback: !usable };
}
