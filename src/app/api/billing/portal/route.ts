export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { getStripe } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('billing-portal');

export async function POST() {
  try {
    const stripe = getStripe();

    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/app/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    logger.error('Billing portal error', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/billing/portal' });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
