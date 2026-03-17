export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicOrderSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/notifications/order-notifications';
import { sendEmail } from '@/lib/notifications/email';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { getStripe } from '@/lib/stripe';

const logger = createLogger('orders');

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`order:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    // Idempotency key — prevent duplicate orders on network retry
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() || null;
    if (idempotencyKey) {
      const adminDb = createAdminClient();
      const { data: existing } = await adminDb
        .from('orders')
        .select('id, order_number, total, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { order_id: existing.id, order_number: existing.order_number, total: existing.total, idempotent: true },
          { status: 200 }
        );
      }
    }

    const body = await request.json();

    // Sanitize all user-facing text inputs
    const restaurant_id = body.restaurant_id;
    const customer_name = sanitizeText(body.customer_name, 100);
    const customer_email = sanitizeEmail(body.customer_email);
    const customer_phone = sanitizeText(body.customer_phone, 20);
    const notes = sanitizeMultiline(body.notes, 500);
    const items = body.items;
    const promo_code = sanitizeText(body.promo_code, 50);
    const discount_amount = body.discount_amount;
    const order_type = sanitizeText(body.order_type, 20);
    const payment_method = sanitizeText(body.payment_method, 20);
    const delivery_address = sanitizeMultiline(body.delivery_address, 300);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!restaurant_id || (!String(restaurant_id).startsWith('demo') && !UUID_RE.test(String(restaurant_id)))) {
      return NextResponse.json({ error: 'restaurant_id inválido' }, { status: 400 });
    }

    if (String(restaurant_id).startsWith('demo')) {
      if (!customer_name || !customer_phone) {
        return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 });
      }
      const demoNum = `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return NextResponse.json({ order_id: `demo-order-${Date.now()}`, order_number: demoNum });
    }

    const parsed = publicOrderSchema.safeParse({
      customer_name, customer_phone, customer_email, order_type, payment_method, notes, items,
      tip_amount: body.tip_amount !== undefined ? Number(body.tip_amount) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const supabase = createClient();
    const adminDb = createAdminClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug, delivery_fee, name, currency, locale, notification_email, notification_whatsapp, notifications_enabled, orders_paused_until')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Pause guard — if the restaurant paused orders, reject new ones
    const pausedUntil = (restaurant as any).orders_paused_until;
    if (pausedUntil && new Date(pausedUntil) > new Date()) {
      return NextResponse.json(
        { error: 'El restaurante no está aceptando órdenes en este momento. Intenta más tarde.' },
        { status: 503 }
      );
    }

    // Check subscription — enforce daily limit for expired/free-tier restaurants
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end')
        .eq('restaurant_id', restaurant_id)
        .maybeSingle();

      const now = new Date();
      let isExpired = false;

      if (!sub) {
        const { data: rest } = await supabase.from('restaurants').select('created_at').eq('id', restaurant_id).maybeSingle();
        if (rest) {
          const graceEnds = new Date(new Date(rest.created_at).getTime() + 14 * 24 * 60 * 60 * 1000);
          if (now > graceEnds) isExpired = true;
        }
      } else {
        const { status } = sub;
        if (status === 'active' || status === 'past_due') {
          isExpired = false;
        } else if (status === 'trialing') {
          const trialOver = sub.trial_end
            ? new Date(sub.trial_end) < now
            : (sub.current_period_end ? new Date(sub.current_period_end) < now : false);
          if (trialOver) isExpired = true;
        } else {
          const periodEnded = sub.current_period_end && new Date(sub.current_period_end) < now;
          if (periodEnded) isExpired = true;
        }
      }

      if (isExpired) {
        const DAILY_LIMIT = 3;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await adminDb
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant_id)
          .gte('created_at', todayStart.toISOString());
        if ((count ?? 0) >= DAILY_LIMIT) {
          const en = restaurant.locale === 'en';
          return NextResponse.json(
            { error: en
                ? 'This restaurant has reached its daily limit. Please try again tomorrow or contact the restaurant.'
                : 'Este restaurante alcanzó el límite de pedidos por hoy. Vuelve mañana o contacta al restaurante.' },
            { status: 429 }
          );
        }
      }
    } catch (subErr) {
      logger.warn('Subscription check failed during order creation — proceeding', { error: subErr });
    }

    const productIds = parsed.data.items.map((i) => i.product_id);

    const [{ data: dbProducts }, { data: dbVariants }, { data: dbExtras }, { data: dbModGroups }] = await Promise.all([
      supabase.from('products').select('id, price, in_stock').in('id', productIds).eq('restaurant_id', restaurant_id),
      supabase.from('product_variants').select('id, product_id, price_delta, sort_order').in('product_id', productIds).order('sort_order', { ascending: true }),
      supabase.from('product_extras').select('id, product_id, price').in('product_id', productIds),
      supabase.from('modifier_groups').select('id, product_id, name, is_required, min_select, max_select').in('product_id', productIds),
    ]);

    const modGroupIds = (dbModGroups ?? []).map((g) => g.id);
    const { data: dbModOptions } = modGroupIds.length > 0
      ? await supabase.from('modifier_options').select('id, group_id, price_delta').in('group_id', modGroupIds)
      : { data: [] };

    const productMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));
    const variantMap = new Map((dbVariants ?? []).map((v) => [v.id, v]));
    const extraMap = new Map((dbExtras ?? []).map((e) => [e.id, e]));
    const modOptionMap = new Map((dbModOptions ?? []).map((o) => [o.id, o]));
    const productsRequiringVariant = new Set((dbVariants ?? []).map((v) => v.product_id));
    // First variant per product (sort_order ASC) — used as fallback when client sends no variant_id
    const firstVariantByProduct = new Map<string, { id: string; price_delta: number }>();
    for (const v of dbVariants ?? []) {
      if (!firstVariantByProduct.has(v.product_id)) firstVariantByProduct.set(v.product_id, v);
    }

    const modGroupsByProduct = new Map<string, typeof dbModGroups>();
    for (const g of dbModGroups ?? []) {
      const list = modGroupsByProduct.get(g.product_id) ?? [];
      list.push(g);
      modGroupsByProduct.set(g.product_id, list);
    }

    for (const item of parsed.data.items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ error: 'Producto no encontrado o no pertenece a este restaurante.' }, { status: 400 });
      }
      if (dbProduct.in_stock === false) {
        return NextResponse.json({ error: 'Uno de los productos está agotado.' }, { status: 400 });
      }
      // If product requires a variant but client sent none, auto-assign the first (base) variant
      if (productsRequiringVariant.has(item.product_id) && !item.variant_id) {
        const fallback = firstVariantByProduct.get(item.product_id);
        if (fallback) {
          (item as Record<string, unknown>).variant_id = fallback.id;
        }
      }

      let expectedUnitPrice = Number(dbProduct.price);
      if (item.variant_id) {
        const v = variantMap.get(item.variant_id);
        if (!v || v.product_id !== item.product_id) {
          return NextResponse.json({ error: 'Variante inválida.' }, { status: 400 });
        }
        expectedUnitPrice += Number(v.price_delta);
      }
      for (const ex of item.extras) {
        const dbExtra = extraMap.get(ex.extra_id);
        if (!dbExtra || dbExtra.product_id !== item.product_id) {
          return NextResponse.json({ error: 'Extra inválido.' }, { status: 400 });
        }
        expectedUnitPrice += Number(dbExtra.price);
      }
      for (const mod of (item.modifiers ?? [])) {
        const isLegacy = !mod.option_id || String(mod.option_id).startsWith('__legacy');
        if (isLegacy) {
          expectedUnitPrice += Number(mod.price_delta);
        } else {
          const dbOpt = modOptionMap.get(mod.option_id);
          if (dbOpt) {
            expectedUnitPrice += Number(dbOpt.price_delta);
          } else {
            logger.warn('modifier option not in map, using client price_delta', { option_id: mod.option_id });
            expectedUnitPrice += Number(mod.price_delta);
          }
        }
      }

      const groups = modGroupsByProduct.get(item.product_id) ?? [];
      for (const grp of groups) {
        if (!grp.is_required) continue;
        const selected = (item.modifiers ?? []).filter((m: any) => m.group_name === grp.name).length;
        if (selected < grp.min_select) {
          return NextResponse.json({ error: `Selecciona al menos ${grp.min_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
        if (grp.max_select > 0 && selected > grp.max_select) {
          return NextResponse.json({ error: `Máximo ${grp.max_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
      }

      // Always assign server-calculated price — never trust the client value
      if (item.unit_price !== 0 && Math.abs(item.unit_price - expectedUnitPrice) > 0.02) {
        logger.warn('Price mismatch (client vs server)', { product: item.product_id, sent: item.unit_price, expected: expectedUnitPrice });
      }
      item.unit_price = expectedUnitPrice;
      item.line_total = expectedUnitPrice * item.qty;
    }

    const { data: orderNum } = await supabase.rpc('generate_order_number', { rest_id: restaurant_id });
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}`;

    const tipAmt = Math.max(0, Number(parsed.data.tip_amount) || 0);
    const serverDeliveryFee = Number(restaurant.delivery_fee) || 0;
    const deliveryFeeAmt = parsed.data.order_type === 'delivery' ? serverDeliveryFee : 0;
    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.line_total, 0);

    let discountAmt = 0;
    if (promo_code) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('discount_type, discount_value, min_order, expires_at, max_uses, current_uses, is_active')
        .eq('restaurant_id', restaurant_id)
        .eq('code', promo_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (promo && !(promo.expires_at && new Date(promo.expires_at) < new Date()) && !(promo.max_uses && promo.current_uses >= promo.max_uses) && !(promo.min_order && subtotal < Number(promo.min_order))) {
        discountAmt = promo.discount_type === 'percentage'
          ? subtotal * (Number(promo.discount_value) / 100)
          : Number(promo.discount_value);
        discountAmt = Math.min(discountAmt, subtotal);
      }
    }

    const total = Math.max(0, subtotal - discountAmt + tipAmt + deliveryFeeAmt);

    const orderInsert: Record<string, any> = {
      restaurant_id,
      order_number: orderNumber,
      customer_name: parsed.data.customer_name,
      customer_email: customer_email || null,
      customer_phone: parsed.data.customer_phone || null,
      notes: parsed.data.notes,
      total,
      status: 'pending',
      order_type: parsed.data.order_type,
      payment_method: parsed.data.payment_method,
      delivery_address: delivery_address || null,
      promo_code: promo_code || '',
      discount_amount: discountAmt,
      idempotency_key: idempotencyKey || null,
    };
    if (tipAmt > 0) orderInsert.tip_amount = tipAmt;
    if (deliveryFeeAmt > 0) orderInsert.delivery_fee = deliveryFeeAmt;

    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { data: insertedItems, error: itemsError } = await adminDb
      .from('order_items')
      .insert(
        parsed.data.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
        }))
      )
      .select('id');

    if (itemsError) {
      logger.error('order_items insert failed', { error: itemsError.message });
      const { error: rollbackErr } = await adminDb.from('orders').delete().eq('id', order.id);
      if (rollbackErr) logger.error('rollback delete failed', { order_id: order.id, error: rollbackErr.message });
      return NextResponse.json({ error: 'Error guardando items' }, { status: 500 });
    }

    const orderedItems = insertedItems ?? [];
    const extrasToInsert: any[] = [];
    const modifiersToInsert: any[] = [];

    parsed.data.items.forEach((item, idx) => {
      const orderItemId = orderedItems[idx]?.id;
      if (!orderItemId) return;

      for (const ex of item.extras) {
        extrasToInsert.push({ order_item_id: orderItemId, extra_id: ex.extra_id, price: ex.price });
      }
      for (const mod of (item.modifiers ?? [])) {
        const gid = mod.group_id ?? '';
        const oid = mod.option_id ?? '';
        modifiersToInsert.push({
          order_item_id: orderItemId,
          group_id: (!gid || gid.startsWith('__legacy')) ? null : gid,
          option_id: (!oid || oid.startsWith('__legacy')) ? null : oid,
          group_name: mod.group_name ?? '',
          option_name: mod.option_name ?? '',
          price_delta: mod.price_delta ?? 0,
        });
      }
    });

    if (extrasToInsert.length > 0 || modifiersToInsert.length > 0) {
      try {
        const insertJobs: Promise<any>[] = [];
        if (extrasToInsert.length > 0) insertJobs.push(Promise.resolve(adminDb.from('order_item_extras').insert(extrasToInsert)));
        if (modifiersToInsert.length > 0) insertJobs.push(Promise.resolve(adminDb.from('order_item_modifiers').insert(modifiersToInsert)));
        const results = await Promise.all(insertJobs);
        for (const r of results) {
          if (r?.error) logger.error('detail insert warning', { order_id: order.id, error: r.error.message, code: r.error.code });
        }
      } catch (detailCatch) {
        logger.error('detail insert exception', { order_id: order.id, error: detailCatch instanceof Error ? detailCatch.message : String(detailCatch) });
      }
    }

    if (promo_code) {
      try {
        await supabase.rpc('increment_promo_usage', { p_code: promo_code.toUpperCase().trim(), p_restaurant_id: restaurant_id });
      } catch (err) {
        logger.error('increment_promo_usage failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Upsert customer record (non-blocking)
    supabase.rpc('upsert_customer_from_order', {
      p_restaurant_id: restaurant_id,
      p_name: parsed.data.customer_name,
      p_email: customer_email || '',
      p_phone: parsed.data.customer_phone || '',
      p_address: delivery_address || '',
      p_order_total: total,
    }).then(({ error: custErr }) => {
      if (custErr) { logger.error('upsert_customer failed', { error: custErr.message }); return; }
      // Remove reactivation_sent tag now that the customer ordered again, so they can
      // receive future reactivation emails if they become inactive again.
      if (customer_email) {
        adminDb
          .from('customers')
          .select('id, tags')
          .eq('restaurant_id', restaurant_id)
          .ilike('email', customer_email)
          .maybeSingle()
          .then(({ data: cust }) => {
            if (cust && (cust.tags ?? []).includes('reactivation_sent')) {
              const newTags = (cust.tags as string[]).filter((t) => t !== 'reactivation_sent');
              adminDb.from('customers').update({ tags: newTags }).eq('id', cust.id);
            }
          });
      }
    });

    // First order "wow" email — fire-and-forget to restaurant owner
    if (restaurant.notification_email) {
      Promise.resolve(
        adminDb
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant_id)
      ).then(({ count }) => {
        if (count === 1 && restaurant.notification_email) {
          const en = restaurant.locale === 'en';
          const dashUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app'}/app`;
          sendEmail({
            to: restaurant.notification_email,
            subject: en
              ? `🎉 ${restaurant.name} just received its first order!`
              : `🎉 ¡${restaurant.name} acaba de recibir su primer pedido!`,
            html: buildFirstOrderWowEmail(restaurant.name, dashUrl, en),
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Send notifications — awaited so Vercel doesn't freeze the process before emails are sent
    try {
      const notifProductIds = parsed.data.items.map((i) => i.product_id);
      const { data: products } = await adminDb
        .from('products')
        .select('id, name')
        .in('id', notifProductIds);

      const productNameMap = new Map((products ?? []).map((p) => [p.id, p.name]));
      const notifItems = parsed.data.items.map((i) => ({
        name: productNameMap.get(i.product_id) ?? 'Producto',
        qty: i.qty,
        price: i.line_total,
      }));

      await notifyNewOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: restaurant_id,
        restaurantData: {
          name: restaurant.name,
          slug: restaurant.slug,
          currency: restaurant.currency,
          locale: restaurant.locale,
          notification_email: restaurant.notification_email,
          notification_whatsapp: restaurant.notification_whatsapp,
          notifications_enabled: restaurant.notifications_enabled,
        },
        customerName: parsed.data.customer_name,
        customerEmail: customer_email || undefined,
        customerPhone: parsed.data.customer_phone || undefined,
        orderType: order_type || 'dine_in',
        total,
        items: notifItems,
      });
    } catch (err) {
      logger.error('notifyNewOrder failed', { error: err instanceof Error ? err.message : String(err) });
    }

    // For online payments via Stripe Checkout: create session immediately.
    // 'wallet' payments (Apple Pay / Google Pay) use a PaymentIntent directly — no Checkout Session needed.
    let stripeUrl: string | null = null;
    if (parsed.data.payment_method === 'online') {
      try {
        const stripe = getStripe();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
        const { data: restStripe } = await adminDb
          .from('restaurants')
          .select('stripe_account_id, stripe_onboarding_complete')
          .eq('id', restaurant_id)
          .maybeSingle();

        const connectedAccount = restStripe?.stripe_onboarding_complete ? restStripe?.stripe_account_id : null;

        const stripeProductIds = parsed.data.items.map((i) => i.product_id);
        const { data: stripeProducts } = await adminDb
          .from('products')
          .select('id, name, variants:product_variants(id, name)')
          .in('id', stripeProductIds);

        const stripeProductMap = new Map((stripeProducts ?? []).map((p) => [p.id, p]));

        const lineItems = parsed.data.items.map((item) => {
          const prod = stripeProductMap.get(item.product_id);
          const prodName = prod?.name ?? 'Item';
          const variantName = item.variant_id
            ? (prod?.variants as { id: string; name: string }[] | undefined)?.find((v) => v.id === item.variant_id)?.name
            : undefined;
          return {
            price_data: {
              currency: (restaurant.currency || 'usd').toLowerCase(),
              product_data: {
                name: [prodName, variantName].filter(Boolean).join(' – ').slice(0, 500),
              },
              unit_amount: Math.round(Number(item.unit_price) * 100),
            },
            quantity: item.qty,
          };
        });

        const sessionParams: any = {
          line_items: lineItems,
          mode: 'payment',
          success_url: `${appUrl}/${restaurant.slug}/orden/${order.order_number}?paid=true`,
          cancel_url: `${appUrl}/${restaurant.slug}/orden/${order.order_number}?paid=false`,
          metadata: { order_id: order.id, order_number: order.order_number },
        };
        if (connectedAccount) {
          sessionParams.payment_intent_data = { transfer_data: { destination: connectedAccount } };
        }
        const session = await stripe.checkout.sessions.create(sessionParams);
        stripeUrl = session.url;
      } catch (stripeErr) {
        logger.error('stripe session creation failed', { order_id: order.id, error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr) });
      }
    }

    return NextResponse.json({
      order_number: order.order_number,
      order_id: order.id,
      slug: restaurant.slug,
      stripe_url: stripeUrl,
    });
  } catch (err) {
    captureError(err, { route: '/api/orders' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildFirstOrderWowEmail(restaurantName: string, dashUrl: string, en = false): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#10b981;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid rgba(16,185,129,0.2);box-shadow:0 0 60px rgba(16,185,129,0.08);">
      <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:40px 32px;text-align:center;">
        <div style="font-size:56px;margin-bottom:12px;">🎉</div>
        <h2 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;line-height:1.2;">
          ${en ? 'Your first order!' : '¡Tu primer pedido!'}
        </h2>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
          ${en ? `${restaurantName} is officially open for business` : `${restaurantName} está oficialmente en marcha`}
        </p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;font-size:16px;color:#f3f4f6;line-height:1.7;font-weight:500;">
          ${en
            ? 'This is a big moment. 🏆 Your first customer just placed an order through your digital menu — the same one you set up on MENIUS.'
            : 'Este es un gran momento. 🏆 Tu primer cliente acaba de hacer un pedido a través de tu menú digital — el mismo que configuraste en MENIUS.'}
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
          ${en
            ? 'Go to your dashboard to see the order and mark it as in preparation. From here, every order adds up.'
            : 'Ve a tu dashboard para ver el pedido y marcarlo en preparación. A partir de aquí, cada pedido suma.'}
        </p>
        <a href="${dashUrl}/orders" style="display:block;padding:16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-align:center;border-radius:14px;font-weight:700;font-size:16px;text-decoration:none;letter-spacing:-0.01em;">
          ${en ? 'See my first order →' : 'Ver mi primer pedido →'}
        </a>
        <div style="margin-top:24px;padding:16px;background:rgba(16,185,129,0.06);border-radius:12px;border:1px solid rgba(16,185,129,0.12);">
          <p style="margin:0;font-size:13px;color:#6ee7b7;line-height:1.6;text-align:center;">
            💡 ${en
              ? 'Tip: enable WhatsApp notifications in Settings so you never miss an order.'
              : 'Tip: activa notificaciones de WhatsApp en Ajustes para no perder ningún pedido.'}
          </p>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#374151;margin-top:20px;">
      MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}
    </p>
  </div>
</body>
</html>`;
}
