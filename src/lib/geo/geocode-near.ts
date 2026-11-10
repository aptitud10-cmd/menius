/**
 * Geocodifica una dirección escrita a mano, sesgada a la zona del restaurante.
 * Para el respaldo del servidor cuando el checkout no trae coordenadas (el
 * cliente no eligió una sugerencia): sin sesgo, "3915 111 street" (Corona,
 * Queens) caía en Canadá. Devuelve null si no hay resultado confiable.
 */
export async function geocodeNear(
  address: string,
  near: { lat: number; lng: number },
  opts: { country?: string | null; timeoutMs?: number } = {},
): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !address.trim()) return null;
  const params = new URLSearchParams({
    q: address,
    access_token: token,
    limit: '1',
    proximity: `${near.lng},${near.lat}`,
    bbox: `${near.lng - 0.6},${near.lat - 0.45},${near.lng + 0.6},${near.lat + 0.45}`,
    types: 'address,street',
  });
  if (opts.country) params.set('country', opts.country.toLowerCase());
  try {
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords as [number, number];
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
