export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('tenant-customers');

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    // Strip characters that can break the PostgREST filter syntax (parens, commas, percent)
    const rawSearch = searchParams.get('search') || '';
    const search = rawSearch.replace(/[(),%]/g, '').slice(0, 100);
    const sortBy = searchParams.get('sort') || 'last_order_at';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const filterTag = searchParams.get('tag') || '';
    const allTagsOnly = searchParams.get('alltags') === '1';

    const supabase = createClient();

    // Return only the distinct tags list for the tag-filter chips
    if (allTagsOnly) {
      const { data: rows } = await supabase
        .from('customers')
        .select('tags')
        .eq('restaurant_id', tenant.restaurantId)
        .limit(500);
      const tagSet = new Set<string>();
      for (const row of rows ?? []) {
        for (const t of row.tags ?? []) tagSet.add(t);
      }
      return NextResponse.json({ tags: Array.from(tagSet).sort() });
    }

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', tenant.restaurantId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (filterTag) {
      query = query.contains('tags', [filterTag]);
    }

    const validSorts = ['last_order_at', 'total_spent', 'total_orders', 'name', 'created_at'];
    const sortCol = validSorts.includes(sortBy) ? sortBy : 'last_order_at';
    query = query.order(sortCol, { ascending: order, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data: customers, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ customers: customers ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/customers' });
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

    const { UUID_RE } = await import('@/lib/constants');
    if (!UUID_RE.test(String(id))) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (typeof notes === 'string') updates.notes = notes.slice(0, 1000);
    if (Array.isArray(tags)) updates.tags = tags.map(String).slice(0, 20);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { error, count } = await supabase
      .from('customers')
      .update(updates, { count: 'exact' })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((count ?? 0) === 0) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('PATCH failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
