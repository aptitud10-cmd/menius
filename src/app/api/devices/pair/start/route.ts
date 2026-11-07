export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import {
  generatePairingCode,
  generateDeviceSecret,
  hashDeviceSecret,
  PAIRING_TTL_MS,
} from '@/lib/device-pairing';

/**
 * Called by the tablet's /connect screen (unauthenticated) to get a code to show.
 * Returns the secret ONCE — the tablet keeps it in memory and proves it on /poll.
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  // A tablet renews every 5 minutes; 20 per 10 min leaves room for several tablets
  // behind one restaurant router while stopping anyone from filling the table.
  const { allowed } = await checkRateLimitAsync(`pair-start:${ip}`, { limit: 20, windowSec: 600 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const db = createAdminClient();

  // Housekeeping: rows past their life are useless; keep the table tiny.
  await db
    .from('device_pairings')
    .delete()
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const secret = generateDeviceSecret();
  const secretHash = hashDeviceSecret(secret);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

  // The partial unique index rejects a code that is already live; retry with a new one.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairingCode();
    const { error } = await db
      .from('device_pairings')
      .insert({ code, secret_hash: secretHash, expires_at: expiresAt });

    if (!error) {
      return NextResponse.json(
        { code, secret, expiresAt },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (error.code !== '23505') {
      captureError(error, { route: '/api/devices/pair/start' });
      return NextResponse.json({ error: 'unavailable' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'unavailable' }, { status: 503 });
}
