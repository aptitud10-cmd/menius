export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { restaurantId, enable } = await req.json().catch(() => ({}));
  if (!restaurantId || typeof restaurantId !== 'string') {
    return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)) {
    return NextResponse.json({ error: 'restaurantId inválido' }, { status: 400 });
  }
  if (typeof enable !== 'boolean') {
    return NextResponse.json({ error: 'enable (boolean) requerido' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: rest, error: fetchErr } = await db
    .from('restaurants')
    .select('id, country_code, commission_plan')
    .eq('id', restaurantId)
    .maybeSingle();

  if (fetchErr || !rest) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  }

  const { error: updateErr } = await db
    .from('restaurants')
    .update({ commission_plan: enable })
    .eq('id', restaurantId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    restaurantId,
    commission_plan: enable,
  });
}
