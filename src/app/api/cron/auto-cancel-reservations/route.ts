export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { localDateTimeToUTC } from '@/lib/date-utils';

const logger = createLogger('auto-cancel-reservations');

const GRACE_MS = 2 * 60 * 60 * 1000;

// Auto-cancel reservations that are still pending 2+ hours after their scheduled time
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();

    // Pre-filter by date only. Add a day of slack: a reservation "yesterday" in
    // a UTC-6 timezone can still be within the grace window right after UTC
    // rolls over, and the exact comparison below is what actually decides.
    const preFilterDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: expired, error } = await adminDb
      .from('reservations')
      .select('id, restaurant_id, customer_name, customer_phone, reserved_date, reserved_time')
      .eq('status', 'pending')
      .lte('reserved_date', preFilterDate);

    if (error) {
      logger.error('Failed to fetch pending reservations', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // reserved_date/reserved_time are the restaurant's WALL CLOCK (date + time
    // without time zone). Parsing them directly on a UTC server read 19:00 local
    // as 19:00 UTC, so for a UTC-4 restaurant the "2h after" check fired 2h
    // BEFORE the guest was due — the cron was destroying live reservations
    // instead of cleaning up no-shows. Resolve each one against its own tz.
    const restaurantIds = Array.from(new Set((expired ?? []).map((r) => r.restaurant_id)));
    const tzByRestaurant = new Map<string, string>();
    if (restaurantIds.length > 0) {
      const { data: rests, error: restErr } = await adminDb
        .from('restaurants')
        .select('id, timezone')
        .in('id', restaurantIds);
      if (restErr) {
        logger.error('Failed to fetch restaurant timezones', { error: restErr.message });
        return NextResponse.json({ error: restErr.message }, { status: 500 });
      }
      for (const r of rests ?? []) {
        tzByRestaurant.set(r.id, r.timezone || 'UTC');
      }
    }

    const now = Date.now();
    const toCancel = (expired ?? []).filter((r) => {
      const tz = tzByRestaurant.get(r.restaurant_id) ?? 'UTC';
      const dt = localDateTimeToUTC(r.reserved_date, r.reserved_time, tz);
      // Unparseable row: leave it alone rather than cancel on a bogus instant.
      if (!dt) {
        logger.warn('Skipping reservation with unparseable datetime', {
          reservationId: r.id,
          reserved_date: r.reserved_date,
          reserved_time: r.reserved_time,
          tz,
        });
        return false;
      }
      return now - dt.getTime() > GRACE_MS;
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
    logger.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
