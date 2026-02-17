import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const since = request.nextUrl.searchParams.get('since');

    let query = supabase
      .from('orders')
      .select(`
        id, restaurant_id, table_id, order_number, status, customer_name, notes, total, created_at,
        order_items ( id, qty, unit_price, line_total, notes, products ( name ) )
      `)
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false });

    if (since) {
      query = query.gte('created_at', since);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    }

    const { data: orders, error } = await query.limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: orders ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
