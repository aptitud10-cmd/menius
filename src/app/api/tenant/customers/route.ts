import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'last_order_at';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const supabase = createClient();

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', tenant.restaurantId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const validSorts = ['last_order_at', 'total_spent', 'total_orders', 'name', 'created_at'];
    const sortCol = validSorts.includes(sortBy) ? sortBy : 'last_order_at';
    query = query.order(sortCol, { ascending: order, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data: customers, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ customers: customers ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    console.error('[customers GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { id, notes, tags } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (typeof notes === 'string') updates.notes = notes.slice(0, 1000);
    if (Array.isArray(tags)) updates.tags = tags.map(String).slice(0, 20);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[customers PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
