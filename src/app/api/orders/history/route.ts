export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/orders/history?restaurant_id=X&email=Y
 * Returns the last 20 orders for a customer email at a given restaurant.
 * Uses admin client so RLS doesn't block the public lookup.
 * Rate-limited to prevent email enumeration abuse.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = checkRateLimit(`order-history:${ip}`, { limit: 10, windowSec: 60 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();

  if (!restaurantId || !email) {
    return NextResponse.json({ error: 'restaurant_id and email required' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      order_type,
      payment_method,
      total,
      created_at,
      order_items (
        id,
        product_name,
        variant_name,
        quantity,
        unit_price
      )
    `)
    .eq('restaurant_id', restaurantId)
    .ilike('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}
