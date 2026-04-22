export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  const supabase = await createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('restaurant_id', tenant.restaurantId)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drivers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: 'Name too long (max 100)' }, { status: 400 });
  if (phone.length > 30) return NextResponse.json({ error: 'Phone too long (max 30)' }, { status: 400 });

  const { data, error } = await supabase
    .from('drivers')
    .insert({ restaurant_id: tenant.restaurantId, name, phone })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { UUID_RE } = await import('@/lib/constants');
  if (!UUID_RE.test(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (patch.name !== undefined) allowed.name = String(patch.name).trim().slice(0, 100);
  if (patch.phone !== undefined) allowed.phone = String(patch.phone).trim().slice(0, 30);
  if (patch.is_active !== undefined) allowed.is_active = Boolean(patch.is_active);

  const { error } = await supabase
    .from('drivers')
    .update(allowed)
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { UUID_RE } = await import('@/lib/constants');
  if (!UUID_RE.test(String(body.id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', body.id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
