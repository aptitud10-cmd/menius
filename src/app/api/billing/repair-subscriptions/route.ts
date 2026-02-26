export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') || '';
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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
      const trialEnd = new Date(r.created_at);
      trialEnd.setDate(trialEnd.getDate() + 14);
      const isExpired = trialEnd < new Date();

      const { error } = await supabase.from('subscriptions').insert({
        restaurant_id: r.id,
        plan_id: 'starter',
        status: isExpired ? 'canceled' : 'trialing',
        trial_start: r.created_at,
        trial_end: trialEnd.toISOString(),
        current_period_end: trialEnd.toISOString(),
      });

      if (!error) repaired++;
    }
  }

  return NextResponse.json({ repaired, total: restaurants.length });
}
