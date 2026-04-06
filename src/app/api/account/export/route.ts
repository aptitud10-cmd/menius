export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

const logger = createLogger('account-export');

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`account-export:${ip}`, { limit: 5, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '3600' } });
    }

    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = createClient();
    const rid = tenant.restaurantId;

    const [
      { data: restaurant },
      { data: categories },
      { data: products },
      { data: orders },
      { data: customers },
      { data: subscription },
      { data: tables },
    ] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', rid).maybeSingle(),
      supabase.from('categories').select('*').eq('restaurant_id', rid),
      supabase.from('products').select('*').eq('restaurant_id', rid),
      supabase.from('orders').select('*').eq('restaurant_id', rid),
      supabase.from('customers').select('*').eq('restaurant_id', rid),
      supabase.from('subscriptions').select('plan_id, status, trial_end, current_period_end, stripe_price_id, created_at').eq('restaurant_id', rid).maybeSingle(),
      supabase.from('tables').select('*').eq('restaurant_id', rid),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      restaurant: restaurant ? {
        name: restaurant.name,
        slug: restaurant.slug,
        currency: restaurant.currency,
        timezone: restaurant.timezone,
        locale: restaurant.locale,
        created_at: restaurant.created_at,
      } : null,
      subscription: subscription ?? null,
      categories: (categories ?? []).map(c => ({ name: c.name, sort_order: c.sort_order, is_active: c.is_active })),
      products: (products ?? []).map(p => ({
        name: p.name,
        description: p.description,
        price: p.price,
        is_active: p.is_active,
        in_stock: p.in_stock,
        dietary_tags: p.dietary_tags,
      })),
      tables: (tables ?? []).map(t => ({ name: t.name, is_active: t.is_active })),
      orders: (orders ?? []).map(o => ({
        order_number: o.order_number,
        status: o.status,
        order_type: o.order_type,
        total: o.total,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        created_at: o.created_at,
      })),
      customers: (customers ?? []).map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        tags: c.tags,
        created_at: c.created_at,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="menius-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    logger.error('Export failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
