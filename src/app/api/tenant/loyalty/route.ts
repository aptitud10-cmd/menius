export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    const adminDb = createAdminClient();
    const { data, error: rpcErr } = await adminDb.rpc('adjust_loyalty_points', {
      p_account_id: account_id,
      p_restaurant_id: rid,
      p_points: Number(points),
      p_type: type,
      p_description: description || null,
    });

    if (rpcErr) {
      if (rpcErr.message?.includes('loyalty_account_not_found')) {
        return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    const newBalance = (data as { new_balance: number }[] | null)?.[0]?.new_balance ?? 0;
    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
