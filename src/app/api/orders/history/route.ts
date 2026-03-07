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
        product_id,
        variant_id,
        qty,
        unit_price,
        line_total,
        notes,
        products ( id, name, price, image_url, dietary_tags ),
        product_variants ( id, name, price_delta )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .ilike('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalize to a clean shape expected by the client
  const normalized = (orders ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    order_type: o.order_type,
    payment_method: o.payment_method,
    total: o.total,
    created_at: o.created_at,
    order_items: (o.order_items ?? []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: item.products?.name ?? 'Producto',
      variant_name: item.product_variants?.name ?? null,
      quantity: item.qty,
      unit_price: item.unit_price,
      // Full product data for re-adding to cart
      product: item.products
        ? {
            id: item.product_id,
            name: item.products.name,
            price: item.products.price,
            image_url: item.products.image_url ?? null,
            dietary_tags: item.products.dietary_tags ?? [],
            restaurant_id: restaurantId,
            category_id: '',
            description: '',
            is_active: true,
            sort_order: 0,
            created_at: '',
            variants: [],
            extras: [],
            modifier_groups: [],
          }
        : null,
      variant: item.product_variants
        ? {
            id: item.variant_id,
            name: item.product_variants.name,
            price_delta: item.product_variants.price_delta ?? 0,
          }
        : null,
    })),
  }));

  return NextResponse.json({ orders: normalized });
}
