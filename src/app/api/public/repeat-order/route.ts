export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('public:repeat-order');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimitAsync(`repeat:${ip}`, { limit: 20, windowSec: 60 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');
  const phone = searchParams.get('phone')?.replace(/\D/g, '');

  if (!restaurantId || !UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: 'Invalid restaurant_id' }, { status: 400 });
  }
  if (!phone || phone.length < 7) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  try {
    const adminDb = createAdminClient();

    const { data: lastOrder } = await adminDb
      .from('orders')
      .select(`
        id, order_number, total, created_at,
        order_items (
          product_id, variant_id, qty, unit_price, notes, product_name, variant_name
        )
      `)
      .eq('restaurant_id', restaurantId)
      .ilike('customer_phone', `%${phone.slice(-10)}%`)
      .in('status', ['delivered', 'ready', 'confirmed', 'preparing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastOrder) {
      return NextResponse.json({ found: false, items: [] });
    }

    const productIds = (lastOrder.order_items as unknown[]).map((i) => (i as Record<string, unknown>).product_id as string);
    const { data: currentProducts } = await adminDb
      .from('products')
      .select('id, name, price, in_stock, is_active, image_url')
      .in('id', productIds)
      .eq('is_active', true)
      .eq('in_stock', true);

    const availableProducts = new Map((currentProducts ?? []).map((p) => [p.id, p]));

    const orderItems = lastOrder.order_items as Array<{
      product_id: string;
      variant_id: string | null;
      qty: number;
      unit_price: number;
      notes: string;
      product_name: string;
      variant_name: string;
    }>;

    const items = orderItems
      .filter((item) => availableProducts.has(item.product_id))
      .map((item) => {
        const current = availableProducts.get(item.product_id)!;
        return {
          product_id: item.product_id,
          variant_id: item.variant_id,
          qty: item.qty,
          product_name: current.name,
          variant_name: item.variant_name,
          current_price: current.price,
          original_price: item.unit_price,
          image_url: current.image_url,
          notes: item.notes,
          price_changed: Math.abs(Number(current.price) - Number(item.unit_price)) > 0.01,
        };
      });

    return NextResponse.json({
      found: true,
      order_number: lastOrder.order_number,
      order_date: lastOrder.created_at,
      items,
      some_unavailable: items.length < orderItems.length,
    });
  } catch (err) {
    logger.error('Repeat order lookup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
