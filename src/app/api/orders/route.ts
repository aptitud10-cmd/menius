import { createClient } from '@/lib/supabase/server';
import { publicOrderSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, customer_name, notes, items, promo_code, discount_amount } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
    }

    const parsed = publicOrderSchema.safeParse({ customer_name, notes, items });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const supabase = createClient();

    // Verify restaurant exists
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('id', restaurant_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Generate order number
    const { data: orderNum } = await supabase.rpc('generate_order_number', { rest_id: restaurant_id });
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Calculate total from items
    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.line_total, 0);
    const discountAmt = Number(discount_amount) || 0;
    const total = Math.max(0, subtotal - discountAmt);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id,
        order_number: orderNumber,
        customer_name: parsed.data.customer_name,
        notes: parsed.data.notes,
        total,
        status: 'pending',
        promo_code: promo_code || '',
        discount_amount: discountAmt,
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Insert order items + extras
    for (const item of parsed.data.items) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
        })
        .select()
        .single();

      if (orderItem && item.extras.length > 0) {
        await supabase.from('order_item_extras').insert(
          item.extras.map((ex) => ({
            order_item_id: orderItem.id,
            extra_id: ex.extra_id,
            price: ex.price,
          }))
        );
      }
    }

    // Increment promo usage if applicable
    if (promo_code) {
      try {
        await supabase.rpc('increment_promo_usage', { p_code: promo_code.toUpperCase().trim(), p_restaurant_id: restaurant_id });
      } catch {
        // Non-critical, ignore
      }
    }

    return NextResponse.json({
      order_number: order.order_number,
      order_id: order.id,
      slug: restaurant.slug,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
