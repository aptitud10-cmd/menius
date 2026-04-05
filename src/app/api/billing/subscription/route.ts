export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createAdminClient();

    const { data: subscription, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (error) {
      console.error('[billing/subscription] Query failed:', JSON.stringify(error));
    }

    if (subscription) {
      return NextResponse.json({ subscription });
    }

    console.warn('[billing/subscription] No subscription found for restaurant:', tenant.restaurantId, '— attempting auto-repair');

    const { data: restaurant } = await db
      .from('restaurants')
      .select('created_at')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      console.error('[billing/subscription] Restaurant not found:', tenant.restaurantId);
      return NextResponse.json({ subscription: null });
    }

    const createdAt = new Date(restaurant.created_at);
    const trialEnd = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const payload = {
      restaurant_id: tenant.restaurantId,
      plan_id: 'starter',
      status: now > trialEnd ? 'canceled' : 'trialing',
      trial_start: createdAt.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: createdAt.toISOString(),
      current_period_end: trialEnd.toISOString(),
    };

    const { data: repaired, error: upsertError } = await db
      .from('subscriptions')
      .upsert(payload, { onConflict: 'restaurant_id' })
      .select('*')
      .maybeSingle();

    if (upsertError) {
      console.error('[billing/subscription] Auto-repair upsert FAILED:', JSON.stringify(upsertError), 'payload:', JSON.stringify(payload));

      const { data: inserted, error: insertError } = await db
        .from('subscriptions')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('[billing/subscription] Auto-repair insert ALSO FAILED:', JSON.stringify(insertError));
        return NextResponse.json({ subscription: null }, { status: 500 });
      }

      if (inserted) {
        return NextResponse.json({ subscription: inserted });
      }
    }

    return NextResponse.json({ subscription: repaired ?? null });
  } catch (err) {
    console.error('[billing/subscription] Unexpected error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
