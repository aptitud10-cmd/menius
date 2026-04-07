export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAlert } from '@/app/api/admin/dev/alerts/route';
import { createLogger } from '@/lib/logger';

const logger = createLogger('monitor-stores');
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  // Get all active restaurants (subscribed or trialing)
  const { data: restaurants } = await db
    .from('restaurants')
    .select('id, slug, name')
    .not('slug', 'is', null)
    .limit(100);

  if (!restaurants?.length) {
    return NextResponse.json({ ok: true, checked: 0 });
  }

  const results: Array<{ slug: string; status: number | 'error'; ok: boolean; ms: number }> = [];
  const TIMEOUT_MS = 10_000;

  // Check each store in parallel (batches of 10)
  const BATCH = 10;
  for (let i = 0; i < restaurants.length; i += BATCH) {
    const batch = restaurants.slice(i, i + BATCH);
    await Promise.all(batch.map(async (r) => {
      const url = `${BASE_URL}/${r.slug}`;
      const start = Date.now();
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'User-Agent': 'MeniusMonitor/1.0' },
        });
        const ms = Date.now() - start;
        results.push({ slug: r.slug, status: res.status, ok: res.ok, ms });

        if (!res.ok) {
          await createAlert({
            severity: res.status >= 500 ? 'critical' : 'warning',
            source: 'uptime',
            title: `Tienda ${r.slug} devolvió HTTP ${res.status}`,
            description: `La tienda de ${r.name ?? r.slug} respondió con código ${res.status}. URL: ${url}`,
            store_slug: r.slug,
            data: { url, status: res.status, ms },
          });
          logger.warn('Store returned non-200', { slug: r.slug, status: res.status });
        } else if (ms > 5000) {
          await createAlert({
            severity: 'warning',
            source: 'uptime',
            title: `Tienda ${r.slug} responde lento (${ms}ms)`,
            description: `La tienda tardó ${ms}ms en responder. El umbral es 5,000ms.`,
            store_slug: r.slug,
            data: { url, ms },
          });
        }
      } catch (err) {
        const ms = Date.now() - start;
        results.push({ slug: r.slug, status: 'error', ok: false, ms });
        await createAlert({
          severity: 'critical',
          source: 'uptime',
          title: `Tienda ${r.slug} no responde`,
          description: `No se pudo conectar a ${url}. Error: ${err instanceof Error ? err.message : String(err)}`,
          store_slug: r.slug,
          data: { url, error: String(err) },
        });
        logger.error('Store unreachable', { slug: r.slug, error: String(err) });
      }
    }));
  }

  const failed = results.filter(r => !r.ok);
  logger.info('monitor-stores done', { checked: results.length, failed: failed.length });

  return NextResponse.json({ ok: true, checked: results.length, failed: failed.length, results });
}
