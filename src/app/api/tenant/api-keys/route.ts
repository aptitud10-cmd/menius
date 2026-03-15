export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { randomBytes, createHash } from 'crypto';

function generateKey(): { raw: string; hash: string; prefix: string } {
  const raw = `mk_live_${randomBytes(24).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = createClient();
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, prefix, created_at, last_used_at, is_active')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet — return empty
      if (error.code === '42P01') return NextResponse.json({ keys: [] });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const { raw, hash, prefix } = generateKey();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('api_keys')
      .insert({
        restaurant_id: tenant.restaurantId,
        name: name.trim(),
        key_hash: hash,
        prefix,
        is_active: true,
      })
      .select('id, name, prefix, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return raw key ONCE — user must copy it
    return NextResponse.json({ key: { ...data, raw } });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
