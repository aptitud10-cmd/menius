export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subscription, order_id } = await request.json();

    if (!subscription || !order_id) {
      return NextResponse.json({ error: 'subscription and order_id required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Upsert — same endpoint+keys = same subscription
    const { error } = await adminDb
      .from('push_subscriptions')
      .upsert(
        { order_id, subscription, created_at: new Date().toISOString() },
        { onConflict: 'order_id,endpoint' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  return NextResponse.json({ publicKey });
}
