export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/orders
 * External API — authenticated via API key (x-api-key or Authorization: Bearer).
 *
 * Query params:
 *   status   — filter by order status (pending, preparing, ready, delivered, etc.)
 *   limit    — max results (default 50, max 200)
 *   page     — pagination page (default 1)
 *   since    — ISO8601 timestamp — only return orders after this date
 *
 * Example:
 *   GET /api/v1/orders?status=pending&limit=20
 *   x-api-key: mk_live_...
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/validate-api-key';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

const VALID_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'completed', 'cancelled'] as const;

export async function GET(req: NextRequest) {
  // Rate limit per IP before auth (prevents key enumeration)
  const ip = getClientIP(req);
  const { allowed } = await checkRateLimitAsync(`v1-orders:${ip}`, { limit: 60, windowSec: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Pass x-api-key: mk_live_... header.' },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const statusFilter = searchParams.get('status');
  const rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
  const rawPage = parseInt(searchParams.get('page') ?? '', 10);
  const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const since = searchParams.get('since');
  const offset = (page - 1) * limit;

  if (statusFilter && !VALID_STATUSES.includes(statusFilter as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  if (since && isNaN(Date.parse(since))) {
    return NextResponse.json({ error: 'Invalid since parameter — must be ISO8601 date' }, { status: 400 });
  }

  const db = createAdminClient();

  let query = db
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      order_type,
      payment_method,
      payment_status,
      subtotal,
      tax_amount,
      tip_amount,
      delivery_fee,
      discount_amount,
      total,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      notes,
      table_id,
      created_at,
      updated_at,
      order_items (
        id,
        qty,
        unit_price,
        line_total,
        notes,
        products ( id, name ),
        product_variants ( name )
      )
    `, { count: 'exact' })
    .eq('restaurant_id', auth.restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) query = query.eq('status', statusFilter);
  if (since) query = query.gte('created_at', since);

  const { data: orders, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: orders ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}
