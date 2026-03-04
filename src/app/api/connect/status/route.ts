export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (!restaurant.stripe_account_id) {
      return NextResponse.json({ connected: false, onboarding_complete: false });
    }

    const stripe = getStripe();

    // V2 API: retrieve the account with recipient config + requirements included.
    // Always fetch live from the API — do not rely on the DB cache for status.
    const account = await (stripe as any).v2.core.accounts.retrieve(
      restaurant.stripe_account_id,
      { include: ['configuration.recipient', 'requirements'] }
    );

    // Active = stripe_transfers capability is active on the recipient config.
    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities
        ?.stripe_balance?.stripe_transfers?.status === 'active';

    // Onboarding is complete when there are no currently_due or past_due requirements.
    const requirementsStatus =
      account?.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    // Persist completion flag to avoid unnecessary API round-trips on page load.
    if (onboardingComplete && readyToReceivePayments && !restaurant.stripe_onboarding_complete) {
      await supabase
        .from('restaurants')
        .update({ stripe_onboarding_complete: true })
        .eq('id', restaurant.id);
    }

    // If previously marked complete but requirements have come back, clear the flag.
    if ((!onboardingComplete || !readyToReceivePayments) && restaurant.stripe_onboarding_complete) {
      await supabase
        .from('restaurants')
        .update({ stripe_onboarding_complete: false })
        .eq('id', restaurant.id);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: onboardingComplete && readyToReceivePayments,
      ready_to_receive_payments: readyToReceivePayments,
      requirements_status: requirementsStatus ?? null,
      account_id: restaurant.stripe_account_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
