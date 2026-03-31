import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderNumber = searchParams.get('order');
  const restaurantId = searchParams.get('restaurant');

  if (!orderNumber || !restaurantId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    const { data: order, error } = await db
      .from('orders')
      .select(`
        id, order_number, status, order_type, payment_method,
        customer_name, customer_phone, customer_email,
        delivery_address, notes, total, tax_amount, tip_amount,
        delivery_fee, discount_amount, estimated_ready_minutes,
        created_at, updated_at, scheduled_for,
        driver_name, driver_phone, driver_lat, driver_lng,
        driver_updated_at, driver_tracking_token, delivery_photo_url,
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
