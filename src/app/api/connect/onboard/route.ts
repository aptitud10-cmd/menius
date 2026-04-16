export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { hasPlanAccess } from '@/lib/auth/check-plan';

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

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, stripe_account_id, country_code, currency')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Online payments require at least the Starter plan.
    const hasOnlinePayments = await hasPlanAccess(restaurant.id, 'starter');
    if (!hasOnlinePayments) {
      return NextResponse.json(
        { error: 'Los pagos online requieren el plan Starter o superior. Suscríbete en Ajustes → Suscripción.' },
        { status: 403 }
      );
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
    const stripeCountry = (countryCode || stripeCountryByCurrency[currency] || 'MX').toLowerCase();

    let accountId = restaurant.stripe_account_id;

    if (!accountId) {
      // V2 API: merchant configuration.
      // - dashboard: 'full' → restaurant gets a full Stripe Express dashboard.
      // - fees_collector: 'stripe' → Stripe deducts its processing fees directly
      //   from the restaurant's balance. MENIUS never touches the fee money.
      // - losses_collector: 'stripe' → Stripe is responsible for chargebacks/fraud.
      //   This lets MENIUS offer 0% commission with no liability for losses.
      // - card_payments capability → restaurant can accept card payments directly.
      const account = await (stripe as any).v2.core.accounts.create({
        display_name: restaurant.name,
        contact_email: user.email,
        identity: {
          country: stripeCountry,
        },
        dashboard: 'full',
        defaults: {
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: {
                requested: true,
              },
            },
          },
        },
      });

      accountId = account.id;

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id);
    }

    // V2 account links — merchant configuration onboarding.
    const accountLink = await (stripe as any).v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant'],
          refresh_url: `${appUrl}/app/settings?stripe=refresh`,
          return_url: `${appUrl}/app/settings?stripe=complete&accountId=${accountId}`,
        },
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
