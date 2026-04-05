export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Auto-cancel reservations that are still pending 2+ hours after their scheduled time
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();

    // Find pending reservations where the scheduled datetime is more than 2 hours ago
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Build a combined datetime using reserved_date + reserved_time and compare against now - 2h
    const { data: expired, error } = await adminDb
      .from('reservations')
      .select('id, restaurant_id, customer_name, customer_phone, reserved_date, reserved_time')
      .eq('status', 'pending')
      .lt('reserved_date', cutoff.split('T')[0]); // dates older than cutoff date (quick pre-filter)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Further filter: only those whose full datetime is past the cutoff
    const now = new Date();
    const toCancel = (expired ?? []).filter(r => {
      const dt = new Date(`${r.reserved_date}T${r.reserved_time}`);
      return now.getTime() - dt.getTime() > 2 * 60 * 60 * 1000;
    });

    if (toCancel.length === 0) {
      return NextResponse.json({ cancelled: 0 });
    }

    const ids = toCancel.map(r => r.id);
    const { error: updateErr } = await adminDb
      .from('reservations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', ids);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ cancelled: ids.length, ids });
  } catch (err) {
    console.error('[auto-cancel-reservations]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
