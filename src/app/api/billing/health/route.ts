export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  const checks: Record<string, string> = {};

  checks.key_present = key ? 'yes' : 'no';
  checks.key_prefix = key.substring(0, 8) + '...';
  checks.key_length = String(key.length);

  const priceVars = [
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_STARTER_ANNUAL',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_BUSINESS_MONTHLY',
    'STRIPE_PRICE_BUSINESS_ANNUAL',
  ];
  for (const v of priceVars) {
    const val = process.env[v] ?? '';
    checks[v] = val ? val.substring(0, 12) + '...' : 'MISSING';
  }

  if (!key) {
    return NextResponse.json({ ok: false, checks, error: 'No key' });
  }

  try {
    const stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 15_000 });
    const balance = await stripe.balance.retrieve();
    checks.stripe_connection = 'OK';
    checks.stripe_mode = balance.livemode ? 'live' : 'test';
    return NextResponse.json({ ok: true, checks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const type = err instanceof Error ? err.constructor.name : 'Unknown';
    checks.stripe_connection = 'FAILED';
    return NextResponse.json({ ok: false, checks, error: message, errorType: type });
  }
}
