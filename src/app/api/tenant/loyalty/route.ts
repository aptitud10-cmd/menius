export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const rid = tenant.restaurantId;

    const supabase = createClient();
    const [configRes, accountsRes] = await Promise.all([
      supabase.from('loyalty_config').select('*').eq('restaurant_id', rid).maybeSingle(),
      supabase
        .from('loyalty_accounts')
        .select('id, customer_name, customer_phone, customer_email, points, lifetime_points, created_at, updated_at')
        .eq('restaurant_id', rid)
        .order('lifetime_points', { ascending: false })
        .limit(100),
    ]);

    if (configRes.error?.code === '42P01' || accountsRes.error?.code === '42P01') {
      return NextResponse.json({ config: null, accounts: [], needsMigration: true });
    }

    return NextResponse.json({
      config: configRes.data,
      accounts: accountsRes.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const rid = tenant.restaurantId;

    const body = await req.json();
    const clamp = (val: unknown, min: number, max: number, fallback: number): number => {
      const n = Number(val);
      if (!isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };

    const config = {
      restaurant_id: rid,
      enabled: Boolean(body.enabled),
      points_per_peso: clamp(body.points_per_peso, 0.01, 1000, 1),
      min_redeem_points: clamp(body.min_redeem_points, 1, 1_000_000, 100),
      peso_per_point: clamp(body.peso_per_point, 0.001, 1000, 0.1),
      welcome_points: clamp(body.welcome_points, 0, 100_000, 0),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { error } = await supabase
      .from('loyalty_config')
      .upsert(config, { onConflict: 'restaurant_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const rid = tenant.restaurantId;

    const { account_id, points, description, type } = await req.json();
    if (!account_id || !points || !type) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const ALLOWED_TYPES = ['earn', 'redeem', 'adjustment', 'welcome', 'expiry'];
    if (!ALLOWED_TYPES.includes(String(type))) {
      return NextResponse.json({ error: 'Tipo de transacción inválido' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: account, error: accountErr } = await supabase
      .from('loyalty_accounts')
      .select('points, lifetime_points')
      .eq('id', account_id)
      .eq('restaurant_id', rid)
      .maybeSingle();

    if (accountErr) return NextResponse.json({ error: accountErr.message }, { status: 500 });
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

    const newPoints = Math.max(0, account.points + Number(points));
    const newLifetime = account.lifetime_points + (Number(points) > 0 ? Number(points) : 0);

    const [updateRes, insertRes] = await Promise.all([
      supabase.from('loyalty_accounts').update({ points: newPoints, lifetime_points: newLifetime }).eq('id', account_id),
      supabase.from('loyalty_transactions').insert({
        restaurant_id: rid,
        account_id,
        type,
        points: Number(points),
        description: description || undefined,
      }),
    ]);

    if (updateRes.error) return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    if (insertRes.error) return NextResponse.json({ error: insertRes.error.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newPoints });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
