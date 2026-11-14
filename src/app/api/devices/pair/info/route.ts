export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { normalizePairingCode, isSameOriginJson } from '@/lib/device-pairing';

/**
 * Owner-only preview of a pending code before approving it: where the request came
 * from and whether it is the MENIUS Counter app. This is the anti-phishing step —
 * an owner standing next to their tablet should see their own city and "app".
 */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { allowed } = await checkRateLimitAsync(`pair-info:u:${tenant.userId}`, { limit: 30, windowSec: 300 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizePairingCode(body?.code);
  if (!code) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });

  const db = createAdminClient();
  const { data: row } = await db
    .from('device_pairings')
    .select('request_city, request_region, request_country, from_counter_app, created_at')
    .eq('code', code)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    city: row.request_city,
    region: row.request_region,
    country: row.request_country,
    fromApp: row.from_counter_app,
    createdAt: row.created_at,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
