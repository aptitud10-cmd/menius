export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone')?.trim();
  const restaurantId = searchParams.get('restaurant_id')?.trim();

  if (!phone || !restaurantId) {
    return NextResponse.json({ points: 0, config: null });
  }

  try {
    const adminDb = createAdminClient();

    // Fetch loyalty config for this restaurant
    const { data: config } = await adminDb
      .from('loyalty_configs')
      .select('enabled, min_redeem_points, peso_per_point')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!config?.enabled) {
      return NextResponse.json({ points: 0, config: null });
    }

    // Normalize phone: digits only for comparison
    const normalizedPhone = phone.replace(/\D/g, '');

    // Look up account by phone (try exact match first, then digits-only)
    const { data: account } = await adminDb
      .from('loyalty_accounts')
      .select('id, points')
      .eq('restaurant_id', restaurantId)
      .or(`customer_phone.eq.${phone},customer_phone.eq.+${normalizedPhone}`)
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
