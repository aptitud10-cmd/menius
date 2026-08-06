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

    const { subscription, order_id } = await request.json();

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

    // Verify the order exists before storing the subscription
    const { data: order } = await adminDb
      .from('orders')
      .select('id')
      .eq('id', order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Upsert by endpoint (globally UNIQUE in prod): one row per browser,
    // re-pointed to its most recent order. The old payload wrote a
    // `subscription` column that doesn't exist — no subscription was ever saved.
    const { error } = await adminDb
      .from('push_subscriptions')
      .upsert(
        {
          order_id,
          endpoint: subscription.endpoint,
          keys_p256dh: p256dh,
          keys_auth: auth,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

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
