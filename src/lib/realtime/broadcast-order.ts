/**
 * broadcastOrderUpdate — server-side Realtime push.
 *
 * Uses Supabase's HTTP Broadcast API so no WebSocket is needed.
 * Works in Vercel serverless / edge functions with zero cold-start overhead.
 *
 * Why not `postgres_changes`?
 *   postgres_changes fires only for users who can SELECT the row via RLS.
 *   Customers are anonymous (no Supabase session), so their anon key has no
 *   SELECT access on `orders` — events are silently dropped.
 *
 * Why broadcast works?
 *   Broadcast channels are NOT gated by RLS. Any client that knows the channel
 *   name can subscribe. We use the order UUID (opaque, server-issued) as the
 *   channel name, so only the customer who received it can subscribe.
 *
 * Channel pattern: `order-track:{orderId}` (UUID — never exposed in URL)
 *
 * Call this after EVERY order state change or GPS update:
 *   - updateOrderStatus() in restaurant.ts
 *   - driver/status route (picked_up, at_door, delivered)
 *   - driver/location route (GPS coordinates — triggers map refresh)
 *   - cron/auto-complete-pickup
 */
import { createLogger } from '@/lib/logger';

const logger = createLogger('broadcast-order');

export async function broadcastOrderUpdate(
  orderId: string,
  status: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Sin env vars el broadcast se cae en silencio y el cliente queda sirviendose
    // solo del polling de 5s. Se loguea para que sea diagnosticable en produccion.
    logger.warn('broadcast omitido: falta SUPABASE_URL o SERVICE_ROLE_KEY');
    return;
  }

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `order-track:${orderId}`,
            event: 'status_change',
            payload: { orderId, status, ts: Date.now() },
          },
        ],
      }),
    });
    // Without this check a rotated key / API change kills realtime silently and
    // the 5s polling masks it forever — degrade visibly, not invisibly.
    if (!res.ok) {
      logger.warn('status_change broadcast failed', { orderId, status: res.status });
    }
  } catch {
    // Non-critical — the 5-second polling fallback in OrderTracker covers it.
  }
}

/**
 * broadcastDriverLocation — emite coordenadas GPS del repartidor en tiempo real.
 *
 * Usa un evento 'location_update' separado de 'status_change' para que el cliente
 * pueda actualizar sólo el marcador del mapa sin hacer un refetch HTTP completo.
 * Llamado desde POST /api/driver/location tras cada update de GPS válido.
 */
export async function broadcastDriverLocation(
  orderId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Sin env vars el broadcast se cae en silencio y el cliente queda sirviendose
    // solo del polling de 5s. Se loguea para que sea diagnosticable en produccion.
    logger.warn('broadcast omitido: falta SUPABASE_URL o SERVICE_ROLE_KEY');
    return;
  }

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `order-track:${orderId}`,
            event: 'location_update',
            payload: { orderId, lat, lng, ts: Date.now() },
          },
        ],
      }),
    });
    if (!res.ok) {
      logger.warn('location_update broadcast failed', { orderId, status: res.status });
    }
  } catch {
    // Non-critical — polling fallback covers missed packets.
  }
}
