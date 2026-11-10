export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await checkRateLimitAsync(`push-subscribe:${ip}`, { limit: 20, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { subscription, order_id, t } = await request.json();

    if (!subscription || !order_id) {
      return NextResponse.json({ error: 'subscription and order_id required' }, { status: 400 });
    }

    if (!UUID_RE.test(String(order_id))) {
      return NextResponse.json({ error: 'order_id must be a valid UUID' }, { status: 400 });
    }

    // Validate subscription object has the required Web Push fields
    if (typeof subscription !== 'object' || !subscription.endpoint || typeof subscription.endpoint !== 'string') {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;
    if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription keys' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Solo quien tiene la llave del pedido puede suscribirse: los avisos
    // llevan el enlace con la llave del cliente (nombre, dirección, GPS del
    // repartidor, foto de la puerta). El id del pedido no es secreto.
    const token = typeof t === 'string' ? t : '';
    if (!token || token.length > 200) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const { data: order } = await adminDb
      .from('orders')
      .select('id, customer_token, driver_tracking_token')
      .eq('id', order_id)
      .maybeSingle();

    const okToken = !!order && (token === String(order.customer_token ?? '') || token === String(order.driver_tracking_token ?? ''));
    if (!order || !okToken) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Una fila por (pedido, navegador): un mismo teléfono puede seguir varios
    // pedidos a la vez (migración 20261110d). Mientras siga la restricción vieja
    // por endpoint, el mismo navegador en otro pedido choca (23505) → se vuelve
    // al comportamiento anterior: el navegador sigue al último pedido.
    const row = {
      order_id,
      endpoint: subscription.endpoint,
      keys_p256dh: p256dh,
      keys_auth: auth,
      created_at: new Date().toISOString(),
    };
    let { error } = await adminDb
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'order_id,endpoint' });
    if (error?.code === '23505' || error?.code === '42P10') {
      ({ error } = await adminDb.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' }));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  return NextResponse.json({ publicKey });
}
