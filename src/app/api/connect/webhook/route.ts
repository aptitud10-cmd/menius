export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe Connect: mantiene `stripe_onboarding_complete` al día sin
 * depender de que el dueño abra Configuración (antes era el único camino).
 *
 * Antes escuchaba eventos v2 "thin" con `parseThinEvent`, que no existe en el
 * SDK instalado (stripe 20): respondía 400 a todo y nunca funcionó. Nuestras
 * cuentas son Express (API v1), así que se usan los eventos clásicos.
 *
 * Configuración en Stripe (modo Live) → Developers → Webhooks → Add endpoint:
 *   • URL: https://menius.app/api/connect/webhook
 *   • Listen to: Events on Connected accounts
 *   • Eventos: account.updated, account.application.deauthorized
 * El "Signing secret" de ESE endpoint va en STRIPE_CONNECT_WEBHOOK_SECRET
 * (es distinto del de /api/payments/webhook).
 *
 * Sin tabla de idempotencia a propósito: cada evento vuelve a leer la cuenta
 * en Stripe y escribe un booleano, así que repetir o desordenar no hace daño.
 */

import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getConnectWebhookSecret } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { isConnectAccountReady } from '@/lib/payments/connect-account';

const logger = createLogger('connect-webhook');

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let stripe: ReturnType<typeof getStripe>;
  let event: Stripe.Event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, getConnectWebhookSecret());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Firma inválida = request ajena o secret mal cargado: esto último deja la
    // tienda sin enterarse de nada, por eso va a Sentry y no solo al log.
    logger.error('Connect webhook rejected', { error: message });
    captureError(err, { route: '/api/connect/webhook', step: 'verify' });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const accountId = event.account;

    switch (event.type) {
      case 'account.updated': {
        if (!accountId) break;
        // Se relee la cuenta: los eventos pueden llegar desordenados y el
        // estado actual es lo único que importa.
        const account = await stripe.accounts.retrieve(accountId);
        await setOnboardingComplete(accountId, isConnectAccountReady(account));
        break;
      }
      case 'account.application.deauthorized': {
        if (!accountId) break;
        await setOnboardingComplete(accountId, false);
        break;
      }
      default:
        logger.info('Unhandled Connect event', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    // 500 para que Stripe reintente: si respondiéramos 200 el cambio se perdería.
    logger.error('Connect webhook processing error', {
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    captureError(err, { route: '/api/connect/webhook', eventType: event.type });
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}

async function setOnboardingComplete(stripeAccountId: string, isComplete: boolean) {
  const { data, error } = await createAdminClient()
    .from('restaurants')
    .update({ stripe_onboarding_complete: isComplete })
    .eq('stripe_account_id', stripeAccountId)
    .select('id');

  if (error) throw new Error(`restaurants update failed: ${error.message}`);
  if (!data?.length) {
    // Cuenta de otra plataforma/prueba o restaurante que cambió de cuenta.
    logger.warn('Connect event for an account no restaurant uses', { stripeAccountId });
    return;
  }
  logger.info('Synced stripe_onboarding_complete', { stripeAccountId, isComplete });
}
