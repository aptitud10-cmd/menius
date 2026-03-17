/**
 * Dynamic ETA helpers.
 * Uses the Haversine formula to calculate road distance, then applies
 * heuristic speed assumptions to estimate travel time.
 */

const EARTH_RADIUS_KM = 6371;
const AS_CROW_TO_ROAD_FACTOR = 1.35; // road distance ≈ 35% longer than straight line
const SPEED_KMH = 25; // average urban delivery speed (km/h)
const PREP_BASE_MINS = 15; // base kitchen prep time

/** Haversine distance between two lat/lng points, returns km */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Returns a suggested ETA in minutes given:
 * - Restaurant coordinates
 * - Customer delivery address (geocoded via Nominatim in the browser)
 */
export async function fetchSuggestedEta(
  restaurantLat: number,
  restaurantLng: number,
  deliveryAddress: string
): Promise<number | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(deliveryAddress)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const results: { lat: string; lon: string }[] = await res.json();
    if (!results.length) return null;

    const custLat = parseFloat(results[0].lat);
    const custLng = parseFloat(results[0].lon);
    const distKm = haversineKm(restaurantLat, restaurantLng, custLat, custLng) * AS_CROW_TO_ROAD_FACTOR;
    const travelMins = (distKm / SPEED_KMH) * 60;

    return Math.round(PREP_BASE_MINS + travelMins);
  } catch {
    return null;
  }
}

/** Clamp and round an ETA to a sensible range for display */
export function clampEta(mins: number): number {
  return Math.max(5, Math.min(120, Math.round(mins / 5) * 5));
}
