export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { staffSchema } from '@/lib/validations';

const logger = createLogger('tenant-staff');

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data ?? [] });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/staff' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff_members')
      .insert({
        restaurant_id: tenant.restaurantId,
        email: parsed.data.email.toLowerCase().trim(),
        full_name: parsed.data.full_name,
        role: parsed.data.role,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'DUPLICATE_EMAIL' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/staff' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, role, status } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });

    const { UUID_RE } = await import('@/lib/constants');
    if (!UUID_RE.test(String(id))) return NextResponse.json({ error: 'ID_INVALID' }, { status: 400 });

    const validRoles = ['admin', 'manager', 'staff', 'kitchen'];
    const validStatuses = ['pending', 'active', 'inactive'];

    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });
    }
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const { error, count } = await supabase
      .from('staff_members')
      .update(updates, { count: 'exact' })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((count ?? 0) === 0) return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('PATCH failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/staff' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    const { UUID_RE } = await import('@/lib/constants');
    if (!UUID_RE.test(String(id))) return NextResponse.json({ error: 'ID_INVALID' }, { status: 400 });

    const { error, count } = await supabase
      .from('staff_members')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((count ?? 0) === 0) return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/staff' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
