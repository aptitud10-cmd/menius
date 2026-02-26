export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ subscription: null });
    }

    if (!subscription) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('created_at')
        .eq('id', tenant.restaurantId)
        .maybeSingle();

      if (restaurant) {
        const createdAt = new Date(restaurant.created_at);
        const trialEnd = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

        const { data: repaired } = await supabase
          .from('subscriptions')
          .upsert({
            restaurant_id: tenant.restaurantId,
            plan_id: 'starter',
            status: new Date() > trialEnd ? 'canceled' : 'trialing',
            current_period_start: createdAt.toISOString(),
            current_period_end: trialEnd.toISOString(),
          }, { onConflict: 'restaurant_id' })
          .select('*')
          .maybeSingle();

        if (repaired) {
          return NextResponse.json({ subscription: repaired });
        }
      }
    }

    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
