export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('test-order');

export async function POST() {
  try {
    const { restaurantId } = await getDashboardContext();
    const adminDb = createAdminClient();

    // Get restaurant info
    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('id, name, currency, slug')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Fetch up to 3 in-stock products from this restaurant
    const { data: products } = await adminDb
      .from('products')
      .select('id, name, price')
      .eq('restaurant_id', restaurantId)
      .eq('in_stock', true)
      .limit(3);

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'El restaurante no tiene productos disponibles para crear un pedido de prueba.' },
        { status: 400 }
      );
    }

    // Generate order number
    const { data: orderNum } = await adminDb.rpc('generate_order_number', { rest_id: restaurantId });
    const orderNumber = orderNum ?? `TEST-${Date.now().toString(36).toUpperCase()}`;

    const subtotal = products.reduce((sum, p) => sum + Number(p.price), 0);

    // Insert test order
    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        order_number: orderNumber,
        customer_name: 'Cliente Prueba 🧪',
        customer_phone: '5500000000',
        customer_email: null,
        notes: 'Pedido de prueba — puedes cancelarlo',
        total: subtotal,
        status: 'pending',
        order_type: 'pickup',
        payment_method: 'cash',
        promo_code: '',
        discount_amount: 0,
      })
      .select()
      .single();

    if (orderError) {
      logger.error('test order insert failed', { error: orderError.message });
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Insert one order_item per product (qty 1)
    const { error: itemsError } = await adminDb
      .from('order_items')
      .insert(
        products.map((p) => ({
          order_id: order.id,
          product_id: p.id,
          qty: 1,
          unit_price: Number(p.price),
          line_total: Number(p.price),
          notes: null,
          variant_id: null,
        }))
      );

    if (itemsError) {
      logger.error('test order_items insert failed', { error: itemsError.message });
      // Rollback
      await adminDb.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Error guardando items del pedido de prueba' }, { status: 500 });
    }

    logger.info('test order created', { order_id: order.id, order_number: orderNumber, restaurant_id: restaurantId });

    return NextResponse.json({ order_id: order.id, order_number: orderNumber });
  } catch (err) {
    logger.error('test order exception', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
