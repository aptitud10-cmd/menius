import { createClient } from '@/lib/supabase/server';
import { publicOrderSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/notifications/order-notifications';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`order:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();

    // Sanitize all user-facing text inputs
    const restaurant_id = body.restaurant_id;
    const customer_name = sanitizeText(body.customer_name, 100);
    const customer_email = sanitizeEmail(body.customer_email);
    const notes = sanitizeMultiline(body.notes, 500);
    const items = body.items;
    const promo_code = sanitizeText(body.promo_code, 50);
    const discount_amount = body.discount_amount;
    const order_type = sanitizeText(body.order_type, 20);
    const payment_method = sanitizeText(body.payment_method, 20);
    const delivery_address = sanitizeMultiline(body.delivery_address, 300);

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
    }

    const parsed = publicOrderSchema.safeParse({ customer_name, notes, items });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('id', restaurant_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const { data: orderNum } = await supabase.rpc('generate_order_number', { rest_id: restaurant_id });
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}`;

    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.line_total, 0);
    const discountAmt = Number(discount_amount) || 0;
    const total = Math.max(0, subtotal - discountAmt);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id,
        order_number: orderNumber,
        customer_name: parsed.data.customer_name,
        customer_email: customer_email || null,
        notes: parsed.data.notes,
        total,
        status: 'pending',
        order_type: order_type || 'dine_in',
        payment_method: payment_method || 'cash',
        delivery_address: delivery_address || null,
        promo_code: promo_code || '',
        discount_amount: discountAmt,
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

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

    if (promo_code) {
      try {
        await supabase.rpc('increment_promo_usage', { p_code: promo_code.toUpperCase().trim(), p_restaurant_id: restaurant_id });
      } catch {}
    }

    // Fetch product names for notification (non-blocking)
    const productIds = parsed.data.items.map((i) => i.product_id);
    (async () => {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);

        const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));
        const notifItems = parsed.data.items.map((i) => ({
          name: productMap.get(i.product_id) ?? 'Producto',
          qty: i.qty,
          price: i.line_total,
        }));

        await notifyNewOrder({
          orderId: order.id,
          orderNumber: order.order_number,
          restaurantId: restaurant_id,
          customerName: parsed.data.customer_name,
          customerEmail: customer_email || undefined,
          total,
          items: notifItems,
        });
      } catch {}
    })();

    return NextResponse.json({
      order_number: order.order_number,
      order_id: order.id,
      slug: restaurant.slug,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
