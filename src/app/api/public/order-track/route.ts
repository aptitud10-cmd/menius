import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`order-track:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const orderNumber = searchParams.get('order');
  const restaurantId = searchParams.get('restaurant');

  if (!orderNumber || !restaurantId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: 'invalid_restaurant' }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    // Only select fields needed for the tracking UI — never expose payment tokens or internal tokens
    const { data: order, error } = await db
      .from('orders')
      .select(`
        id, order_number, status, order_type, total, subtotal, tax_amount, tip_amount,
        delivery_fee, discount_amount, payment_method, notes, created_at, updated_at,
        customer_name, customer_phone, customer_email, delivery_address,
        estimated_ready_minutes,
        driver_lat, driver_lng, driver_picked_up_at, driver_at_door_at, driver_delivered_at,
        delivery_photo_url,
        table:table_id(name),
        order_items(
          id, qty, unit_price, line_total, notes,
          product:product_id(name),
          variant:variant_id(name)
        )
      `)
      .eq('order_number', orderNumber)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const shaped = {
      ...order,
      table_name: (order.table as any)?.name ?? null,
      order_items: ((order.order_items ?? []) as any[]).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: item.notes,
        product_name: item.product?.name ?? null,
        variant_name: item.variant?.name ?? null,
      })),
    };

    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
