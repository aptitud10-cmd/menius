export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { deactivate?: boolean };
  const deactivate = body.deactivate === true;

  const db = createAdminClient();

  // Wompi (Colombia) has no application_fee mechanism — block activation in one query.
  // Deactivation is always allowed regardless of country.
  const query = db
    .from('restaurants')
    .update({ commission_plan: !deactivate, updated_at: new Date().toISOString() })
    .eq('id', tenant.restaurantId);

  const { error } = await (deactivate ? query : query.neq('country_code', 'CO'));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
