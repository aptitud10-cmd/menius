/**
 * GET /api/driver/team?token=xxx — los repartidores activos del restaurante,
 * para que el que escaneó el ticket diga quién es ("¿Quién eres?").
 *
 * Público como el resto de /api/driver/*: solo con el token de un pedido
 * delivery ABIERTO (el ticket que tiene en la mano). Un ticket ya entregado
 * —el que queda en la bolsa del cliente— no lista nada. Devuelve id y nombre;
 * nunca teléfonos.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rl = await checkRateLimitAsync(`driver-team:${getClientIP(req)}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length > 200) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const db = createAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('restaurant_id, order_type, status, driver_token_expires_at')
    .eq('driver_tracking_token', token)
    .maybeSingle();
  if (!order || order.order_type !== 'delivery') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (['delivered', 'completed', 'cancelled'].includes(order.status as string)) {
    return NextResponse.json({ error: 'Order closed' }, { status: 409 });
  }
  const exp = order.driver_token_expires_at as string | null;
  if (exp && Date.parse(exp) < Date.now()) return NextResponse.json({ error: 'Token expired' }, { status: 410 });

  const { data: drivers } = await db
    .from('drivers')
    .select('id, name')
    .eq('restaurant_id', order.restaurant_id as string)
    .eq('is_active', true)
    .order('name')
    .limit(30);

  return NextResponse.json({
    restaurantId: order.restaurant_id,
    drivers: (drivers ?? []).map((d) => ({ id: d.id as string, name: String(d.name ?? '').trim() })).filter((d) => d.name),
  });
}
