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
 * Call this after EVERY order state change:
 *   - updateOrderStatus() in restaurant.ts
 *   - driver/status route (picked_up, at_door, delivered)
 *   - cron/auto-complete-pickup
 */
export async function broadcastOrderUpdate(
  orderId: string,
  status: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
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
  } catch {
    // Non-critical — the 5-second polling fallback in OrderTracker covers it.
  }
}
