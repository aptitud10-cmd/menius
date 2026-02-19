import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ promotions: data ?? [] });
  } catch (err) {
    console.error('[tenant/promotions GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { code, description, discount_type, discount_value, min_order, max_uses, expires_at } = body;

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'Código, tipo y valor de descuento requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        restaurant_id: tenant.restaurantId,
        code: code.toUpperCase().trim(),
        description: description ?? '',
        discount_type,
        discount_value: Number(discount_value),
        min_order: Number(min_order) || 0,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ promotion: data });
  } catch (err) {
    console.error('[tenant/promotions POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await request.json();
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tenant/promotions DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
