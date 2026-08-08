export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint exposes Stripe key presence and config — restrict to internal use only.
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  const checks: Record<string, string> = {};

  checks.key_present = key ? 'yes' : 'no';
  checks.key_prefix = key.substring(0, 8) + '...';
  checks.key_length = String(key.length);

  checks.app_url = process.env.NEXT_PUBLIC_APP_URL ?? 'NOT SET';
  checks.webhook_secret = process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 8) + '...' : 'MISSING';

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

    // Presence of a non-empty string proves nothing: a typo'd or deleted price
    // id reads as "configured" here and then blows up in the owner's face at
    // checkout with "No such price". Resolve each one against Stripe, and check
    // it's actually usable for a subscription — a one-time price passes
    // retrieval but makes checkout fail in mode: 'subscription'.
    const priceProblems: string[] = [];
    await Promise.all(
      priceVars.map(async (v) => {
        const id = (process.env[v] ?? '').trim();
        if (!id) {
          priceProblems.push(`${v}: MISSING`);
          return;
        }
        try {
          const price = await stripe.prices.retrieve(id);
          if (!price.active) priceProblems.push(`${v}: inactive`);
          else if (!price.recurring) priceProblems.push(`${v}: one-time, not recurring`);
          else if (price.livemode !== balance.livemode) {
            priceProblems.push(
              `${v}: ${price.livemode ? 'live' : 'test'} price but ${balance.livemode ? 'live' : 'test'} key`,
            );
          } else {
            checks[v] = `${id.substring(0, 12)}... OK ${price.unit_amount != null ? (price.unit_amount / 100).toFixed(0) : '?'} ${price.currency} /${price.recurring.interval}`;
          }
        } catch (e) {
          priceProblems.push(`${v}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }),
    );

    if (priceProblems.length > 0) {
      return NextResponse.json({ ok: false, checks, priceProblems });
    }
    return NextResponse.json({ ok: true, checks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const type = err instanceof Error ? err.constructor.name : 'Unknown';
    checks.stripe_connection = 'FAILED';
    return NextResponse.json({ ok: false, checks, error: message, errorType: type });
  }
}
