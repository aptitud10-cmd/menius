export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  const supabase = createClient();
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
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('drivers')
    .insert({ restaurant_id: tenant.restaurantId, name, phone })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (patch.name !== undefined) allowed.name = (patch.name as string).trim();
  if (patch.phone !== undefined) allowed.phone = (patch.phone as string).trim();
  if (patch.is_active !== undefined) allowed.is_active = patch.is_active;

  const { error } = await supabase
    .from('drivers')
    .update(allowed)
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', body.id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
