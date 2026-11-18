import type { createAdminClient } from '@/lib/supabase/admin';
import { getCachedToken, setCachedToken } from '@/lib/tracking/token-cache';

export type ResolvedDriverToken = { orderId: string } | { error: string; status: number };

/**
 * Token del repartidor → pedido (Redis primero, Postgres si no está).
 * Solo delivery, no cerrado, no vencido. Al cerrar un pedido se invalida la caché.
 */
export async function resolveDriverToken(
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
): Promise<ResolvedDriverToken> {
  const tokenPrefix = token.slice(0, 16);
  let orderId: string | null = null;
  let tokenExpiresAt: string | null = null;

  const cached = await getCachedToken(tokenPrefix);
  if (cached) {
    orderId = cached.orderId;
    tokenExpiresAt = cached.expiresAt;
  } else {
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_type, status, driver_token_expires_at')
      .eq('driver_tracking_token', token)
      .maybeSingle();
    if (!order) return { error: 'Invalid token', status: 404 };
    const o = order as { id: string; order_type: string; status: string; driver_token_expires_at: string | null };
    // Solo delivery acepta pings de GPS (si no, se inyectan coordenadas en un pickup).
    if (o.order_type !== 'delivery') return { error: 'Location is only valid for delivery orders', status: 409 };
    if (['delivered', 'completed', 'cancelled'].includes(o.status)) return { error: 'Order closed', status: 409 };
    orderId = o.id;
    tokenExpiresAt = o.driver_token_expires_at ?? null;
    await setCachedToken(tokenPrefix, { orderId, expiresAt: tokenExpiresAt });
  }
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) return { error: 'Token expired', status: 410 };
  return { orderId };
}
