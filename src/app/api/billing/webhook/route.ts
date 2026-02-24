export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPlanByStripePrice, getIntervalByStripePrice } from '@/lib/plans';
import { createLogger } from '@/lib/logger';
import { getStripe, getWebhookSecret } from '@/lib/stripe';

const logger = createLogger('billing-webhook');

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createClient();

    // Idempotency: skip already-processed events
    const eventId = event.id;
    const { data: existing } = await supabase
      .from('processed_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, skipped: true });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        if (!restaurantId && !customerId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByStripePrice(priceId) : null;
        const interval = priceId ? getIntervalByStripePrice(priceId) : 'monthly';

        let status = sub.status;
        if (status === 'active' && sub.trial_end && new Date(sub.trial_end * 1000) > new Date()) {
          status = 'trialing';
        }

        const updateData: Record<string, any> = {
          stripe_subscription_id: sub.id,
          status,
          stripe_price_id: priceId ?? null,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (sub.cancel_at_period_end) {
          updateData.canceled_at = new Date().toISOString();
        }

        if (plan) {
          updateData.plan_id = plan.id;
        }

        if (sub.trial_start) {
          updateData.trial_start = new Date(sub.trial_start * 1000).toISOString();
        }
        if (sub.trial_end) {
          updateData.trial_end = new Date(sub.trial_end * 1000).toISOString();
        }

        let dbError;
        if (restaurantId) {
          const r = await supabase.from('subscriptions').update(updateData).eq('restaurant_id', restaurantId);
          dbError = r.error;
        } else {
          const r = await supabase.from('subscriptions').update(updateData).eq('stripe_customer_id', customerId);
          dbError = r.error;
        }
        if (dbError) {
          logger.error('DB update failed for subscription event', { event: event.type, error: dbError.message });
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        const updateData = {
          status: 'canceled',
          stripe_subscription_id: null,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let dbError;
        if (restaurantId) {
          const r = await supabase.from('subscriptions').update(updateData).eq('restaurant_id', restaurantId);
          dbError = r.error;
        } else {
          const r = await supabase.from('subscriptions').update(updateData).eq('stripe_customer_id', customerId);
          dbError = r.error;
        }
        if (dbError) {
          logger.error('DB update failed for subscription.deleted', { error: dbError.message });
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe fires this ~3 days before trial ends
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        // Find restaurant + owner email
        let restaurantData: any = null;
        if (restaurantId) {
          const { data } = await supabase
            .from('restaurants')
            .select('id, name, owner_user_id')
            .eq('id', restaurantId)
            .maybeSingle();
          restaurantData = data;
        } else {
          const { data: subRow } = await supabase
            .from('subscriptions')
            .select('restaurant_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          if (subRow) {
            const { data } = await supabase
              .from('restaurants')
              .select('id, name, owner_user_id')
              .eq('id', subRow.restaurant_id)
              .maybeSingle();
            restaurantData = data;
          }
        }

        if (restaurantData?.owner_user_id) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (serviceKey) {
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const adminClient = createSupabaseClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceKey,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );
            const { data: userData } = await adminClient.auth.admin.getUserById(restaurantData.owner_user_id);
            const ownerEmail = userData?.user?.email;
            const ownerName = userData?.user?.user_metadata?.full_name || restaurantData.name;

            if (ownerEmail) {
              const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date();
              const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

              const { sendEmail, buildTrialEndingEmail } = await import('@/lib/notifications/email');
              const html = buildTrialEndingEmail({
                ownerName,
                restaurantName: restaurantData.name,
                daysLeft,
                billingUrl: `${appUrl}/app/billing`,
              });

              await sendEmail({
                to: ownerEmail,
                subject: `${daysLeft <= 1 ? '🚨' : '⏰'} Tu prueba de MENIUS termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
                html,
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        if (customerId) {
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId);
          if (dbError) {
            logger.error('DB update failed for invoice.payment_failed', { error: dbError.message });
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const subId = invoice.subscription as string;

        if (customerId && subId) {
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId)
            .eq('stripe_subscription_id', subId);
          if (dbError) {
            logger.error('DB update failed for invoice.paid', { error: dbError.message });
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
        }
        break;
      }
    }

    // Mark event as processed (idempotency) — upsert ignores conflicts silently
    await supabase
      .from('processed_webhook_events')
      .upsert(
        { event_id: eventId, event_type: event.type, processed_at: new Date().toISOString() },
        { onConflict: 'event_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('Billing webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
