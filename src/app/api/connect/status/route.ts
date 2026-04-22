export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient();
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
    const account = await stripe.accounts.retrieve(restaurant.stripe_account_id);

    const readyToProcessPayments =
      account.capabilities?.card_payments === 'active';

    const onboardingComplete =
      !account.requirements?.currently_due?.length &&
      !account.requirements?.past_due?.length;

    const isComplete = onboardingComplete && readyToProcessPayments;

    if (isComplete && !restaurant.stripe_onboarding_complete) {
      await supabase
        .from('restaurants')
        .update({ stripe_onboarding_complete: true })
        .eq('id', restaurant.id);
    }

    if (!isComplete && restaurant.stripe_onboarding_complete) {
      await supabase
        .from('restaurants')
        .update({ stripe_onboarding_complete: false })
        .eq('id', restaurant.id);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      ready_to_process_payments: readyToProcessPayments,
      account_id: restaurant.stripe_account_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
