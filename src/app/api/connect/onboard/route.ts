export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

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

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
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

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

    let accountId = restaurant.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: user.email,
        business_profile: { name: restaurant.name },
        metadata: { restaurant_id: restaurant.id },
      });
      accountId = account.id;

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/app/settings?stripe=refresh`,
      return_url: `${appUrl}/app/settings?stripe=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
