export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

/**
 * POST /api/public/loyalty/referral
 * Apply a referral code for a new loyalty account (on first order).
 * Body: { restaurant_id, account_id, referral_code }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`loyalty-referral:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
  }

  let body: { restaurant_id?: string; account_id?: string; referral_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { restaurant_id, account_id, referral_code } = body;

  if (!restaurant_id || !UUID_RE.test(restaurant_id)) {
    return NextResponse.json({ ok: false, error: 'invalid_restaurant_id' }, { status: 400 });
  }
  if (!account_id || !UUID_RE.test(account_id)) {
    return NextResponse.json({ ok: false, error: 'invalid_account_id' }, { status: 400 });
  }
  if (!referral_code || typeof referral_code !== 'string' || referral_code.trim().length < 4) {
    return NextResponse.json({ ok: false, error: 'invalid_referral_code' }, { status: 400 });
  }

  try {
    const adminDb = createAdminClient();
    const { data, error } = await adminDb.rpc('apply_referral', {
      p_restaurant_id: restaurant_id,
      p_referee_account_id: account_id,
      p_referral_code: referral_code.trim().toUpperCase(),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { ok: false, error: 'unknown' });
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
