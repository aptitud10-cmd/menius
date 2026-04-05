export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/sanitize';
import { captureError } from '@/lib/error-reporting';
import { UUID_RE } from '@/lib/constants';

/**
 * POST /api/reservations
 * Creates a new reservation from the public menu page.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`reservations:${ip}`, { limit: 5, windowSec: 300 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const {
      restaurant_id,
      customer_name,
      customer_phone,
      customer_email,
      party_size,
      reserved_date,
      reserved_time,
      notes,
    } = body;

    if (!restaurant_id || typeof restaurant_id !== 'string' || !UUID_RE.test(restaurant_id)) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }
    if (!customer_name || typeof customer_name !== 'string') {
      return NextResponse.json({ error: 'customer_name required' }, { status: 400 });
    }
    if (!reserved_date || !reserved_time) {
      return NextResponse.json({ error: 'Date and time required' }, { status: 400 });
    }
    if (!party_size || party_size < 1 || party_size > 50) {
      return NextResponse.json({ error: 'Invalid party size' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('id, reservations_enabled, reservation_max_party_size')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    if (!restaurant.reservations_enabled) {
      return NextResponse.json({ error: 'Reservations not enabled' }, { status: 403 });
    }
    if (party_size > (restaurant.reservation_max_party_size || 10)) {
      return NextResponse.json({ error: 'Party size too large' }, { status: 400 });
    }

    const { data: reservation, error } = await adminDb
      .from('reservations')
      .insert({
        restaurant_id,
        customer_name: sanitizeText(customer_name),
        customer_phone: customer_phone ? sanitizeText(customer_phone) : null,
        customer_email: customer_email ? sanitizeText(customer_email) : null,
        party_size: Number(party_size),
        reserved_date,
        reserved_time,
        notes: notes ? sanitizeText(notes) : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(error.message), { route: '/api/reservations' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err: any) {
    captureError(err, { route: '/api/reservations' });
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 });
  }
}
