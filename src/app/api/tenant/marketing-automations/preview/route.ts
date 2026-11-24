export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { LIFECYCLE_KINDS, type LifecycleKind } from '@/lib/marketing/lifecycle';
import { buildLifecycleEmail } from '@/lib/marketing/emails';
import { buildLifecyclePreviewInput } from '@/lib/marketing/preview';
import {
  loadPickPool,
  MARKETING_RESTAURANT_SELECT,
  type MarketingRestaurant,
} from '@/lib/marketing/lifecycle-data';

/**
 * GET ?kind=usual&locale=en → el email tal cual lo recibiría un cliente,
 * armado con los platos reales del menú (cliente de ejemplo "Alex").
 */
export async function GET(request: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const kind = sp.get('kind') as LifecycleKind | null;
  if (!kind || !LIFECYCLE_KINDS.includes(kind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db.from('restaurants').select(MARKETING_RESTAURANT_SELECT).eq('id', tenant.restaurantId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const r = data as unknown as MarketingRestaurant;
  const locale = sp.get('locale') === 'es' ? 'es' : sp.get('locale') === 'en' ? 'en' : r.locale === 'en' ? 'en' : 'es';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const pool = await loadPickPool(db, r.id);
  const email = buildLifecycleEmail(buildLifecyclePreviewInput(kind, locale, r, pool, appUrl));
  return NextResponse.json({ subject: email.subject, preheader: email.preheader, html: email.html }, { headers: { 'Cache-Control': 'no-store' } });
}
