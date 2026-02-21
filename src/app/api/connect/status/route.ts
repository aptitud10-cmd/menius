export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ configured: false, reason: 'no_stripe' });
    }

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

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

    const account = await stripe.accounts.retrieve(restaurant.stripe_account_id);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    if (isComplete && !restaurant.stripe_onboarding_complete) {
      await supabase
        .from('restaurants')
        .update({ stripe_onboarding_complete: true })
        .eq('id', restaurant.id);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      account_id: restaurant.stripe_account_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
