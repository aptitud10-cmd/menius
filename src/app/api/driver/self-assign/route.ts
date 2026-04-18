/**
 * Driver self-assign — public endpoint (no auth).
 * Called automatically when a registered driver scans the delivery QR code.
 * Uses the per-delivery token to identify the order, and the driver's
 * localStorage identity (name + phone) to assign themselves.
 *
 * Unlike the counter's assignDriver action, this does NOT generate a new token.
 * The existing token from the printed receipt stays valid.
 *
 * POST { token, driverName, driverPhone }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`driver-self-assign:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, driverName, driverPhone } = body as {
    token?: string;
    driverName?: string;
    driverPhone?: string;
  };

  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
  if (!driverName?.trim()) return NextResponse.json({ error: 'driverName is required' }, { status: 400 });

  const supabase = createAdminClient();

  // Fetch order by token
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, driver_name, driver_assigned_at, driver_token_expires_at')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found for this token' }, { status: 404 });
  }

  // Reject expired tokens
  if (order.driver_token_expires_at && new Date(order.driver_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  // Reject if order is already terminal
  if (['delivered', 'cancelled'].includes(order.status)) {
    return NextResponse.json({ error: 'Order is already ' + order.status }, { status: 409 });
  }

  // Assign the driver — preserve existing token (don't generate a new one)
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      driver_name: driverName.trim(),
      driver_phone: driverPhone?.trim() || null,
      driver_assigned_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    assigned: {
      name: driverName.trim(),
      phone: driverPhone?.trim() || null,
    },
  });
}
