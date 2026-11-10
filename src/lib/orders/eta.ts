/**
 * Tiempo prometido al cliente, calculado por pedido (no un número fijo del
 * restaurante): el plato más lento del carrito + el viaje del repartidor.
 * Lo usan el checkout y el Counter, así ambos dicen lo mismo.
 */

/** Opciones de tiempo de la tablet ("Aceptar · N min"). */
export const PREP_CHOICES = [10, 15, 20, 30, 45] as const;

/** La opción más chica que NO promete menos de lo que tarda (12 → 15, 25 → 30). */
export function nearestChoice(m: number) {
  if (!Number.isFinite(m) || m <= 0) return PREP_CHOICES[1];
  return PREP_CHOICES.find((c) => c >= m) ?? PREP_CHOICES[PREP_CHOICES.length - 1];
}

type ItemWithPrep = { product?: { prep_time_minutes?: number | null } | null };

/** Minutos de cocina del pedido = el plato más lento; null si ningún plato tiene tiempo. */
export function kitchenMinutes(items: ItemWithPrep[]): number | null {
  const times = items
    .map((i) => Number(i.product?.prep_time_minutes ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  return times.length ? Math.max(...times) : null;
}

// Repartidor en bicicleta eléctrica: 20 mph de máxima, ~15 mph (24 km/h) de
// promedio real con semáforos y cruces. Las calles suman ~30 % a la línea recta.
export const COURIER_AVG_KMH = 24;
export const ROAD_FACTOR = 1.3;
// Escanear el QR, salir, estacionar la bici y llegar a la puerta.
export const HANDOFF_MIN = 4;

/** Minutos de viaje del repartidor para una distancia en línea recta (km). */
export function travelMinutes(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return HANDOFF_MIN;
  return Math.ceil(((km * ROAD_FACTOR) / COURIER_AVG_KMH) * 60) + HANDOFF_MIN;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ceil5 = (n: number) => Math.ceil(n / 5) * 5;

export interface EtaRestaurant {
  latitude?: number | null;
  longitude?: number | null;
  delivery_radius_km?: number | null;
  estimated_delivery_minutes?: number | null;
}

/**
 * Minutos que se le prometen al cliente, o null si no hay con qué calcular.
 * - Recoger / mesa: el tiempo de cocina, redondeado a la opción de la tablet.
 * - Delivery: cocina + viaje según la distancia (o medio radio si el cliente
 *   escribió la dirección a mano), redondeado a 5.
 * Si ningún plato tiene tiempo cargado se usa el número general del
 * restaurante, como antes.
 */
export function estimateMinutes(opts: {
  items: ItemWithPrep[];
  orderType: string | null | undefined;
  restaurant: EtaRestaurant;
  to?: { lat: number; lng: number } | null;
}): number | null {
  const { items, orderType, restaurant, to } = opts;
  const kitchen = kitchenMinutes(items);
  if (kitchen == null) return restaurant.estimated_delivery_minutes ?? null;
  const prep = nearestChoice(kitchen);
  if (orderType !== 'delivery') return prep;

  const rLat = Number(restaurant.latitude);
  const rLng = Number(restaurant.longitude);
  const hasRest = restaurant.latitude != null && restaurant.longitude != null && Number.isFinite(rLat) && Number.isFinite(rLng);
  let km: number | null = null;
  if (hasRest && to) km = haversineKm(rLat, rLng, to.lat, to.lng);
  else if (Number(restaurant.delivery_radius_km) > 0) km = Number(restaurant.delivery_radius_km) / 2;
  if (km == null) return restaurant.estimated_delivery_minutes ?? ceil5(prep + 15);
  return ceil5(prep + travelMinutes(km));
}
