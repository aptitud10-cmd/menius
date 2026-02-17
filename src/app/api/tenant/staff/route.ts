import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('restaurant_id', tenant.restaurantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { email, full_name, role } = body;

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email y nombre requeridos' }, { status: 400 });
  }

  const validRoles = ['admin', 'manager', 'staff', 'kitchen'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      restaurant_id: tenant.restaurantId,
      email: email.toLowerCase().trim(),
      full_name,
      role,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este email ya está invitado' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id, role, status } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (role) updates.role = role;
  if (status) updates.status = status;

  const { error } = await supabase
    .from('staff_members')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await request.json();
  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
