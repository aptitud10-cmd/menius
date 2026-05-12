import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const getStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();

    const [ordersRes, restaurantsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'cancelled'),
      supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ]);

    return {
      ordersCount: ordersRes.count ?? 0,
      restaurantsCount: restaurantsRes.count ?? 0,
    };
  },
  ['public-stats'],
  { revalidate: 3600 }
);

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimitAsync(`public-stats:${ip}`, { limit: 120, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const stats = await getStats();
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
