export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

/**
 * GET /api/orders/history?restaurant_id=X&email=Y&t=Z
 * Returns the last 20 orders for a customer email at a given restaurant.
 * Uses admin client so RLS doesn't block the public lookup.
 * Rate-limited to prevent email enumeration abuse.
 *
 * `order_number` + `email` alone is not proof of ownership (email is guessable/
 * shared), so without a valid opaque token (`t`, matched against the most
 * recent order's `driver_tracking_token`) the response degrades: order-level
 * customer/payment metadata (payment_method) is omitted, and item payloads
 * are limited to product_id/product_name/qty/price (catalog data, not PII —
 * needed to keep "reorder" working) without the extra product fields
 * (image, dietary tags, description). Full item detail + payment_method are
 * only returned to a caller holding the token.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimitAsync(`order-history:${ip}`, { limit: 10, windowSec: 60 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();
  const token = searchParams.get('t');

  if (!restaurantId || !email) {
    return NextResponse.json({ error: 'restaurant_id and email required' }, { status: 400 });
  }

  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: 'Invalid restaurant_id' }, { status: 400 });
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
      driver_tracking_token,
      customer_token,
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
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Authorized only if the caller presents a token of the MOST RECENT order
  // for this email at this restaurant (the one the customer actually has in
  // their tracking URL). customer_token is the canonical view token; the driver
  // action token is also accepted (old URLs still in the wild).
  const mostRecent = (orders ?? [])[0] as { customer_token?: string | null; driver_tracking_token?: string | null } | undefined;
  const authorized = !!token && !!mostRecent
    && ((!!mostRecent.customer_token && token === mostRecent.customer_token)
      || (!!mostRecent.driver_tracking_token && token === mostRecent.driver_tracking_token));

  const normalized = (orders ?? []).map((o: any) => {
    const items = (o.order_items ?? []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: item.products?.name ?? item.product_name ?? 'Producto',
      variant_name: item.product_variants?.name ?? item.variant_name ?? null,
      quantity: item.qty,
      // Catalog price, not PII — kept in both variants so "reorder" always works.
      unit_price: item.unit_price,
      // Full product payload (image, dietary tags, etc.) only for an authorized
      // (tokened) caller. Non-authorized callers still get enough (id + price)
      // to re-add the item to the cart.
      product: item.products
        ? {
            id: item.product_id,
            name: item.products.name,
            price: item.products.price,
            image_url: authorized ? (item.products.image_url ?? '') : '',
            dietary_tags: authorized ? (item.products.dietary_tags ?? []) : [],
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
    }));

    return {
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      order_type: o.order_type,
      // payment_method is order-level metadata, not needed for the list/reorder UI.
      payment_method: authorized ? o.payment_method : null,
      total: o.total,
      created_at: o.created_at,
      order_items: items,
    };
  });

  return NextResponse.json({ orders: normalized });
}
