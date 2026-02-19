import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('order_number');
    const restaurantId = searchParams.get('restaurant_id');

    if (!orderNumber || !restaurantId) {
      return NextResponse.json({ error: 'order_number y restaurant_id requeridos' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, customer_name, notes, total, created_at,
        order_items (
          id, qty, unit_price, line_total, notes,
          products ( name, image_url ),
          product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) )
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
    console.error('[orders/status GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
