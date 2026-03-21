export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const logger = createLogger('orders-status');

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 lookups per minute per IP to prevent order enumeration
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`order-status:${ip}`, { limit: 30, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('order_number');
    const restaurantId = searchParams.get('restaurant_id');

    if (!orderNumber || !restaurantId) {
      return NextResponse.json({ error: 'order_number y restaurant_id requeridos' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Use the SECURITY DEFINER RPC function — works with anon key even if
    // service-role key is missing, because the function bypasses RLS internally.
    const { data: rows, error } = await adminDb
      .rpc('get_order_tracking', {
        p_order_number: orderNumber,
        p_restaurant_id: restaurantId,
      });

    if (error) {
      logger.error('order fetch error', { error: error.message, orderNumber, restaurantId });
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    const order = rows?.[0] ?? null;
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Fetch items separately so a join failure never blocks the tracker
    let order_items: any[] = [];
    try {
      const { data: items } = await adminDb
        .from('order_items')
        .select(`
          id, qty, unit_price, line_total, notes,
          products ( name, image_url ),
          product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        `)
        .eq('order_id', order.id);
      order_items = items ?? [];
    } catch (itemsErr) {
      logger.warn('order_items fetch failed — returning order without items', {
        order_id: order.id,
        error: itemsErr instanceof Error ? itemsErr.message : String(itemsErr),
      });
    }

    return NextResponse.json({ order: { ...order, order_items } });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
