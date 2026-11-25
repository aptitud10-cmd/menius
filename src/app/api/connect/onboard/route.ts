export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureError } from '@/lib/error-reporting';
import { ONBOARD_ERROR_TEXT as ONBOARD_TEXT, type OnboardErrorCode } from '@/lib/payments/payment-errors';

export async function POST(request: NextRequest) {
  // Spanish until the restaurant (and its locale) is known.
  let en = false;
  const fail = (code: OnboardErrorCode, status: number, init?: { headers?: Record<string, string> }) =>
    NextResponse.json(
      { error: en ? ONBOARD_TEXT[code].en : ONBOARD_TEXT[code].es, code },
      { status, ...init },
    );

  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`connect-onboard:${ip}`, { limit: 5, windowSec: 60 });
    if (!allowed) {
      return fail('rate_limited', 429, { headers: { 'Retry-After': '60' } });
    }

    const tenant = await getTenant({ ownerOnly: true });
    if (!tenant) {
      return fail('unauthenticated', 401);
    }

    const supabase = await createClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, stripe_account_id, country_code, currency, commission_plan, locale')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      return fail('restaurant_not_found', 404);
    }
    en = (restaurant as { locale?: string | null }).locale === 'en';

    // Commission plan users get Stripe Connect without a paid subscription.
    // For all others, require Starter or above.
    const isCommissionPlan = (restaurant as { commission_plan: boolean | null }).commission_plan === true;
    if (!isCommissionPlan) {
      const hasOnlinePayments = await hasPlanAccess(restaurant.id, 'starter');
      if (!hasOnlinePayments) {
        return fail('plan_required', 403);
      }
    }

    const countryCode = (restaurant.country_code ?? '').toUpperCase();
    const currency = (restaurant.currency ?? '').toUpperCase();
    const isColombianRestaurant = countryCode === 'CO' || currency === 'COP';
    if (isColombianRestaurant) {
      return fail('wompi_only', 400);
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
        email: tenant.email,
        business_profile: {
          name: restaurant.name,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // stripe_account_id lo escribe solo el servidor (el dueño no tiene UPDATE en esa columna).
      // Si no se guarda, el dueño completaría el alta en una cuenta que MENIUS
      // no conoce y el próximo clic crearía otra (A7).
      const { error: saveErr } = await createAdminClient()
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id);
      if (saveErr) {
        captureError(saveErr, { route: '/api/connect/onboard', restaurantId: restaurant.id, accountId });
        return fail('account_not_saved', 500);
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/app/settings?stripe=refresh`,
      return_url: `${appUrl}/app/settings?stripe=complete&accountId=${accountId}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    // Never echo Stripe's raw message to the owner; the details go to Sentry.
    captureError(err, { route: '/api/connect/onboard' });
    return fail('stripe_error', 500);
  }
}
