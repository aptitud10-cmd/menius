export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getPlanByStripePrice, getIntervalByStripePrice } from '@/lib/plans';
import { createLogger } from '@/lib/logger';
import { getStripe, getWebhookSecret } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';
import { createDashboardNotification } from '@/lib/notifications/dashboard-notifications';

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

    const supabase = createAdminClient();

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

    const auditLog = async (restaurantId: string | null, action: string, oldStatus: string | null, newStatus: string, meta: Record<string, unknown> = {}) => {
      if (!restaurantId) return;
      await supabase.from('subscription_audit_log').insert({
        restaurant_id: restaurantId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        metadata: { stripe_event_id: eventId, stripe_event_type: event.type, ...meta },
      }).then(() => {});
    };

    // Resolve restaurant_id from customer_id when metadata is missing
    const resolveRestaurantId = async (restaurantId: string | null, customerId: string | null): Promise<string | null> => {
      if (restaurantId) return restaurantId;
      if (!customerId) return null;
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('restaurant_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      return subRow?.restaurant_id ?? null;
    };

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        if (!restaurantId && !customerId) break;

        // Get previous status for audit trail
        const resolvedId = await resolveRestaurantId(restaurantId, customerId);
        let previousStatus: string | null = null;
        if (resolvedId) {
          const { data: prevSub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('restaurant_id', resolvedId)
            .maybeSingle();
          previousStatus = prevSub?.status ?? null;
        }

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByStripePrice(priceId) : null;
        const interval = priceId ? getIntervalByStripePrice(priceId) : 'monthly';

        // Trust Stripe's status; only override 'active' → 'trialing' when Stripe
        // hasn't yet transitioned (rare race), never the reverse.
        let status = sub.status;
        if (status === 'trialing' && sub.trial_end && new Date(sub.trial_end * 1000) < new Date()) {
          // Trial already expired but Stripe hasn't sent updated status yet — keep as trialing
          // and let Stripe's next event correct it. Do NOT force to canceled here.
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

        // cancel_at_period_end means "will cancel at period end", NOT canceled yet.
        // Only set canceled_at when the subscription is actually deleted (handled below).
        if (sub.cancel_at_period_end) {
          updateData.cancel_at = sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : new Date(sub.current_period_end * 1000).toISOString();
        } else {
          updateData.cancel_at = null;
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
          captureError(new Error(dbError.message), { route: '/api/billing/webhook', restaurantId: resolvedId ?? undefined });
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        await auditLog(resolvedId, `webhook_${event.type}`, previousStatus, status, { plan_id: plan?.id, interval });

        // In-app notification for plan changes
        if (resolvedId && plan && previousStatus !== status) {
          createDashboardNotification({
            restaurantId: resolvedId,
            type: 'subscription',
            title: status === 'active'
              ? `Plan ${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)} activado`
              : status === 'past_due'
                ? 'Pago vencido — actualiza tu método de pago'
                : `Suscripción actualizada`,
            actionUrl: '/app/billing',
            metadata: { plan_id: plan.id, status },
          }).catch(() => {});
        }

        // Auto-seed style anchors when restaurant activates Pro or Business plan
        if (resolvedId && ['pro', 'business'].includes(plan?.id ?? '') && ['active', 'trialing'].includes(status)) {
          try {
            const { seedStyleAnchors } = await import('@/lib/seed-style-anchors');
            seedStyleAnchors(supabase, resolvedId).catch(() => {});
          } catch { /* non-blocking — anchor seeding never blocks the webhook response */ }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;
        const resolvedId = await resolveRestaurantId(restaurantId, customerId);

        let previousStatus: string | null = null;
        if (resolvedId) {
          const { data: prevSub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('restaurant_id', resolvedId)
            .maybeSingle();
          previousStatus = prevSub?.status ?? null;
        }

        // Prefer Stripe's own canceled_at / ended_at over the webhook receipt time
        const stripeCanceledAt = sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : sub.ended_at
            ? new Date(sub.ended_at * 1000).toISOString()
            : new Date().toISOString();

        // Do NOT set plan_id here — 'free' is never stored in DB.
        // getEffectivePlanId() infers free when there's no active subscription.
        const updateData = {
          status: 'canceled',
          stripe_subscription_id: null,
          canceled_at: stripeCanceledAt,
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
          captureError(new Error(dbError.message), { route: '/api/billing/webhook', restaurantId: resolvedId ?? undefined });
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        await auditLog(resolvedId, 'webhook_subscription_deleted', previousStatus, 'canceled');

        if (resolvedId) {
          createDashboardNotification({
            restaurantId: resolvedId,
            type: 'subscription',
            title: 'Tu plan fue cancelado',
            actionUrl: '/app/billing',
            metadata: { status: 'canceled' },
          }).catch(() => {});
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
            .select('id, name, owner_user_id, locale')
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
              .select('id, name, owner_user_id, locale')
              .eq('id', subRow.restaurant_id)
              .maybeSingle();
            restaurantData = data;
          }
        }

        if (restaurantData?.owner_user_id) {
          try {
            const adminClient = createAdminClient();
            const { data: userData } = await adminClient.auth.admin.getUserById(restaurantData.owner_user_id);
            const ownerEmail = userData?.user?.email;
            const ownerName = userData?.user?.user_metadata?.full_name || restaurantData.name;

            if (ownerEmail) {
              const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date();
              const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

              const rLocale = restaurantData.locale ?? 'es';
              const isEn = rLocale === 'en';
              const { sendEmail, buildTrialEndingEmail } = await import('@/lib/notifications/email');
              const html = buildTrialEndingEmail({
                ownerName,
                restaurantName: restaurantData.name,
                daysLeft,
                billingUrl: `${appUrl}/app/billing`,
                locale: rLocale,
              });

              await sendEmail({
                to: ownerEmail,
                subject: isEn
                  ? `${daysLeft <= 1 ? '🚨' : '⏰'} Your MENIUS trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                  : `${daysLeft <= 1 ? '🚨' : '⏰'} Tu prueba de MENIUS termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
                html,
              });
            }
          } catch (emailErr) {
            logger.error('Failed to send trial_will_end email', {
              error: emailErr instanceof Error ? emailErr.message : String(emailErr),
              restaurantId: restaurantData?.id,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        if (customerId) {
          const resolvedId = await resolveRestaurantId(null, customerId);
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId);
          if (dbError) {
            logger.error('DB update failed for invoice.payment_failed', { error: dbError.message });
            captureError(new Error(dbError.message), { route: '/api/billing/webhook', restaurantId: resolvedId ?? undefined });
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
          await auditLog(resolvedId, 'webhook_payment_failed', null, 'past_due', { invoice_id: invoice.id });

          if (resolvedId) {
            createDashboardNotification({
              restaurantId: resolvedId,
              type: 'subscription',
              title: 'Pago fallido — actualiza tu tarjeta',
              actionUrl: '/app/billing',
              metadata: { invoice_id: invoice.id },
            }).catch(() => {});
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const subId = invoice.subscription as string;

        if (customerId && subId) {
          const resolvedId = await resolveRestaurantId(null, customerId);
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId)
            .eq('stripe_subscription_id', subId);
          if (dbError) {
            logger.error('DB update failed for invoice.paid', { error: dbError.message });
            captureError(new Error(dbError.message), { route: '/api/billing/webhook', restaurantId: resolvedId ?? undefined });
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
          await auditLog(resolvedId, 'webhook_payment_succeeded', null, 'active', { invoice_id: invoice.id });
        }
        break;
      }
    }

    await supabase
      .from('processed_webhook_events')
      .upsert(
        { event_id: eventId, event_type: event.type, processed_at: new Date().toISOString() },
        { onConflict: 'event_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('Billing webhook error', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/billing/webhook' });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
