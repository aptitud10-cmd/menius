/**
 * POST /api/public/customer-reply
 * Customer-side action on an order. Currently supports:
 *   action: 'coming_out' — customer taps "Ya salgo" when driver is at the door.
 *
 * No auth required — uses order_id to look up the order.
 * Rate-limited per order to prevent spam.
 *
 * NOTE: WhatsApp/SMS driver notification was removed. This endpoint validates the
 * request and returns ok so the client UI still provides feedback to the customer.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

const ALLOWED_ACTIONS = ['coming_out'] as const;

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`customer-reply:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { orderId, action } = body as { orderId?: string; action?: string };

  if (!orderId || !action) {
    return NextResponse.json({ error: 'orderId and action required' }, { status: 400 });
  }

  if (!UUID_RE.test(String(orderId))) {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const orderRl = await checkRateLimitAsync(`customer-reply:order:${orderId}`, { limit: 3, windowSec: 300 });
  if (!orderRl.allowed) {
    return NextResponse.json({ ok: true, notified: false, reason: 'cooldown' });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, order_type')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // 'coming_out' is only meaningful for delivery orders (driver at the door)
  if (action === 'coming_out' && (order as any).order_type !== 'delivery') {
    return NextResponse.json({ ok: true, notified: false, reason: 'not_delivery' });
  }

  // Only valid when the order is in 'ready' state (driver arrived)
  if (action === 'coming_out' && order.status !== 'ready') {
    return NextResponse.json({ ok: true, notified: false, reason: 'wrong_status' });
  }

  return NextResponse.json({ ok: true, notified: true });
}
