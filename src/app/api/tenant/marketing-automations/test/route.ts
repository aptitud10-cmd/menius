export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/notifications/email';
import { cleanSenderName } from '@/lib/notifications/customer-email';
import { createLogger, maskEmail } from '@/lib/logger';
import { LIFECYCLE_KINDS, type LifecycleKind } from '@/lib/marketing/lifecycle';
import { buildLifecycleEmail } from '@/lib/marketing/emails';
import { buildLifecyclePreviewInput } from '@/lib/marketing/preview';
import { listUnsubscribeHeaders } from '@/lib/marketing/unsubscribe-token';
import {
  loadPickPool,
  MARKETING_RESTAURANT_SELECT,
  validEmail,
  type MarketingRestaurant,
} from '@/lib/marketing/lifecycle-data';

const logger = createLogger('tenant-marketing-test');

/** Ningún cliente tiene este id: la baja de la prueba no toca a nadie. */
const NOBODY = '00000000-0000-0000-0000-000000000000';

/**
 * POST { kind, locale } → manda el email de ejemplo al email de la cuenta del
 * dueño, por el mismo camino que los reales (remitente del restaurante,
 * reply-to, List-Unsubscribe). Sirve para ver en qué bandeja cae y cómo lo
 * pinta su app de correo, sin esperar a un cliente.
 */
export async function POST(request: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const to = validEmail(tenant.email);
  if (!to) return NextResponse.json({ error: 'no_email' }, { status: 400 });

  const { allowed } = await checkRateLimitAsync(`mkt-test:${tenant.userId}`, { limit: 10, windowSec: 3600 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { kind, locale } = (body ?? {}) as { kind?: unknown; locale?: unknown };
  if (typeof kind !== 'string' || !(LIFECYCLE_KINDS as string[]).includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }
  const lang = locale === 'es' ? 'es' : 'en';

  try {
    const db = createAdminClient();
    const { data, error } = await db.from('restaurants').select(MARKETING_RESTAURANT_SELECT).eq('id', tenant.restaurantId).maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'restaurant not found');
    const r = data as unknown as MarketingRestaurant;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const pool = await loadPickPool(db, r.id);
    const email = buildLifecycleEmail(buildLifecyclePreviewInput(kind as LifecycleKind, lang, r, pool, appUrl));

    const ok = await sendEmail({
      to,
      from: `"${cleanSenderName(r.name)}" <orders@menius.app>`,
      replyTo: validEmail(r.email) ?? undefined,
      subject: email.subject,
      html: email.html,
      headers: listUnsubscribeHeaders(appUrl, NOBODY),
      tags: [
        { name: 'category', value: 'marketing_test' },
        { name: 'restaurant_id', value: r.id },
      ],
    });
    if (!ok) return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    logger.info('test email sent', { restaurant_id: r.id, kind, to: maskEmail(to) });
    return NextResponse.json({ sentTo: to });
  } catch (err) {
    logger.error('test send failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
