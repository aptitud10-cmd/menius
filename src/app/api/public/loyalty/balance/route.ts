export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`loyalty-balance:${ip}`, { limit: 20, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ points: 0, config: null }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone')?.trim();
  const restaurantId = searchParams.get('restaurant_id')?.trim();

  if (!phone || !restaurantId) {
    return NextResponse.json({ points: 0, config: null });
  }

  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ points: 0, config: null });
  }

  // Limit phone length and sanitize to prevent oversized DB queries or filter injection
  if (phone.length > 20) {
    return NextResponse.json({ points: 0, config: null });
  }

  // Allow only digits, +, -, spaces, and parentheses (standard phone chars)
  const sanitizedPhone = phone.replace(/[^0-9+\-() ]/g, '');
  if (!sanitizedPhone) {
    return NextResponse.json({ points: 0, config: null });
  }

  try {
    const adminDb = createAdminClient();

    // Fetch loyalty config for this restaurant
    const { data: config } = await adminDb
      .from('loyalty_config')
      .select('enabled, min_redeem_points, peso_per_point')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!config?.enabled) {
      return NextResponse.json({ points: 0, config: null });
    }

    // Normalize phone: digits only for comparison
    const normalizedPhone = sanitizedPhone.replace(/\D/g, '');

    // Look up account by phone (try exact match first, then digits-only)
    const { data: account } = await adminDb
      .from('loyalty_accounts')
      .select('id, points')
      .eq('restaurant_id', restaurantId)
      .or(`customer_phone.eq.${sanitizedPhone},customer_phone.eq.+${normalizedPhone}`)
      .order('points', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      points: account?.points ?? 0,
      account_id: account?.id ?? null,
      config: {
        min_redeem_points: config.min_redeem_points,
        peso_per_point: config.peso_per_point,
      },
    });
  } catch {
    return NextResponse.json({ points: 0, config: null });
  }
}
