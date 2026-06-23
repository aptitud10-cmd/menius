/**
 * Tracking liviano de visitas por restaurante en localStorage, para decidir si
 * un comensal es "recurrente" y mostrarle el prompt de instalación de la PWA.
 *
 * Por qué: el que escanea el QR una vez y se va NUNCA instala nada — mostrarle el
 * banner es ruido. El cliente fiel que vuelve al mismo local sí tiene sentido que
 * tenga el ícono en su pantalla. Esto NO toca el servidor: es señal local, y se
 * combina con `cartStore.lastOrder` (ya pidió acá) en MenuShell.
 *
 * Sin PII, sin fechas relativas guardadas como tales: solo un contador y el último
 * timestamp por restaurante.
 */

const KEY_PREFIX = 'menius-visits-';

interface VisitRecord {
  count: number;
  lastVisit: number; // epoch ms
}

function keyFor(restaurantId: string): string {
  return `${KEY_PREFIX}${restaurantId}`;
}

function read(restaurantId: string): VisitRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitRecord>;
    if (typeof parsed.count !== 'number') return null;
    return { count: parsed.count, lastVisit: parsed.lastVisit ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Registra una visita al menú de un restaurante. Cuenta una sola vez por sesión
 * de navegación (ventana de 30 min) para no inflar el contador con re-renders o
 * navegaciones internas dentro de la misma visita.
 * Devuelve el número total de visitas registradas tras esta llamada.
 */
export function registerVisit(restaurantId: string): number {
  if (typeof window === 'undefined' || !restaurantId) return 0;
  const now = Date.now();
  const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 min
  const prev = read(restaurantId);

  // Misma sesión de navegación → no incrementar, solo refrescar lastVisit.
  if (prev && now - prev.lastVisit < SESSION_WINDOW_MS) {
    try {
      localStorage.setItem(keyFor(restaurantId), JSON.stringify({ count: prev.count, lastVisit: now }));
    } catch {
      /* storage lleno / bloqueado — no es crítico */
    }
    return prev.count;
  }

  const next: VisitRecord = { count: (prev?.count ?? 0) + 1, lastVisit: now };
  try {
    localStorage.setItem(keyFor(restaurantId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next.count;
}

/** Lee el conteo de visitas sin registrar una nueva. */
export function getVisitCount(restaurantId: string): number {
  return read(restaurantId)?.count ?? 0;
}
