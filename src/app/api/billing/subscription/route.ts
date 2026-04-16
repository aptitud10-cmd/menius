export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('billing-subscription');

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
      logger.error('Query failed', { error: error.message });
    }

    if (subscription) {
      return NextResponse.json({ subscription });
    }

    logger.warn('No subscription found — attempting auto-repair', { restaurantId: tenant.restaurantId });

    const { data: restaurant } = await db
      .from('restaurants')
      .select('created_at')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      console.error('[billing/subscription] Restaurant not found:', tenant.restaurantId);
      return NextResponse.json({ subscription: null });
    }

    const payload = {
      restaurant_id: tenant.restaurantId,
      plan_id: 'starter',
      status: 'canceled',
      current_period_end: new Date().toISOString(),
    };

    const { data: repaired, error: upsertError } = await db
      .from('subscriptions')
      .upsert(payload, { onConflict: 'restaurant_id' })
      .select('*')
      .maybeSingle();

    if (upsertError) {
      logger.error('Auto-repair upsert failed', { error: upsertError.message, restaurantId: tenant.restaurantId });

      const { data: inserted, error: insertError } = await db
        .from('subscriptions')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        logger.error('Auto-repair insert also failed', { error: insertError.message, restaurantId: tenant.restaurantId });
        return NextResponse.json({ subscription: null }, { status: 500 });
      }

      if (inserted) {
        return NextResponse.json({ subscription: inserted });
      }
    }

    return NextResponse.json({ subscription: repaired ?? null });
  } catch (err) {
    logger.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
