/**
 * POST /api/public/order-customer
 * Acciones del cliente desde su seguimiento, solo con la llave del pedido (?t=):
 *  - action 'arrived': pickup listo → "Ya llegué" (la tablet del mostrador avisa).
 *  - action 'notes':   editar las instrucciones de entrega mientras el
 *                      repartidor todavía no recogió el pedido.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { sanitizeMultiline } from '@/lib/sanitize';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';
import { UUID_RE } from '@/lib/constants';
import { createLogger } from '@/lib/logger';

const logger = createLogger('order-customer');

const CLOSED = ['delivered', 'completed', 'cancelled', 'served'];

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`order-customer:${ip}`, { limit: 20, windowSec: 60 });
  if (!rl.allowed) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const body = await req.json().catch(() => null) as
    | { order_id?: unknown; t?: unknown; action?: unknown; notes?: unknown }
    | null;
  const orderId = typeof body?.order_id === 'string' ? body.order_id : '';
  const token = typeof body?.t === 'string' ? body.t : '';
  const action = body?.action;
  if (!UUID_RE.test(orderId) || !token || token.length > 200 || (action !== 'arrived' && action !== 'notes')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const db = createAdminClient();
  // Sin customer_arrived_at en el select: así editar notas no depende de esa columna.
  const { data: order, error: readErr } = await db
    .from('orders')
    .select('id, status, order_type, customer_token, driver_tracking_token, driver_picked_up_at')
    .eq('id', orderId)
    .maybeSingle();
  if (readErr) {
    logger.error('read failed', { orderId, code: readErr.code });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  const o = order as {
    id: string; status: string; order_type: string; customer_token: string | null;
    driver_tracking_token: string | null; driver_picked_up_at: string | null;
  } | null;
  const authorized = !!o && (token === String(o.customer_token ?? '') || token === String(o.driver_tracking_token ?? ''));
  if (!o || !authorized) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (action === 'arrived') {
    if (o.order_type !== 'pickup' || CLOSED.includes(o.status)) {
      return NextResponse.json({ error: 'not_allowed' }, { status: 409 });
    }
    // Idempotente y atómico: solo marca si todavía no estaba marcado, así
    // tocar dos veces no vuelve a sonar en la tablet.
    const now = new Date().toISOString();
    const { data: rows, error } = await db.from('orders')
      .update({ customer_arrived_at: now, updated_at: now })
      .eq('id', o.id)
      .is('customer_arrived_at', null)
      .select('id');
    if (error) {
      logger.error('arrived update failed', { orderId: o.id, code: error.code });
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
    if (rows && rows.length > 0) void broadcastOrderUpdate(o.id, o.status);
    return NextResponse.json({ ok: true, arrived_at: now });
  }

  // action === 'notes'
  if (o.order_type !== 'delivery' || CLOSED.includes(o.status) || o.status === 'out_for_delivery' || o.driver_picked_up_at) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 409 });
  }
  const notes = sanitizeMultiline(typeof body?.notes === 'string' ? body.notes : '', 500);
  const { error } = await db.from('orders').update({ notes, updated_at: new Date().toISOString() }).eq('id', o.id);
  if (error) {
    logger.error('notes update failed', { orderId: o.id, code: error.code });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  void broadcastOrderUpdate(o.id, o.status);
  return NextResponse.json({ ok: true, notes });
}
