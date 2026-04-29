export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { restaurantId } = await req.json().catch(() => ({}));
  if (!restaurantId || typeof restaurantId !== 'string') {
    return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)) {
    return NextResponse.json({ error: 'restaurantId inválido' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: rest } = await db
    .from('restaurants')
    .select('id, name, slug, owner_user_id')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!rest) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  if (!rest.owner_user_id) return NextResponse.json({ error: 'Restaurante sin owner asignado' }, { status: 400 });

  const { data: ownerData } = await db.auth.admin.getUserById(rest.owner_user_id);
  const ownerEmail = ownerData?.user?.email;
  if (!ownerEmail) return NextResponse.json({ error: 'Owner sin email' }, { status: 400 });

  const origin = new URL(req.url).origin;

  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
    options: { redirectTo: `${origin}/auth/callback?next=/app` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkErr?.message ?? 'No se pudo generar el link' }, { status: 500 });
  }

  return NextResponse.json({
    actionLink: linkData.properties.action_link,
    ownerEmail,
    restaurant: { id: rest.id, name: rest.name, slug: rest.slug },
  });
}
