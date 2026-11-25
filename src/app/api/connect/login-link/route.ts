export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { captureError } from '@/lib/error-reporting';

/**
 * One-time link to the owner's Stripe Express dashboard (payouts, bank account,
 * pending requests from Stripe). Owner only; tablets never get it.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`connect-login-link:${ip}`, { limit: 5, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const tenant = await getTenant({ ownerOnly: true });
    if (!tenant) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, stripe_account_id')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    if (!restaurant.stripe_account_id) {
      return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 400 });
    }

    const link = await getStripe().accounts.createLoginLink(restaurant.stripe_account_id);
    return NextResponse.json({ url: link.url });
  } catch (err: unknown) {
    // Stripe refuses the link while the account has not finished onboarding.
    captureError(err, { route: '/api/connect/login-link' });
    return NextResponse.json({ error: 'LOGIN_LINK_FAILED' }, { status: 502 });
  }
}
