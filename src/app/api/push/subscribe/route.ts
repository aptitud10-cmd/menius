export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`push-sub:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { subscription, order_id } = await request.json();

    if (!subscription?.endpoint || !order_id) {
      return NextResponse.json({ error: 'subscription and order_id required' }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys?.p256dh ?? '',
        keys_auth: subscription.keys?.auth ?? '',
        order_id,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
