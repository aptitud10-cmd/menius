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

    const { data: order, error } = await adminDb
      .from('orders')
      .select(`
        id, order_number, status, customer_name, customer_phone, notes, total, created_at,
        order_type, payment_method, delivery_address,
        order_items (
          id, qty, unit_price, line_total, notes,
          products ( name, image_url ),
          product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
