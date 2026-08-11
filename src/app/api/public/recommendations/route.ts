export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';
import { showsAsRow } from '@/lib/product-display';

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

interface ProductRow {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  hide_image?: boolean;
  category_id: string;
}

const EMPTY: RecommendationsResponse = { last_order: null, suggested: [] };

/** has_modifiers is NOT a DB column — it's derived (same probe as menu-data.ts). */
async function buildHasModifiersSet(
  db: ReturnType<typeof createAdminClient>,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const [groups, variants, extras] = await Promise.all([
    db.from('modifier_groups').select('product_id').in('product_id', productIds),
    db.from('product_variants').select('product_id').in('product_id', productIds),
    db.from('product_extras').select('product_id').in('product_id', productIds),
  ]);
  const set = new Set<string>();
  for (const rows of [groups.data, variants.data, extras.data]) {
    for (const r of rows ?? []) set.add(r.product_id as string);
  }
  return set;
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`recommendations:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json<RecommendationsResponse>(EMPTY, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id')?.trim();
  const phone = searchParams.get('phone')?.trim();
  const email = searchParams.get('email')?.trim();

  if (!restaurantId || !UUID_RE.test(restaurantId)) {
    return NextResponse.json<RecommendationsResponse>(EMPTY);
  }

  const sanitizedPhone = phone ? phone.slice(0, 20).replace(/[^0-9+\-() ]/g, '') : null;
  const sanitizedEmail =
    email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;

  if (!sanitizedPhone && !sanitizedEmail) {
    return NextResponse.json<RecommendationsResponse>(EMPTY);
  }

  try {
    const db = createAdminClient();

    // 1. Find customer record. Two plain .eq() lookups instead of a hand-built
    //    .or() string — user input must never reach PostgREST filter syntax
    //    (emails legally contain "," and "()", the .or() grammar tokens).
    let customerId: string | null = null;
    if (sanitizedPhone) {
      const { data } = await db
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('phone', sanitizedPhone)
        .limit(1)
        .maybeSingle();
      customerId = data?.id ?? null;
    }
    if (!customerId && sanitizedEmail) {
      const { data } = await db
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('email', sanitizedEmail)
        .limit(1)
        .maybeSingle();
      customerId = data?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json<RecommendationsResponse>(EMPTY);
    }

    // 2. Last order of this customer — items live in order_items (orders has no
    //    `items` JSON column; the old query 42703'd on every request).
    const { data: lastOrder } = await db
      .from('orders')
      .select('id, order_items ( product_id )')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastOrderProductIds: string[] = (
      (lastOrder?.order_items as Array<{ product_id: string | null }> | null) ?? []
    )
      .map((i) => i.product_id)
      .filter((id): id is string => typeof id === 'string');

    if (lastOrderProductIds.length === 0) {
      return NextResponse.json<RecommendationsResponse>(EMPTY);
    }

    // 3. Product data for the last-order highlight (only in-stock)
    const { data: lastOrderProducts } = await db
      .from('products')
      .select('id, name, price, image_url, hide_image, category_id')
      .eq('restaurant_id', restaurantId)
      .in('id', lastOrderProductIds)
      .eq('in_stock', true)
      .limit(1);

    const firstLastProduct = (lastOrderProducts?.[0] as ProductRow | undefined) ?? null;

    // 4. Collaborative: orders from OTHER customers that contain the seed product
    const seedId = lastOrderProductIds[0];
    const { data: coRows } = await db
      .from('order_items')
      .select('order_id, orders!inner ( restaurant_id, customer_id, status )')
      .eq('orders.restaurant_id', restaurantId)
      .neq('orders.customer_id', customerId)
      .neq('orders.status', 'cancelled')
      .eq('product_id', seedId)
      .limit(20);

    const coOrderIds = Array.from(new Set((coRows ?? []).map((r) => r.order_id as string)));
    const coProductCounts = new Map<string, number>();
    const excludeIds = new Set(lastOrderProductIds);

    if (coOrderIds.length > 0) {
      const { data: siblingItems } = await db
        .from('order_items')
        .select('product_id')
        .in('order_id', coOrderIds);
      for (const item of siblingItems ?? []) {
        const pid = item.product_id as string | null;
        if (!pid || excludeIds.has(pid)) continue;
        coProductCounts.set(pid, (coProductCounts.get(pid) ?? 0) + 1);
      }
    }

    const topCoIds = Array.from(coProductCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let suggestedRows: ProductRow[] = [];
    if (topCoIds.length > 0) {
      const { data: coProducts } = await db
        .from('products')
        .select('id, name, price, image_url, hide_image, category_id')
        .eq('restaurant_id', restaurantId)
        .in('id', topCoIds)
        .eq('in_stock', true);
      suggestedRows = (coProducts as ProductRow[] | null) ?? [];
    }

    // Fallback: top products by popularity_rank (excluding already-shown)
    if (suggestedRows.length < 3) {
      const shown = new Set([...Array.from(excludeIds), ...suggestedRows.map((p) => p.id)]);
      const { data: popularProducts } = await db
        .from('products')
        .select('id, name, price, image_url, hide_image, category_id')
        .eq('restaurant_id', restaurantId)
        .eq('in_stock', true)
        .not('id', 'in', `(${Array.from(shown).join(',')})`)
        .order('popularity_rank', { ascending: true, nullsFirst: false })
        .limit(5 - suggestedRows.length);
      suggestedRows = suggestedRows.concat((popularProducts as ProductRow[] | null) ?? []);
    }

    // 5. Derive has_modifiers for every product we're about to return
    const allIds = [
      ...(firstLastProduct ? [firstLastProduct.id] : []),
      ...suggestedRows.map((p) => p.id),
    ];
    const hasModifiers = await buildHasModifiersSet(db, allIds);

    const toItem = (p: ProductRow, reason: RecommendationItem['reason']): RecommendationItem => ({
      product_id: p.id,
      name: p.name,
      price: Number(p.price),
      // Nulled here, not in the UI: these rows reach the carousels as plain
      // objects, so a row-display product would otherwise show a thumbnail the
      // menu deliberately hides.
      image_url: showsAsRow(p) ? null : (p.image_url ?? null),
      category_id: p.category_id,
      has_modifiers: hasModifiers.has(p.id),
      reason,
    });

    return NextResponse.json<RecommendationsResponse>({
      last_order: firstLastProduct ? toItem(firstLastProduct, 'last_order') : null,
      suggested: suggestedRows.slice(0, 4).map((p) => toItem(p, 'collaborative')),
    });
  } catch {
    return NextResponse.json<RecommendationsResponse>(EMPTY);
  }
}
