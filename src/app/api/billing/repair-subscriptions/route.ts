export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.headers.get('x-cron-secret') || '';
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, created_at');

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ repaired: 0, message: 'No restaurants found' });
  }

  let repaired = 0;

  for (const r of restaurants) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('restaurant_id', r.id)
      .maybeSingle();

    if (!sub) {
      const { error } = await supabase.from('subscriptions').insert({
        restaurant_id: r.id,
        plan_id: 'starter',
        status: 'canceled',
        current_period_end: new Date().toISOString(),
      });

      if (!error) repaired++;
    }
  }

  return NextResponse.json({ repaired, total: restaurants.length });
}
