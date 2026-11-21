export const dynamic = 'force-dynamic';

/**
 * GET → { pausedUntil: ISO | null }: la pausa de pedidos vigente del restaurante.
 * El Counter y el KDS la consultan cada 30 s para que una pausa puesta en otra
 * pantalla (u otra tablet) se vea en todas. `restaurants` no está en realtime a
 * propósito: emitiría la fila entera, con columnas privadas.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('orders_paused_until')
    .eq('id', tenant.restaurantId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  const raw = (data?.orders_paused_until as string | null) ?? null;
  const ms = raw ? new Date(raw).getTime() : NaN;
  return NextResponse.json({ pausedUntil: Number.isFinite(ms) && ms > Date.now() ? raw : null });
}
