export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = getAdminClient();

    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (error) {
      console.error('[billing/subscription] Query failed:', error);
    }

    if (subscription) {
      return NextResponse.json({ subscription });
    }

    const { data: restaurant } = await admin
      .from('restaurants')
      .select('created_at')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ subscription: null });
    }

    const createdAt = new Date(restaurant.created_at);
    const trialEnd = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: repaired, error: upsertError } = await admin
      .from('subscriptions')
      .upsert({
        restaurant_id: tenant.restaurantId,
        plan_id: 'starter',
        status: new Date() > trialEnd ? 'canceled' : 'trialing',
        trial_start: createdAt.toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: createdAt.toISOString(),
        current_period_end: trialEnd.toISOString(),
      }, { onConflict: 'restaurant_id' })
      .select('*')
      .maybeSingle();

    if (upsertError) {
      console.error('[billing/subscription] Auto-repair FAILED:', upsertError);
      return NextResponse.json({ subscription: null, error: 'Auto-repair failed' });
    }

    console.log('[billing/subscription] Auto-repair SUCCESS for restaurant:', tenant.restaurantId);
    return NextResponse.json({ subscription: repaired });
  } catch (err) {
    console.error('[billing/subscription] Unexpected error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
