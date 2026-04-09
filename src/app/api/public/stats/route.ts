import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
