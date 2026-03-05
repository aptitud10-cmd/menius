export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { promotionSchema } from '@/lib/validations';

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
    captureError(err, { route: '/api/tenant/promotions' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const parsed = promotionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        restaurant_id: tenant.restaurantId,
        code: parsed.data.code,
        description: (body.description ?? '').slice(0, 200),
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        min_order: parsed.data.min_order_amount,
        max_uses: parsed.data.max_uses || null,
        expires_at: parsed.data.expires_at || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ promotion: data });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/promotions' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id, is_active } = await request.json();
    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'id e is_active requeridos' }, { status: 400 });
    }

    const { error } = await supabase
      .from('promotions')
      .update({ is_active })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('PATCH failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/promotions' });
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
    captureError(err, { route: '/api/tenant/promotions' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
