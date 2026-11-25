export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { isDeviceSession } from '@/lib/auth/device-session';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { sendTelegramAlert } from '@/lib/notifications/telegram';
import {
  addDomainToProject,
  defaultDnsRecord,
  dnsPointsToVercel,
  domainServesStore,
  vercelDomainsConfigured,
} from '@/lib/vercel-domains';

const logger = createLogger('domain-verify');

/**
 * "Active" now means https://domain really answers with the store — not just
 * that the DNS points at Vercel. Codes the panel translates:
 *  NEEDS_RECORDS      → create these records (from Vercel, or our defaults)
 *  ISSUING_CERT       → DNS is right and the domain is on the project; HTTPS in minutes
 *  PENDING_ACTIVATION → DNS is right; MENIUS still has to add it on Vercel (alerted)
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (await isDeviceSession(supabase)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('default_restaurant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const restaurantId = profile?.default_restaurant_id;
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('custom_domain, name, slug')
      .eq('id', restaurantId)
      .maybeSingle();

    const domain = restaurant?.custom_domain;
    if (!domain) {
      return NextResponse.json({ verified: false, code: 'NO_DOMAIN' });
    }
    if (!(await hasPlanAccess(restaurantId, 'pro'))) {
      return NextResponse.json({ verified: false, code: 'DOMAIN_REQUIRES_PRO' }, { status: 403 });
    }

    // 1. With the Vercel API configured, put the domain on the project ourselves.
    const setup = await addDomainToProject(domain);
    if (setup.state === 'needs_records') {
      return NextResponse.json({ verified: false, code: 'NEEDS_RECORDS', records: setup.records });
    }

    // 2. The real test.
    if (await domainServesStore(domain)) {
      // domain_verified lo escribe solo el servidor, después de comprobar que la tienda responde.
      await createAdminClient().from('restaurants').update({ domain_verified: true }).eq('id', restaurantId);
      return NextResponse.json({ verified: true });
    }

    // 3. Not live yet: say why.
    if (!(await dnsPointsToVercel(domain))) {
      return NextResponse.json({ verified: false, code: 'NEEDS_RECORDS', records: [defaultDnsRecord(domain)] });
    }
    if (setup.state === 'added') {
      return NextResponse.json({ verified: false, code: 'ISSUING_CERT' });
    }

    // DNS is right but nobody added the domain on Vercel (no API token, or the
    // API failed): a person has to do it. One alert per domain per dedupe window.
    await sendTelegramAlert(
      `🌐 Dominio listo para activar en Vercel: ${domain} (${restaurant?.name ?? restaurant?.slug ?? restaurantId}). ` +
        `El DNS ya apunta a Vercel; agrégalo en Project → Settings → Domains.` +
        (vercelDomainsConfigured() ? ' (La API de Vercel falló: revisar logs.)' : ''),
      'warn',
      `domain-pending:${domain}`,
    );
    return NextResponse.json({ verified: false, code: 'PENDING_ACTIVATION' });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
