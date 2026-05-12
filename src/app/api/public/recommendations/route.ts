export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export interface RecommendationItem {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string;
  has_modifiers: boolean;
  reason: 'last_order' | 'collaborative';
}

export interface RecommendationsResponse {
  last_order: RecommendationItem | null;
  suggested: RecommendationItem[];
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`recommendations:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id')?.trim();
  const phone = searchParams.get('phone')?.trim();
  const email = searchParams.get('email')?.trim();

  if (!restaurantId || !UUID_RE.test(restaurantId)) {
    return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
  }
  if (!phone && !email) {
    return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
  }

  // Sanitize phone
  const sanitizedPhone = phone ? phone.slice(0, 20).replace(/[^0-9+\-() ]/g, '') : null;
  // Basic email validation
  const sanitizedEmail = email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;

  if (!sanitizedPhone && !sanitizedEmail) {
    return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
  }

  try {
    const db = createAdminClient();

    // 1. Find customer record
    let customerId: string | null = null;
    {
      const orParts: string[] = [];
      if (sanitizedPhone) orParts.push(`phone.eq.${sanitizedPhone}`);
      if (sanitizedEmail) orParts.push(`email.eq.${sanitizedEmail}`);

      const { data: customer } = await db
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .or(orParts.join(','))
        .limit(1)
        .maybeSingle();

      customerId = customer?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
    }

    // 2. Last order of this customer at this restaurant
    const { data: lastOrder } = await db
      .from('orders')
      .select('id, items')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastOrder?.items || !Array.isArray(lastOrder.items) || lastOrder.items.length === 0) {
      return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
    }

    // 3. Extract product IDs from last order (items is a JSON array of {product_id, name, price, ...})
    const lastOrderProductIds: string[] = lastOrder.items
      .map((i: Record<string, unknown>) => typeof i.product_id === 'string' ? i.product_id : null)
      .filter((id): id is string => id !== null);

    if (lastOrderProductIds.length === 0) {
      return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
    }

    // 4. Fetch full product data for last order items (only in-stock)
    const { data: lastOrderProducts } = await db
      .from('products')
      .select('id, name, price, image_url, category_id, has_modifiers')
      .eq('restaurant_id', restaurantId)
      .in('id', lastOrderProductIds)
      .eq('in_stock', true)
      .limit(1);

    const firstLastProduct = lastOrderProducts?.[0] ?? null;

    // 5. Collaborative filtering: find other products bought by customers who bought the same
    //    Use order_items if available, else fall back to top products by popularity_rank
    let suggestedProducts: RecommendationItem[] = [];

    // Try to find co-purchased products via orders that share a product from last order
    const { data: coOrders } = await db
      .from('orders')
      .select('items')
      .eq('restaurant_id', restaurantId)
      .not('customer_id', 'eq', customerId)
      .not('status', 'eq', 'cancelled')
      .filter('items', 'cs', JSON.stringify(lastOrderProductIds.slice(0, 1).map(id => ({ product_id: id }))))
      .order('created_at', { ascending: false })
      .limit(20);

    const coProductCounts = new Map<string, number>();
    const excludeIds = new Set([...lastOrderProductIds, ...(firstLastProduct ? [firstLastProduct.id] : [])]);

    if (coOrders && coOrders.length > 0) {
      for (const order of coOrders) {
        if (!Array.isArray(order.items)) continue;
        for (const item of order.items as Array<Record<string, unknown>>) {
          const pid = typeof item.product_id === 'string' ? item.product_id : null;
          if (!pid || excludeIds.has(pid)) continue;
          coProductCounts.set(pid, (coProductCounts.get(pid) ?? 0) + 1);
        }
      }
    }

    const topCoIds = Array.from(coProductCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    if (topCoIds.length > 0) {
      const { data: coProducts } = await db
        .from('products')
        .select('id, name, price, image_url, category_id, has_modifiers')
        .eq('restaurant_id', restaurantId)
        .in('id', topCoIds)
        .eq('in_stock', true);

      if (coProducts) {
        suggestedProducts = coProducts.map((p) => ({
          product_id: p.id,
          name: p.name,
          price: Number(p.price),
          image_url: p.image_url ?? null,
          category_id: p.category_id,
          has_modifiers: p.has_modifiers ?? false,
          reason: 'collaborative' as const,
        }));
      }
    }

    // Fallback: if no co-orders found, use top products by popularity_rank (excluding last order items)
    if (suggestedProducts.length < 3) {
      const existingSugIds = new Set(suggestedProducts.map((p) => p.product_id));
      const { data: popularProducts } = await db
        .from('products')
        .select('id, name, price, image_url, category_id, has_modifiers')
        .eq('restaurant_id', restaurantId)
        .eq('in_stock', true)
        .not('id', 'in', `(${[...Array.from(excludeIds), ...Array.from(existingSugIds)].join(',')})`)
        .order('popularity_rank', { ascending: true, nullsFirst: false })
        .limit(5 - suggestedProducts.length);

      if (popularProducts) {
        for (const p of popularProducts) {
          suggestedProducts.push({
            product_id: p.id,
            name: p.name,
            price: Number(p.price),
            image_url: p.image_url ?? null,
            category_id: p.category_id,
            has_modifiers: p.has_modifiers ?? false,
            reason: 'collaborative',
          });
        }
      }
    }

    const lastOrderItem: RecommendationItem | null = firstLastProduct
      ? {
          product_id: firstLastProduct.id,
          name: firstLastProduct.name,
          price: Number(firstLastProduct.price),
          image_url: firstLastProduct.image_url ?? null,
          category_id: firstLastProduct.category_id,
          has_modifiers: firstLastProduct.has_modifiers ?? false,
          reason: 'last_order',
        }
      : null;

    return NextResponse.json<RecommendationsResponse>({
      last_order: lastOrderItem,
      suggested: suggestedProducts.slice(0, 4),
    });
  } catch {
    return NextResponse.json<RecommendationsResponse>({ last_order: null, suggested: [] });
  }
}
