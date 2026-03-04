export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`connect-onboard:${ip}`, { limit: 5, windowSec: 60 });
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
      .select('id, name, stripe_account_id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    let accountId = restaurant.stripe_account_id;

    if (!accountId) {
      // V2 API: create a recipient connected account.
      // - display_name / contact_email come from the restaurant data.
      // - dashboard: 'express' → onboarding is hosted by Stripe.
      // - defaults.responsibilities: platform (MENIUS) covers Stripe fees and losses.
      // - configuration.recipient → enables stripe_transfers so the restaurant
      //   can receive payouts from destination charges. No top-level `type` field.
      const account = await (stripe as any).v2.core.accounts.create({
        display_name: restaurant.name,
        contact_email: user.email,
        identity: {
          // Country of legal establishment. Stripe will ask during onboarding
          // if not pre-filled; defaulting to Mexico for MENIUS.
          country: 'mx',
        },
        dashboard: 'express',
        defaults: {
          responsibilities: {
            // Stripe handles fee collection and loss liability (chargebacks/fraud).
            // This lets MENIUS offer 0% commission — restaurants pay only
            // Stripe's standard processing fee directly to Stripe.
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: {
                  // Request the stripe_transfers capability so the account
                  // can receive destination-charge payouts.
                  requested: true,
                },
              },
            },
          },
        },
      });

      accountId = account.id;

      // Persist the new connected account ID against this restaurant row.
      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id);
    }

    // V2 API: create a hosted onboarding link.
    // use_case.type: 'account_onboarding' opens the full onboarding flow.
    // configurations: ['recipient'] scopes it to the recipient capability.
    const accountLink = await (stripe as any).v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
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
