export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`connect-onboard:${ip}`, { limit: 5, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, stripe_account_id, country_code, currency, commission_plan')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Commission plan users get Stripe Connect without a paid subscription.
    // For all others, require Starter or above.
    const isCommissionPlan = (restaurant as { commission_plan: boolean | null }).commission_plan === true;
    if (!isCommissionPlan) {
      const hasOnlinePayments = await hasPlanAccess(restaurant.id, 'starter');
      if (!hasOnlinePayments) {
        return NextResponse.json(
          { error: 'Los pagos online requieren el plan Starter o superior, o el plan 4% comisión.' },
          { status: 403 }
        );
      }
    }

    const countryCode = (restaurant.country_code ?? '').toUpperCase();
    const currency = (restaurant.currency ?? '').toUpperCase();
    const isColombianRestaurant = countryCode === 'CO' || currency === 'COP';
    if (isColombianRestaurant) {
      return NextResponse.json(
        { error: 'This restaurant uses Wompi for online payments.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const stripeCountryByCurrency: Record<string, string> = {
      USD: 'US',
      MXN: 'MX',
      PEN: 'PE',
      CLP: 'CL',
      ARS: 'AR',
      EUR: 'ES',
    };
    const stripeCountry = (countryCode || stripeCountryByCurrency[currency] || 'MX').toUpperCase();

    let accountId = restaurant.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: stripeCountry,
        email: user?.email,
        display_name: restaurant.name,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      } as any);

      accountId = account.id;

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/app/settings?stripe=refresh`,
      return_url: `${appUrl}/app/settings?stripe=complete&accountId=${accountId}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
