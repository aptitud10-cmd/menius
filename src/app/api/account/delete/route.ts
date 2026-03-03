export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { getStripe } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';

const logger = createLogger('account-delete');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== 'ELIMINAR') {
      return NextResponse.json({ error: 'Confirmación incorrecta. Escribe ELIMINAR para confirmar.' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rid = tenant.restaurantId;

    // Cancel active Stripe subscription before deleting data
    try {
      const adminDb = createAdminClient();
      const { data: sub } = await adminDb
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('restaurant_id', rid)
        .maybeSingle();

      if (sub?.stripe_subscription_id) {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
          prorate: false,
        });
        logger.info('Stripe subscription cancelled', { subscriptionId: sub.stripe_subscription_id });
      }
    } catch (stripeErr) {
      // Log but don't block the deletion — the account should still be removable
      logger.error('Failed to cancel Stripe subscription during account deletion', {
        error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
        restaurantId: rid,
      });
    }

    // Delete restaurant (cascades: categories, products, orders, customers, tables, subscriptions)
    const { error: deleteErr } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', rid)
      .eq('owner_user_id', user.id);

    if (deleteErr) {
      logger.error('Failed to delete restaurant', { error: deleteErr.message, restaurantId: rid });
      return NextResponse.json({ error: 'No se pudo eliminar el restaurante. Contacta soporte.' }, { status: 500 });
    }

    // Delete profile
    await supabase.from('profiles').delete().eq('user_id', user.id);

    // Delete Supabase Auth user (requires service role key)
    try {
      const authAdminClient = createAdminClient();
      await authAdminClient.auth.admin.deleteUser(user.id);
    } catch (authErr) {
      logger.error('Failed to delete auth user', {
        error: authErr instanceof Error ? authErr.message : String(authErr),
        userId: user.id,
      });
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Delete account failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
