export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('tenant-promotions');

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
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
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

    const validTypes = ['percentage', 'fixed'];
    if (!validTypes.includes(discount_type)) {
      return NextResponse.json({ error: 'Tipo de descuento inválido' }, { status: 400 });
    }

    const numValue = Number(discount_value);
    if (isNaN(numValue) || numValue <= 0 || numValue > 100000) {
      return NextResponse.json({ error: 'Valor de descuento inválido' }, { status: 400 });
    }

    if (discount_type === 'percentage' && numValue > 100) {
      return NextResponse.json({ error: 'Porcentaje no puede ser mayor a 100' }, { status: 400 });
    }

    const numMinOrder = Number(min_order) || 0;
    if (numMinOrder < 0) {
      return NextResponse.json({ error: 'Mínimo de orden no puede ser negativo' }, { status: 400 });
    }

    if (expires_at && isNaN(Date.parse(expires_at))) {
      return NextResponse.json({ error: 'Fecha de expiración inválida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        restaurant_id: tenant.restaurantId,
        code: code.toUpperCase().trim().slice(0, 50),
        description: (description ?? '').slice(0, 200),
        discount_type,
        discount_value: numValue,
        min_order: numMinOrder,
        max_uses: max_uses ? Math.max(1, Number(max_uses)) : null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ promotion: data });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
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
    logger.error('DELETE failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
